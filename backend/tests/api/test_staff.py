from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.centre import AkshayaCentre
from app.models.user import User


def get_sysadmin_headers(client: TestClient, db_session: Session) -> dict[str, str]:
    email = "sysadmin2@example.com"
    if not db_session.query(User).filter(User.email == email).first():
        user = User(
            email=email, password_hash=get_password_hash("sysadmin123"), role="system_administrator"
        )
        db_session.add(user)
        db_session.commit()
    r = client.post("/api/v1/auth/login", data={"username": email, "password": "sysadmin123"})
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_centre_admin(client: TestClient, db_session: Session) -> None:
    headers = get_sysadmin_headers(client, db_session)
    centre = AkshayaCentre(name="TC2", code="TC002", address_text="x", district="Trivandrum")
    db_session.add(centre)
    db_session.commit()

    data = {"email": "admin2@example.com", "password": "securepassword", "full_name": "Admin Two"}
    r = client.post(f"/api/v1/centres/{centre.id}/administrators", json=data, headers=headers)
    assert r.status_code == 201
    assert r.json()["user"]["email"] == "admin2@example.com"
