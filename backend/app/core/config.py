from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""

    # JWT
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    # App
    environment: str = "development"
    log_level: str = "debug"

    # Storage
    storage_bucket: str = "forensic_uploads"
    max_file_size_mb: int = 500

    # Forensic Tools (future integration)
    volatility_path: str = "/usr/local/bin/vol"
    wireshark_path: str = "/usr/bin/wireshark"
    autopsy_api_url: str = "http://localhost:9999/api"
    ftk_api_url: str = "http://localhost:8888/api"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
