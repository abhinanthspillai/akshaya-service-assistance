from pytest import MonkeyPatch

from app.core.config import Settings


def test_settings_load_from_environment(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+psycopg://example:example@localhost:5432/example",
    )
    monkeypatch.setenv("JWT_SECRET_KEY", "test-only-placeholder")
    monkeypatch.setenv("JWT_ALGORITHM", "HS512")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:4173")
    monkeypatch.setenv("FILE_STORAGE_PATH", "./tmp/storage")

    settings = Settings()

    assert settings.app_env == "test"
    assert settings.log_level == "DEBUG"
    assert settings.database_url == "postgresql+psycopg://example:example@localhost:5432/example"
    assert settings.jwt_secret_key == "test-only-placeholder"
    assert settings.jwt_algorithm == "HS512"
    assert settings.access_token_expire_minutes == 15
    assert settings.cors_origins == "http://localhost:5173,http://localhost:4173"
    assert settings.file_storage_path == "./tmp/storage"
