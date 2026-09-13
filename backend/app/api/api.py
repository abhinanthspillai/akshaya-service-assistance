from fastapi import APIRouter

from app.api.endpoints import auth, centres, notifications, requests, services, staff

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(centres.router, prefix="/centres", tags=["centres"])
api_router.include_router(staff.router, tags=["staff administration"])
api_router.include_router(services.router, prefix="/services", tags=["services"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])

api_router.include_router(requests.router, prefix="/requests", tags=["requests"])
