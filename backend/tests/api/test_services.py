from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.centre import AkshayaCentre
from app.models.service import CentreSupportedService, Service
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


def test_get_service_centres(client: TestClient, db_session: Session) -> None:
    headers = get_sysadmin_headers(client, db_session)

    service = Service(
        name="Test Centre Service", code="SRV_CENTRE", service_type="C", is_active=True
    )
    db_session.add(service)
    db_session.commit()

    c1 = AkshayaCentre(
        code="AC001",
        name="C1",
        district="D1",
        locality="LB1",
        is_active=True,
        address_text="Address 1",
    )
    c2 = AkshayaCentre(
        code="AC002",
        name="C2",
        district="D1",
        locality="LB1",
        is_active=True,
        address_text="Address 2",
    )
    c3 = AkshayaCentre(
        code="AC003",
        name="C3",
        district="D1",
        locality="LB1",
        is_active=False,
        address_text="Address 3",
    )

    db_session.add_all([c1, c2, c3])
    db_session.commit()

    s1 = CentreSupportedService(centre_id=c1.id, service_id=service.id, is_active=True)
    s2 = CentreSupportedService(centre_id=c2.id, service_id=service.id, is_active=False)
    s3 = CentreSupportedService(centre_id=c3.id, service_id=service.id, is_active=True)

    db_session.add_all([s1, s2, s3])
    db_session.commit()

    r = client.get(f"/api/v1/services/{service.id}/centres", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["code"] == "AC001"

    service.is_active = False
    db_session.commit()
    r = client.get(f"/api/v1/services/{service.id}/centres", headers=headers)
    assert r.status_code == 404
