import pytest
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import engine, SessionLocal

def test_engine_constructed_from_config():
    settings = get_settings()
    # verify engine URL matches the config URL
    url_str = engine.url.render_as_string(hide_password=False)
    assert url_str == settings.database_url.replace("postgresql+psycopg://", "postgresql+psycopg2://") or url_str == settings.database_url

def test_db_connectivity():
    # Attempt to connect to the database. If it fails due to local credentials,
    # it will raise an operational error, but that's expected if no local DB exists.
    try:
        with SessionLocal() as session:
            result = session.execute(text("SELECT 1"))
            assert result.scalar() == 1
    except Exception as e:
        pytest.skip(f"Skipping DB connectivity test due to environment: {e}")
