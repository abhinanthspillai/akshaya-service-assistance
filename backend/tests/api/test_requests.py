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


def get_employee_headers(
    client: TestClient, db_session: Session, centre_id: str, email: str = "emp1@example.com"
) -> dict[str, str]:
    from app.models.user import User
    from app.models.profile import EmployeeProfile
    u = db_session.query(User).filter(User.email == email).first()
    if not u:
        u = User(email=email, password_hash=get_password_hash("password123"), role="centre_employee")
        db_session.add(u)
        db_session.flush()
        import uuid
        emp = EmployeeProfile(user_id=u.id, centre_id=uuid.UUID(centre_id), full_name="Test Emp", is_available=True)
        db_session.add(emp)
        db_session.commit()
    r = client.post("/api/v1/auth/login", data={"username": email, "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def setup_request_waiting_for_centre(client: TestClient, db_session: Session):
    citizen_headers = get_citizen_headers(client, db_session, "citizentest2@example.com")
    service = Service(name="Test Full Svc", code="TFULL02", service_type="A", base_fee=100)
    db_session.add(service)
    centre = AkshayaCentre(name="Test Full Centre", code="TFC002", district="Kollam", locality="Kollam", address_text="Addr")
    db_session.add(centre)
    db_session.commit()
    
    css = CentreSupportedService(centre_id=centre.id, service_id=service.id, is_active=True)
    db_session.add(css)
    db_session.commit()
    
    r = client.post("/api/v1/requests/", json={"service_id": str(service.id)}, headers=citizen_headers)
    req_id = r.json()["id"]
    client.post(f"/api/v1/requests/{req_id}/select-centre", json={"centre_id": str(centre.id)}, headers=citizen_headers)
    client.post(f"/api/v1/requests/{req_id}/submit", headers=citizen_headers)
    return req_id, str(centre.id), citizen_headers


def test_full_request_lifecycle(client: TestClient, db_session: Session) -> None:
    req_id, centre_id, citizen_headers = setup_request_waiting_for_centre(client, db_session)
    employee_headers = get_employee_headers(client, db_session, centre_id)
    
    # 1. Accept
    r = client.post(f"/api/v1/requests/{req_id}/accept", headers=employee_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "ACCEPTED"
    
    # 2. Start Review
    r = client.post(f"/api/v1/requests/{req_id}/start-review", headers=employee_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "UNDER_REVIEW"
    
    # 3. Mark Ready
    r = client.post(f"/api/v1/requests/{req_id}/mark-ready", headers=employee_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "READY_FOR_PROCESSING"
    
    # 4. Start Processing
    r = client.post(f"/api/v1/requests/{req_id}/start-processing", headers=employee_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "PROCESSING"
    
    # 5. Request Payment
    r = client.post(f"/api/v1/requests/{req_id}/request-payment", headers=employee_headers)
    assert r.status_code == 200
    r2 = client.get(f"/api/v1/requests/{req_id}", headers=employee_headers)
    assert r2.json()["status"] == "PAYMENT_PENDING"
    payment_id = r.json()["id"]
    
    # 6. Confirm Payment (by citizen)
    r = client.post(f"/api/v1/requests/{req_id}/payments/{payment_id}/confirm", headers=citizen_headers)
    assert r.status_code == 200
    r2 = client.get(f"/api/v1/requests/{req_id}", headers=citizen_headers)
    assert r2.json()["status"] == "PROCESSING"
    
    # 7. Complete Request
    r = client.post(f"/api/v1/requests/{req_id}/complete", json={"collection_instructions": "Collect from counter"}, headers=employee_headers)
    assert r.status_code == 200
    r2 = client.get(f"/api/v1/requests/{req_id}", headers=citizen_headers)
    assert r2.json()["status"] == "COMPLETED"
    
    # 8. Close Request (by citizen)
    r = client.post(f"/api/v1/requests/{req_id}/close", headers=citizen_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "CLOSED"


def test_unable_to_proceed(client: TestClient, db_session: Session) -> None:
    req_id, centre_id, _ = setup_request_waiting_for_centre(client, db_session)
    employee_headers = get_employee_headers(client, db_session, centre_id, email="emp_unable@example.com")
    
    client.post(f"/api/v1/requests/{req_id}/accept", headers=employee_headers)
    client.post(f"/api/v1/requests/{req_id}/start-review", headers=employee_headers)
    
    r = client.post(f"/api/v1/requests/{req_id}/unable-to-proceed", json={"reason": "Missing info"}, headers=employee_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "UNABLE_TO_PROCEED"


def test_cancel_request(client: TestClient, db_session: Session) -> None:
    req_id, _, citizen_headers = setup_request_waiting_for_centre(client, db_session)
    r = client.post(f"/api/v1/requests/{req_id}/cancel", headers=citizen_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "CANCELLED"


def test_illegal_transition_and_unauthorized_actor(client: TestClient, db_session: Session) -> None:
    req_id, centre_id, citizen_headers = setup_request_waiting_for_centre(client, db_session)
    employee_headers = get_employee_headers(client, db_session, centre_id, email="emp_ill1@example.com")
    wrong_emp_headers = get_employee_headers(client, db_session, centre_id, email="emp_ill2@example.com")
    
    # Illegal transition: start-review before accept
    r = client.post(f"/api/v1/requests/{req_id}/start-review", headers=employee_headers)
    assert r.status_code == 403  # Not authorized since no active assignment
    
    client.post(f"/api/v1/requests/{req_id}/accept", headers=employee_headers)
    
    # Unauthorized actor: wrong employee tries to start review
    r = client.post(f"/api/v1/requests/{req_id}/start-review", headers=wrong_emp_headers)
    assert r.status_code == 403
    
    # Valid start review
    client.post(f"/api/v1/requests/{req_id}/start-review", headers=employee_headers)
    
    # Citizen tries to start processing (requires CurrentUserEmployee)
    r = client.post(f"/api/v1/requests/{req_id}/start-processing", headers=citizen_headers)
    assert r.status_code == 403
    
    # Illegal transition: start processing from UNDER_REVIEW (needs to be READY_FOR_PROCESSING)
    r = client.post(f"/api/v1/requests/{req_id}/start-processing", headers=employee_headers)
    assert r.status_code == 409


def test_delete_draft_request(client: TestClient, db_session: Session) -> None:
    headers = get_citizen_headers(client, db_session, "citizendel1@example.com")
    service = Service(name="Test Del Service", code="TDEL001", service_type="A")
    db_session.add(service)
    db_session.commit()
    
    r = client.post("/api/v1/requests/", json={"service_id": str(service.id)}, headers=headers)
    assert r.status_code == 201
    req_id = r.json()["id"]
    
    r2 = client.delete(f"/api/v1/requests/{req_id}", headers=headers)
    assert r2.status_code == 204
    
    r3 = client.get(f"/api/v1/requests/{req_id}", headers=headers)
    assert r3.status_code == 404


def test_archive_completed_request(client: TestClient, db_session: Session) -> None:
    req_id, centre_id, citizen_headers = setup_request_waiting_for_centre(client, db_session)
    employee_headers = get_employee_headers(client, db_session, centre_id)
    
    # Fast track to COMPLETED
    client.post(f"/api/v1/requests/{req_id}/accept", headers=employee_headers)
    client.post(f"/api/v1/requests/{req_id}/start-review", headers=employee_headers)
    client.post(f"/api/v1/requests/{req_id}/mark-ready", headers=employee_headers)
    client.post(f"/api/v1/requests/{req_id}/start-processing", headers=employee_headers)
    client.post(f"/api/v1/requests/{req_id}/complete", json={"collection_instructions": "Collect"}, headers=employee_headers)
    
    # Archive
    r = client.delete(f"/api/v1/requests/{req_id}", headers=citizen_headers)
    assert r.status_code == 204
    
    # Verify it doesn't show in list
    r2 = client.get("/api/v1/requests/", headers=citizen_headers)
    assert r2.status_code == 200
    assert not any(req["id"] == req_id for req in r2.json())
    
    # But can still be fetched directly
    r3 = client.get(f"/api/v1/requests/{req_id}", headers=citizen_headers)
    assert r3.status_code == 200


def test_archive_cancelled_request(client: TestClient, db_session: Session) -> None:
    req_id, _, citizen_headers = setup_request_waiting_for_centre(client, db_session)
    
    # Cancel the request
    client.post(f"/api/v1/requests/{req_id}/cancel", headers=citizen_headers)
    
    # Archive
    r = client.delete(f"/api/v1/requests/{req_id}", headers=citizen_headers)
    assert r.status_code == 204
    
    # Verify it doesn't show in list
    r2 = client.get("/api/v1/requests/", headers=citizen_headers)
    assert r2.status_code == 200
    assert not any(req["id"] == req_id for req in r2.json())


def test_delete_request_invalid_status(client: TestClient, db_session: Session) -> None:
    req_id, centre_id, citizen_headers = setup_request_waiting_for_centre(client, db_session)
    
    # SUBMITTED/WAITING_FOR_CENTRE status cannot be deleted/archived
    r = client.delete(f"/api/v1/requests/{req_id}", headers=citizen_headers)
    assert r.status_code == 400
