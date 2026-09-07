import logging
from typing import Optional, Dict, Any
from app.config import settings

logger = logging.getLogger("voicebook.services.deepgram")


class DeepgramSTTService:
    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY
        self.is_connected = bool(self.api_key and self.api_key.strip())
        logger.info(f"DeepgramSTTService initialized (Connected: {self.is_connected})")

    def is_healthy(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    async def transcribe_audio_chunk(self, audio_data: bytes) -> Optional[str]:
        """
        Transcribes incoming audio bytes via Deepgram API if configured.
        """
        if not self.is_healthy():
            return None

        # When API key is active, send to Deepgram REST / stream
        import aiohttp
        url = "https://api.deepgram.com/v1/listen?punctuate=true&model=nova-2&language=en"
        headers = {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": "audio/wav"
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=audio_data, headers=headers) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        transcript = data["results"]["channels"][0]["alternatives"][0]["transcript"]
                        return transcript
        except Exception as e:
            logger.error(f"Deepgram transcription error: {e}")
        return None


deepgram_service = DeepgramSTTService()
