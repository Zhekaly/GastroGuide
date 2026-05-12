# Конфигурация приложения.
# Файл загружает переменные окружения из .env
# и предоставляет настройки для базы данных, AI, маршрутов и JWT.

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    gemini_api_key: str
    ors_api_key: str

    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    refresh_token_expire_days: int

    # Cloudflare R2 (необязательные — используются только admin-панелью для загрузки фото)
    r2_account_id: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_bucket: str | None = None
    r2_public_base_url: str | None = None

    # CORS для admin-панели
    admin_cors_origins: str = "http://localhost:3000,http://localhost:3001"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()