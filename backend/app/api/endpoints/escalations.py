from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.models.escalation import Escalation
from app.models.request import ServiceRequest
from app.schemas.escalation import EscalationResponse

router = APIRouter()


@router.get("/", response_model=list[EscalationResponse])
def list_escalations(
    session: SessionDep,
    current_user: CurrentUser,
    is_resolved: bool | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
) -> Any:
    if current_user.role not in {"centre_administrator", "system_administrator"}:
        raise HTTPException(status_code=403, detail="Not authorized")

    stmt = select(Escalation)
    if is_resolved is not None:
        stmt = stmt.where(Escalation.is_resolved == is_resolved)

    if current_user.role == "centre_administrator":
        from app.models.profile import CentreAdministrator

        admin = session.get(CentreAdministrator, current_user.id)
        if not admin:
            raise HTTPException(status_code=403, detail="Admin profile not found")
        stmt = stmt.join(Escalation.request).where(
            ServiceRequest.selected_centre_id == admin.centre_id
        )

    stmt = stmt.order_by(Escalation.created_at.desc()).offset(skip).limit(limit)
    return session.scalars(stmt).all()


@router.post("/detect", response_model=list[EscalationResponse])
def detect_stale_requests(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    if current_user.role not in {"centre_administrator", "system_administrator"}:
        raise HTTPException(status_code=403, detail="Not authorized")

    now = datetime.now(tz=UTC)
    stale_threshold = now - timedelta(hours=24)

    # Find requests that have been WAITING_FOR_CENTRE for more than 24 hours
    stmt = select(ServiceRequest).where(
        ServiceRequest.status == "WAITING_FOR_CENTRE",
        ServiceRequest.submitted_at < stale_threshold,
    )
    if current_user.role == "centre_administrator":
        from app.models.profile import CentreAdministrator

        admin = session.get(CentreAdministrator, current_user.id)
        if not admin:
            raise HTTPException(status_code=403, detail="Admin profile not found")
        stmt = stmt.where(ServiceRequest.selected_centre_id == admin.centre_id)

    stale_requests = session.scalars(stmt).all()
    created_escalations = []

    for req in stale_requests:
        existing = session.scalar(
            select(Escalation).where(
                Escalation.request_id == req.id,
                Escalation.is_resolved.is_(False),
            )
        )
        if not existing:
            escalation = Escalation(
                request_id=req.id,
                reason="Request remained unaccepted for more than 24 hours",
                is_resolved=False,
            )
            session.add(escalation)
            created_escalations.append(escalation)
            
            # Optionally add a notification for admin
            from app.api.endpoints.requests import _safe_add_notification
            _safe_add_notification(
                session,
                user_id=current_user.id,
                request_id=req.id,
                event_type="request_escalated",
                title="Request Escalated",
                body=f"Request {req.id} is stale and has been escalated.",
            )

    if created_escalations:
        session.commit()
        for e in created_escalations:
            session.refresh(e)

    return created_escalations


@router.post("/{escalation_id}/resolve", response_model=EscalationResponse)
def resolve_escalation(
    escalation_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    if current_user.role not in {"centre_administrator", "system_administrator"}:
        raise HTTPException(status_code=403, detail="Not authorized")

    escalation = session.get(Escalation, escalation_id)
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")

    if current_user.role == "centre_administrator":
        from app.models.profile import CentreAdministrator

        admin = session.get(CentreAdministrator, current_user.id)
        if not admin or admin.centre_id != escalation.request.selected_centre_id:
            raise HTTPException(status_code=403, detail="Not authorized")

    if escalation.is_resolved:
        return escalation

    escalation.is_resolved = True
    escalation.resolved_at = datetime.now(tz=UTC)
    session.add(escalation)
    session.commit()
    session.refresh(escalation)
    return escalation
