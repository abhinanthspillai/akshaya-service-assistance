from collections.abc import Generator

from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autoflush=False, autocommit=False, bind=engine)

metadata = MetaData()


class Base(DeclarativeBase):
    metadata = metadata


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
