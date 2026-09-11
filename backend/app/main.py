from fastapi import FastAPI
from pydantic import BaseModel

from app.api.api import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging


class HealthResponse(BaseModel):
    status: str


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)

    app = FastAPI(title="Akshaya Service Assistance API")

    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    return app


app = create_app()
