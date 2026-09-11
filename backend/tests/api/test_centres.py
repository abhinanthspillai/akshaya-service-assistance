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
