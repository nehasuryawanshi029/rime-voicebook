import asyncio
import logging
import time
import math
import struct
import io
import aiohttp
from typing import AsyncGenerator, Optional, Dict, Any
from app.config import settings

logger = logging.getLogger("voicebook.services.rime")


class RimeTTSService:
    """
    Dedicated Rime TTS service.
    Direct integration with Rime API (https://users.rime.ai/v1/rime-tts).
    Supports streaming chunk delivery, interruptibility, and configurable models/speakers.
    """
    def __init__(self):
        self.api_key = settings.RIME_API_KEY
        self.model = settings.RIME_MODEL or "mist"
        self.speaker = settings.RIME_SPEAKER or "mist"
        self.language = settings.RIME_LANGUAGE or "en"
        self.base_url = "https://users.rime.ai/v1/rime-tts"
        self.is_connected = bool(self.api_key and self.api_key.strip())
        logger.info(
            f"RimeTTSService initialized (Model: {self.model}, Speaker: {self.speaker}, Connected: {self.is_connected})"
        )

    def is_healthy(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

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
        abort_event: Optional[asyncio.Event] = None
    ) -> AsyncGenerator[bytes, None]:
        """
        Streams audio bytes from Rime API for the given text.
        If abort_event is set or task is cancelled (interruption), immediately terminates.
        """
        if not text or not text.strip():
            return

        logger.info(f"[Gen {generation}] Rime TTS generating audio for: '{text[:60]}...'")

        # If real Rime API key is configured, stream from Rime API
        if self.is_healthy():
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "audio/mp3"
            }
            payload = {
                "text": text,
                "speaker": self.speaker,
                "modelId": self.model,
                "audioFormat": "mp3"
            }

            timeout = aiohttp.ClientTimeout(total=20, connect=5)
            try:
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    async with session.post(self.base_url, json=payload, headers=headers) as resp:
                        if resp.status != 200:
                            err_msg = await resp.text()
                            logger.error(f"[Gen {generation}] Rime API error ({resp.status}): {err_msg}")
                            raise RuntimeError(f"Rime API returned {resp.status}: {err_msg}")

                        while True:
                            if abort_event and abort_event.is_set():
                                logger.info(f"[Gen {generation}] Rime TTS stream aborted due to interruption.")
                                break

                            chunk = await resp.content.read(4096)
                            if not chunk:
                                break
                            yield chunk
            except asyncio.CancelledError:
                logger.info(f"[Gen {generation}] Rime TTS cancelled by asyncio cancellation.")
                raise
            except Exception as e:
                logger.warning(f"[Gen {generation}] Rime API failed ({e}), falling back to low-latency local synthesis.")
                async for chunk in self._fallback_stream(text, generation, abort_event):
                    yield chunk
        else:
            # Fallback when RIME_API_KEY is not configured yet
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
