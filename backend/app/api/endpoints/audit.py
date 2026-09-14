from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogResponse

router = APIRouter()

@router.get("/", response_model=list[AuditLogResponse])
def list_audit_logs(
    session: SessionDep,
    current_user: CurrentUser,
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0),
) -> Any:
    # Only sys admins or centre admins can view logs
    if current_user.role not in {"system_administrator", "centre_administrator"}:
        raise HTTPException(status_code=403, detail="Not authorized to view audit logs")

    stmt = select(AuditLog)

    # Note: A real implementation might filter logs by centre for centre admins.
    # For now, system admins see everything, centre admins see everything or we can restrict.
    # We will let both see all for this phase as per Phase 1 scope or restrict if needed.

    stmt = stmt.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    return session.scalars(stmt).all()
