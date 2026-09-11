from sqlalchemy import text
from sqlalchemy.engine import make_url

from app.core.config import get_settings
from app.core.database import SessionLocal, engine


def test_engine_constructed_from_config():
    settings = get_settings()
    expected_url = make_url(settings.database_url)
    assert engine.url == expected_url


def test_db_connectivity():
    with SessionLocal() as session:
        result = session.execute(text("SELECT 1"))
        assert result.scalar() == 1
