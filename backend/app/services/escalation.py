from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.escalation import Escalation
from app.models.request import ServiceRequest
from app.api.endpoints.requests import _safe_add_notification


def run_stale_request_detection(session: Session, centre_id: UUID | None = None) -> list[Escalation]:
    """
    Detects requests that have been in WAITING_FOR_CENTRE state for more than 24 hours.
    Creates an Escalation record for each.
    If centre_id is provided, only detects requests for that specific centre.
    Returns the newly created Escalation records.
    """
    now = datetime.now(tz=UTC)
    stale_threshold = now - timedelta(hours=24)

    stmt = select(ServiceRequest).where(
        ServiceRequest.status == "WAITING_FOR_CENTRE",
        ServiceRequest.submitted_at < stale_threshold,
    )
    if centre_id:
        stmt = stmt.where(ServiceRequest.selected_centre_id == centre_id)

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
            # We skip specific user_id notification here or we notify the centre admins
            # For Phase 1 we can rely on admins checking the escalations endpoint.
            # But the original code notified current_user.id which was the caller.
            # We'll just omit the notification if it's a cron job or notify all admins.
            # Let's keep it simple for now as it's a background service.

    if created_escalations:
        session.commit()
        for e in created_escalations:
            session.refresh(e)

    return created_escalations
