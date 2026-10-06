from fastapi import FastAPI
from pydantic import BaseModel

from app.api.api import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from fastapi.staticfiles import StaticFiles
from pathlib import Path


class HealthResponse(BaseModel):
    status: str


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)

    app = FastAPI(title="Akshaya Service Assistance API")

    app.include_router(api_router, prefix="/api/v1")

    # Serve avatars as static files
    settings = get_settings()
    avatars_dir = Path(settings.file_storage_path) / "avatars"
    avatars_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/api/v1/avatars", StaticFiles(directory=str(avatars_dir)), name="avatars")

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    return app


app = create_app()
