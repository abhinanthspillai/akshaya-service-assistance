from fastapi import APIRouter

from app.api.endpoints import auth, centres, escalations, notifications, requests, services, staff, tickets, audit

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(centres.router, prefix="/centres", tags=["centres"])
api_router.include_router(staff.router, tags=["staff administration"])
api_router.include_router(services.router, prefix="/services", tags=["services"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(requests.router, prefix="/requests", tags=["requests"])
api_router.include_router(escalations.router, prefix="/escalations", tags=["escalations"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["tickets"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
