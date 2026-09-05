import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Peblo TV Mini API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = ""

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./peblo_dev.db")

    # Storage
    STORAGE_TYPE: str = os.getenv("STORAGE_TYPE", "local")  # local or r2
    STORAGE_BASE_DIR: str = os.getenv("STORAGE_BASE_DIR", "./storage")
    PUBLIC_BASE_URL: str = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")

    # Cloudflare R2 Credentials (for storage abstraction demo / future deployment)
    R2_ACCOUNT_ID: str = os.getenv("R2_ACCOUNT_ID", "")
    R2_ACCESS_KEY_ID: str = os.getenv("R2_ACCESS_KEY_ID", "")
    R2_SECRET_ACCESS_KEY: str = os.getenv("R2_SECRET_ACCESS_KEY", "")
    R2_BUCKET_NAME: str = os.getenv("R2_BUCKET_NAME", "peblo-tv-catalog")

    # Reference Constants
    SECTIONS: list[str] = ["featured", "series", "minisodes", "songs"]
    CATEGORIES: list[str] = [
        "adventure", "folk", "friendship", "india", "language", "learning",
        "maths", "music", "nature", "reading", "science", "singalong",
        "stories", "travel", "values"
    ]
    LANGUAGES: list[str] = ["en", "hi"]

    class Config:
        case_sensitive = True

settings = Settings()
