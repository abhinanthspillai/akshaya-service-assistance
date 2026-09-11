from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.user import User


def get_sysadmin_headers(client: TestClient, db_session: Session) -> dict[str, str]:
    email = "sysadmin@example.com"
    if not db_session.query(User).filter(User.email == email).first():
        user = User(
            email=email, password_hash=get_password_hash("sysadmin123"), role="system_administrator"
        )
        db_session.add(user)
        db_session.commit()
    r = client.post("/api/v1/auth/login", data={"username": email, "password": "sysadmin123"})
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_centre(client: TestClient, db_session: Session) -> None:
    headers = get_sysadmin_headers(client, db_session)
    data = {
        "name": "Test Centre 1",
        "code": "TC001",
        "address_text": "123 Test St",
        "district": "Trivandrum",
    }
    r = client.post("/api/v1/centres/", json=data, headers=headers)
    assert r.status_code == 201
    assert r.json()["code"] == "TC001"


def test_create_centre_forbidden_for_citizen(client: TestClient, db_session: Session) -> None:
    email = "citizen1@example.com"
    user = User(email=email, password_hash=get_password_hash("pass1234"), role="citizen")
    db_session.add(user)
    db_session.commit()
    r_login = client.post("/api/v1/auth/login", data={"username": email, "password": "pass1234"})
    token = r_login.json()["access_token"]

    data = {
        "name": "Test Centre 2",
        "code": "TC002",
        "address_text": "123 Test St",
        "district": "Trivandrum",
    }
    r = client.post("/api/v1/centres/", json=data, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_add_centre_service(client: TestClient, db_session: Session) -> None:
    # We need a centre and a service

    from app.core.security import get_password_hash
    from app.models.centre import AkshayaCentre
    from app.models.service import Service
    from app.models.user import User

    sysadmin_email = "sysadmin4@example.com"
    if not db_session.query(User).filter(User.email == sysadmin_email).first():
        sysadmin = User(
            email=sysadmin_email,
            password_hash=get_password_hash("sysadmin123"),
            role="system_administrator",
        )
        db_session.add(sysadmin)
        db_session.commit()

    r = client.post(
        "/api/v1/auth/login", data={"username": sysadmin_email, "password": "sysadmin123"}
    )
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    centre = AkshayaCentre(
        name="Test Centre Srv",
        code="TCS001",
        district="Kollam",
        locality="Kollam",
        address_text="123 Main St, Kollam",
    )
    service = Service(name="Test Service Add", code="TSA001", service_type="A")
    db_session.add(centre)
    db_session.add(service)
    db_session.commit()

    r = client.post(
        f"/api/v1/centres/{centre.id}/services",
        json={"service_id": str(service.id), "is_active": True},
        headers=headers,
    )
    assert r.status_code == 201

    r = client.get(f"/api/v1/centres/{centre.id}/services", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1
