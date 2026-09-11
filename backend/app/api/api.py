from fastapi import APIRouter

from app.api.endpoints import auth, centres, staff

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(centres.router, prefix="/centres", tags=["centres"])
api_router.include_router(staff.router, tags=["staff administration"])
