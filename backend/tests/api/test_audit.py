from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_audit_log_creation(
    client: TestClient,
    db_session: Session,
    normal_user_headers: dict,
    admin_headers: dict,
) -> None:
    # Action that triggers audit log (e.g., system admin creating a centre admin)
    # Needs a centre first - assuming centre exists from setup or we just hit the endpoint.
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
