from typing import Any
from uuid import UUID

from app.models.audit import AuditLog

def log_audit(
    session: Any,
    *,
    actor_id: UUID | None,
    action: str,
    target_resource_type: str,
    target_resource_id: str | UUID | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    # Scrub basic secrets from details if present
    safe_details = None
    if details:
        safe_details = {**details}
        for secret_key in ("password", "password_hash", "token", "secret", "cvv", "card_number"):
            if secret_key in safe_details:
                safe_details[secret_key] = "***"

    audit_log = AuditLog(
        actor_id=actor_id,
        action=action,
        target_resource_type=target_resource_type,
        target_resource_id=str(target_resource_id) if target_resource_id else None,
        details=safe_details,
    )
    session.add(audit_log)
    # Note: caller is responsible for commit() if part of a transactional flow
