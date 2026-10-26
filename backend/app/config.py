import logging
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent

logger = logging.getLogger("app")

INSECURE_DEV_KEY = "insecure-dev-key-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(ROOT_DIR / ".env"), str(BASE_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = Field(default="development", alias="ENVIRONMENT")
    secret_key: str = Field(default="", alias="SECRET_KEY")
    admin_username: str = Field(default="admin", alias="ADMIN_USERNAME")
    admin_password: str = Field(default="", alias="ADMIN_PASSWORD")
    admin_password_hash: str = Field(default="", alias="ADMIN_PASSWORD_HASH")
    database_url: str = Field(default="sqlite:///./data/app.db", alias="DATABASE_URL")
    uploads_dir: str = Field(default="uploads", alias="UPLOADS_DIR")
    cookie_secure: bool = Field(default=False, alias="COOKIE_SECURE")
    # Доп. разрешённые Origin для изменяющих запросов админки (через запятую).
    allowed_origins: str = Field(default="", alias="ALLOWED_ORIGINS")
    # Доверять X-Forwarded-For (только за своим reverse proxy).
    trust_proxy: bool = Field(default=False, alias="TRUST_PROXY")
    max_upload_bytes: int = Field(default=8 * 1024 * 1024, alias="MAX_UPLOAD_BYTES")
    session_hours: int = 12
    login_max_failures: int = 5
    login_window_seconds: int = 600
    login_block_seconds: int = 600

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in ("production", "prod")

    @property
    def origins_list(self) -> List[str]:
        return [o.strip().rstrip("/") for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def uploads_path(self) -> Path:
        p = Path(self.uploads_dir)
        return p if p.is_absolute() else (BASE_DIR / p)

    @property
    def resolved_database_url(self) -> str:
        prefix = "sqlite:///"
        url = self.database_url
        if url.startswith(prefix) and not url.startswith("sqlite:////") and ":memory:" not in url:
            rel = Path(url[len(prefix):])
            return prefix + str(BASE_DIR / rel)
        return url

    def validate_startup(self) -> "Settings":
        if not self.secret_key:
            if self.is_production:
                raise RuntimeError("SECRET_KEY обязателен в production")
            logger.warning("SECRET_KEY не задан: используется НЕБЕЗОПАСНЫЙ ключ для разработки")
            self.secret_key = INSECURE_DEV_KEY
        if self.is_production and not (self.admin_password or self.admin_password_hash):
            raise RuntimeError("Задайте ADMIN_PASSWORD или ADMIN_PASSWORD_HASH в production")
        if self.is_production and not self.cookie_secure:
            logger.warning("COOKIE_SECURE=false в production: cookie сессии без флага Secure")
        return self


def get_settings() -> Settings:
    return Settings().validate_startup()


__all__ = ["Settings", "get_settings", "BASE_DIR"]
