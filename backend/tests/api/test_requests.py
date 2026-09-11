from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.centre import AkshayaCentre
from app.models.service import CentreSupportedService, Service
from app.models.user import User


def get_citizen_headers(
    client: TestClient, db_session: Session, email: str = "citizen1@example.com"
) -> dict[str, str]:
    u = db_session.query(User).filter(User.email == email).first()
    if not u:
        u = User(email=email, password_hash=get_password_hash("password123"), role="citizen")
        db_session.add(u)
        db_session.commit()
    r = client.post("/api/v1/auth/login", data={"username": email, "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_create_request_draft(client: TestClient, db_session: Session) -> None:
    headers = get_citizen_headers(client, db_session)
    service = Service(name="Test Req Service", code="TREQ001", service_type="A")
    db_session.add(service)
    db_session.commit()
    r = client.post("/api/v1/requests/", json={"service_id": str(service.id)}, headers=headers)
    assert r.status_code == 201
    assert r.json()["status"] == "DRAFT"
    assert r.json()["service_name_snapshot"] == "Test Req Service"


def test_select_centre_and_submit(client: TestClient, db_session: Session) -> None:
    headers = get_citizen_headers(client, db_session, "citizen2@example.com")

    service = Service(name="Test Submit Svc", code="TSUB001", service_type="B")
    db_session.add(service)
    centre = AkshayaCentre(
        name="Test Submit Centre",
        code="TSC001",
        district="Kollam",
        locality="Kollam",
        address_text="Test addr",
    )
    db_session.add(centre)
    db_session.commit()

    css = CentreSupportedService(centre_id=centre.id, service_id=service.id, is_active=True)
    db_session.add(css)
    db_session.commit()

    r = client.post("/api/v1/requests/", json={"service_id": str(service.id)}, headers=headers)
    assert r.status_code == 201
    req_id = r.json()["id"]

    r = client.post(
        f"/api/v1/requests/{req_id}/select-centre",
        json={"centre_id": str(centre.id)},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["selected_centre_id"] == str(centre.id)

    r = client.post(f"/api/v1/requests/{req_id}/submit", headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "WAITING_FOR_CENTRE"


def test_submit_without_centre_fails(client: TestClient, db_session: Session) -> None:
    headers = get_citizen_headers(client, db_session, "citizen3@example.com")
    service = Service(name="Test No Centre", code="TNC001", service_type="C")
    db_session.add(service)
    db_session.commit()
    r = client.post("/api/v1/requests/", json={"service_id": str(service.id)}, headers=headers)
    req_id = r.json()["id"]
    r = client.post(f"/api/v1/requests/{req_id}/submit", headers=headers)
    assert r.status_code == 409


def test_cross_citizen_access_blocked(client: TestClient, db_session: Session) -> None:
    h1 = get_citizen_headers(client, db_session, "citizen4@example.com")
    h2 = get_citizen_headers(client, db_session, "citizen5@example.com")
    service = Service(name="Test BOLA", code="TBOLA01", service_type="A")
    db_session.add(service)
    db_session.commit()
    r = client.post("/api/v1/requests/", json={"service_id": str(service.id)}, headers=h1)
    req_id = r.json()["id"]
    # citizen2 tries to access citizen1's request
    r = client.get(f"/api/v1/requests/{req_id}", headers=h2)
    assert r.status_code == 403
