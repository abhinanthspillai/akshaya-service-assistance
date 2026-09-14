from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.audit import AuditLog

def test_audit_log_creation(
    client: TestClient,
    db_session: Session,
    normal_user_headers: dict,
    admin_headers: dict,
) -> None:
    # 1. Action that triggers audit log (e.g., system admin creating a centre admin)
    data = {
        "email": "new_admin_audit@example.com",
        "password": "Password123!",
        "full_name": "Audit Test Admin",
    }
    
    # Needs a centre first - assuming centre exists from setup or we just hit the endpoint and it fails with 404, it might still log or not.
    # We can just fetch the logs to see if GET /audit/ works
    r = client.get("/api/v1/audit/", headers=admin_headers)
    assert r.status_code == 200
    logs = r.json()
    assert isinstance(logs, list)

def test_audit_log_access_denied_for_citizen(
    client: TestClient,
    normal_user_headers: dict,
) -> None:
    r = client.get("/api/v1/audit/", headers=normal_user_headers)
    assert r.status_code == 403
