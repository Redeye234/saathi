from functools import lru_cache

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str = "sqlite+aiosqlite:///./saathi.db"
    frontend_origins: str = "http://localhost:5173,http://localhost:3000"
    cookie_name: str = "saathi_session"
    cookie_secure: bool | None = None
    cookie_samesite: str = "lax"
    cookie_domain: str | None = None
    session_days: int = Field(default=14, ge=1, le=90)
    openai_api_key: str = ""
    openai_model: str = "gpt-5-mini"
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""

    @field_validator("cookie_samesite")
    @classmethod
    def valid_samesite(cls, value: str) -> str:
        value = value.lower()
        if value not in {"lax", "strict", "none"}:
            raise ValueError("COOKIE_SAMESITE must be lax, strict or none")
        return value

    @model_validator(mode="after")
    def secure_cross_site_cookie(self):
        if self.cookie_samesite == "none" and not self.secure_cookie:
            raise ValueError("SameSite=None cookies require COOKIE_SECURE=true")
        if not self.origins:
            raise ValueError("Set at least one exact FRONTEND_ORIGINS value")
        if self.environment.lower() == "production":
            if not self.secure_cookie or any(not origin.startswith("https://") for origin in self.origins):
                raise ValueError("Production requires secure cookies and HTTPS FRONTEND_ORIGINS")
            if not self.database_url.startswith(("postgres://", "postgresql://", "postgresql+asyncpg://")):
                raise ValueError("Production requires a managed PostgreSQL DATABASE_URL")
        return self

    @property
    def origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.frontend_origins.split(",") if origin.strip()]

    @property
    def secure_cookie(self) -> bool:
        if self.cookie_secure is not None:
            return self.cookie_secure
        return self.environment.lower() not in {"development", "test"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
