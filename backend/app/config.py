import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


# Resolve path to the project root .env regardless of where uvicorn CWD is
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_env_file_path = os.path.join(_project_root, ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_file_path,
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # LiveKit
    LIVEKIT_URL: str = "wss://mock.livekit.cloud"
    LIVEKIT_API_KEY: str = "devkey"
    LIVEKIT_API_SECRET: str = "secret"

    # Gemini LLM
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.6-flash"

    # Deepgram STT
    DEEPGRAM_API_KEY: Optional[str] = None

    # Rime TTS
    RIME_API_KEY: Optional[str] = None
    RIME_MODEL: str = "mistv3"
    RIME_SPEAKER: str = "marsh"
    RIME_LANGUAGE: str = "en"

    # Voice Agent & Search Simulation
    FLIGHT_SEARCH_DELAY_SECONDS: float = 4.0
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # SQLite Database Path
    DB_PATH: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "voicebook.db")


settings = Settings()
