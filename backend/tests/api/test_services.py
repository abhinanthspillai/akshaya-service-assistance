from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.service import Service
from app.models.user import User


def get_sysadmin_headers(client: TestClient, db_session: Session) -> dict[str, str]:
    email = "sysadmin3@example.com"
    if not db_session.query(User).filter(User.email == email).first():
        user = User(
            email=email, password_hash=get_password_hash("sysadmin123"), role="system_administrator"
        )
        db_session.add(user)
        db_session.commit()
    r = client.post("/api/v1/auth/login", data={"username": email, "password": "sysadmin123"})
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_service(client: TestClient, db_session: Session) -> None:
    headers = get_sysadmin_headers(client, db_session)
    data = {
        "name": "Test Service 1",
        "code": "SRV001",
        "description": "Test",
        "service_type": "A",
        "base_fee": 100.50,
        "retention_days": 30,
    }
    r = client.post("/api/v1/services/", json=data, headers=headers)
    assert r.status_code == 201
    assert r.json()["code"] == "SRV001"


def test_get_services(client: TestClient, db_session: Session) -> None:
    headers = get_sysadmin_headers(client, db_session)
    service = Service(name="Test Service 2", code="SRV002", service_type="B")
    db_session.add(service)
    db_session.commit()

    r = client.get("/api/v1/services/", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1
