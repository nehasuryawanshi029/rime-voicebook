import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # LiveKit
    LIVEKIT_URL: str = "wss://mock.livekit.cloud"
    LIVEKIT_API_KEY: str = "devkey"
    LIVEKIT_API_SECRET: str = "secret"

    # Gemini LLM
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Deepgram STT
    DEEPGRAM_API_KEY: Optional[str] = None

    # Rime TTS
    RIME_API_KEY: Optional[str] = None
    RIME_MODEL: str = "mist"
    RIME_SPEAKER: str = "mist"
    RIME_LANGUAGE: str = "en"

    # Voice Agent & Search Simulation
    FLIGHT_SEARCH_DELAY_SECONDS: float = 4.0
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # SQLite Database Path
    DB_PATH: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "flights.db")


settings = Settings()
