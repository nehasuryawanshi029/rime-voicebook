import asyncio
import logging
import time
import math
import struct
import io
import aiohttp
from contextvars import ContextVar
from typing import AsyncGenerator, Optional, Dict, Any
from app.config import settings

logger = logging.getLogger("voicebook.services.rime")

# Per-task status prevents one session's fallback from being reported as another
# session's successful Rime stream (or vice versa).
_call_used_fallback: ContextVar[bool] = ContextVar("rime_call_used_fallback", default=False)

# Language → Rime TTS configuration mapping
# Hindi uses Coda model with taru speaker; English uses configured model
LANGUAGE_TTS_CONFIG = {
    "en": {
        "model": settings.RIME_MODEL or "mistv3",
        "speaker": settings.RIME_SPEAKER or "marsh",
        "lang": "en",
        "supported": True,
    },
    "hi": {
        "model": "coda",
        "speaker": "taru",
        "lang": "hi",
        "supported": True,
    },
    "mr": {
        # Marathi is NOT supported by Rime — handled by browser TTS fallback
        "model": None,
        "speaker": None,
        "lang": "mr",
        "supported": False,
    },
}


class RimeTTSService:
    """
    Dedicated Rime TTS service.
    Direct integration with Rime API (https://users.rime.ai/v1/rime-tts).
    Supports streaming chunk delivery, interruptibility, and configurable models/speakers.
    Supports multilingual TTS: English (mistv3/coda), Hindi (coda), Marathi (browser fallback).

    Uses a persistent aiohttp.ClientSession with TCP connection pooling and keep-alive
    to avoid the overhead of a new TCP+TLS handshake per request (which caused intermittent
    connection timeouts and silent fallback).
    """
    def __init__(self):
        self.api_key = settings.RIME_API_KEY
        self.model = settings.RIME_MODEL or "mistv3"
        self.speaker = settings.RIME_SPEAKER or "marsh"
        self.language = settings.RIME_LANGUAGE or "en"
        self.base_url = "https://users.rime.ai/v1/rime-tts"
        self._has_api_key = bool(self.api_key and self.api_key.strip() and len(self.api_key.strip()) > 5)
        # Tracks whether the last Rime API call succeeded (True) or fell back (False)
        self._last_api_ok: bool = True
        # Persistent session for connection reuse (created lazily)
        self._session: Optional[aiohttp.ClientSession] = None
        # Maximum retry attempts on transient connection errors
        self._max_retries: int = 1
        logger.info(
            f"RimeTTSService initialized (Model: {self.model}, Speaker: {self.speaker}, API Key configured: {self._has_api_key})"
        )

    async def _get_session(self) -> aiohttp.ClientSession:
        """
        Returns a persistent aiohttp.ClientSession. Creates one on first call.
        Reuses TCP connections via keep-alive to avoid per-request TLS handshake overhead.
        """
        # aiohttp sessions are bound to an event loop. Test workers/reloads can
        # leave a session attached to a closed loop; never reuse it.
        session_loop = getattr(self._session, "_loop", None) if self._session else None
        if self._session is None or self._session.closed or (session_loop and session_loop.is_closed()):
            self._session = None
            connector = aiohttp.TCPConnector(
                limit=5,              # Max simultaneous connections
                keepalive_timeout=60, # Keep idle connections for 60s
                enable_cleanup_closed=True,
            )
            timeout = aiohttp.ClientTimeout(total=25, connect=8, sock_read=15)
            self._session = aiohttp.ClientSession(
                connector=connector,
                timeout=timeout,
            )
        return self._session

    async def close(self):
        """Close the persistent HTTP session. Call on shutdown."""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

    def is_healthy(self) -> bool:
        """Check if Rime TTS is configured with a valid API key and last call didn't fall back."""
        return self._has_api_key and self._last_api_ok

    @property
    def last_call_used_fallback(self) -> bool:
        """Fallback status for the current async TTS call, never global state."""
        return _call_used_fallback.get()

    def is_language_supported(self, language: str) -> bool:
        """Check if the given language is supported by Rime TTS."""
        config = LANGUAGE_TTS_CONFIG.get(language, LANGUAGE_TTS_CONFIG["en"])
        return config["supported"]

    def _get_tts_config(self, language: str) -> Dict[str, Any]:
        """Get the TTS configuration for the given language."""
        return LANGUAGE_TTS_CONFIG.get(language, LANGUAGE_TTS_CONFIG["en"])

    def _generate_synthetic_pcm_chunk(self, duration_s: float = 0.2, freq: float = 440.0, sample_rate: int = 24000) -> bytes:
        """
        Generate lightweight synthetic PCM audio for testing and fallback when API key is missing.
        """
        num_samples = int(duration_s * sample_rate)
        buf = io.BytesIO()
        for i in range(num_samples):
            # Gentle bell envelope to prevent audio clicking
            envelope = math.sin(math.pi * i / num_samples)
            sample = int(32767.0 * 0.25 * envelope * math.sin(2.0 * math.pi * freq * (i / sample_rate)))
            buf.write(struct.pack('<h', sample))
        return buf.getvalue()

    async def stream_speech(
        self,
        text: str,
        generation: int,
        abort_event: Optional[asyncio.Event] = None,
        language: str = "en"
    ) -> AsyncGenerator[bytes, None]:
        """
        Streams audio bytes from Rime API for the given text.
        If abort_event is set or task is cancelled (interruption), immediately terminates.
        Language parameter determines model, speaker, and lang for the Rime API call.
        For unsupported languages (e.g. Marathi), yields nothing — caller handles browser TTS.
        """
        if not text or not text.strip():
            return

        # Check if language is supported by Rime
        tts_config = self._get_tts_config(language)
        if not tts_config["supported"]:
            logger.info(f"[Gen {generation}] Language '{language}' not supported by Rime TTS. Skipping — browser TTS will handle.")
            return

        effective_model = tts_config["model"]
        effective_speaker = tts_config["speaker"]
        effective_lang = tts_config["lang"]

        logger.info(f"[Gen {generation}] Rime TTS generating audio for: '{text[:60]}...' (lang={effective_lang}, model={effective_model}, speaker={effective_speaker})")

        # Reset status in this task's context. Concurrent sessions cannot mutate it.
        _call_used_fallback.set(False)

        # If real Rime API key is configured, stream from Rime API
        if self._has_api_key:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "text": text,
                "speaker": effective_speaker,
                "modelId": effective_model,
                "lang": effective_lang,
                "audioFormat": "pcm",
                "samplingRate": 24000
            }

            last_error = None
            for attempt in range(1 + self._max_retries):
                try:
                    session = await self._get_session()
                    async with session.post(self.base_url, json=payload, headers=headers) as resp:
                        if resp.status != 200:
                            err_msg = await resp.text()
                            logger.error(f"[Gen {generation}] Rime API error ({resp.status}): {err_msg}")
                            raise RuntimeError(f"Rime API returned {resp.status}: {err_msg}")

                        self._last_api_ok = True
                        leftover = b""
                        while True:
                            if abort_event and abort_event.is_set():
                                logger.info(f"[Gen {generation}] Rime TTS stream aborted due to interruption.")
                                break

                            chunk = await resp.content.read(4096)
                            if not chunk:
                                if leftover:
                                    yield leftover  # flush final trailing byte
                                break
                            # Prepend any leftover byte from previous iteration
                            chunk = leftover + chunk
                            leftover = b""
                            # Ensure even byte count (16-bit PCM sample alignment)
                            if len(chunk) % 2 != 0:
                                leftover = chunk[-1:]
                                chunk = chunk[:-1]
                            if chunk:
                                yield chunk
                    # If we successfully streamed, break out of retry loop
                    last_error = None
                    break

                except asyncio.CancelledError:
                    logger.info(f"[Gen {generation}] Rime TTS cancelled by asyncio cancellation.")
                    raise
                except (asyncio.TimeoutError, aiohttp.ClientError) as e:
                    last_error = e
                    if attempt < self._max_retries:
                        logger.warning(f"[Gen {generation}] Rime API attempt {attempt+1} failed ({type(e).__name__}: {e}). Retrying with fresh connection...")
                        # Force a fresh session on retry (stale keep-alive may have caused the timeout)
                        await self.close()
                        await asyncio.sleep(0.2)
                    else:
                        logger.warning(f"[Gen {generation}] Rime API failed after {attempt+1} attempts for lang={effective_lang}, model={effective_model}, speaker={effective_speaker}: {e}. Falling back to local synthesis.")
                except Exception as e:
                    last_error = e
                    logger.warning(f"[Gen {generation}] Rime API failed for lang={effective_lang}, model={effective_model}, speaker={effective_speaker}: {e}. Falling back to local synthesis.")
                    break  # Non-retryable error

            # If all attempts failed, fall back
            if last_error is not None:
                self._last_api_ok = False
                _call_used_fallback.set(True)
                async for chunk in self._fallback_stream(text, generation, abort_event):
                    yield chunk
        else:
            # Fallback when RIME_API_KEY is not configured yet
            _call_used_fallback.set(True)
            async for chunk in self._fallback_stream(text, generation, abort_event):
                yield chunk

    async def _fallback_stream(
        self,
        text: str,
        generation: int,
        abort_event: Optional[asyncio.Event] = None
    ) -> AsyncGenerator[bytes, None]:
        """
        Local audio generator that simulates real-time chunk streaming.
        """
        word_count = max(1, len(text.split()))
        chunks_count = min(15, max(3, word_count // 2))
        
        for i in range(chunks_count):
            if abort_event and abort_event.is_set():
                logger.info(f"[Gen {generation}] Fallback TTS stream aborted by interruption.")
                break
            
            # 120ms chunk of audio
            chunk = self._generate_synthetic_pcm_chunk(duration_s=0.12, freq=380.0 + (i * 20 % 200))
            yield chunk
            # Realistic chunk spacing (80ms)
            await asyncio.sleep(0.08)


rime_service = RimeTTSService()
