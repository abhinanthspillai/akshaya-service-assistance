from uuid import UUID

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


def test_centre_employees_crud(client: TestClient, db_session: Session) -> None:
    headers = get_sysadmin_headers(client, db_session)
    centre = AkshayaCentre(name="TC3", code="TC003", address_text="x", district="Kottayam")
    db_session.add(centre)
    db_session.commit()

    # 1. Onboard employee
    emp_data = {
        "email": "operator1@example.com",
        "password": "securepassword",
        "full_name": "Operator One",
    }
    r_create = client.post(f"/api/v1/centres/{centre.id}/employees", json=emp_data, headers=headers)
    assert r_create.status_code == 201
    emp_user_id = r_create.json()["user"]["id"]

    # 2. Get centre employees
    r_list = client.get(f"/api/v1/centres/{centre.id}/employees", headers=headers)
    assert r_list.status_code == 200
    employees = r_list.json()
    assert len(employees) >= 1
    found = next((e for e in employees if e["email"] == "operator1@example.com"), None)
    assert found is not None
    assert found["full_name"] == "Operator One"
    assert found["is_available"] is True

    # 3. Update employee availability and max capacity
    r_patch = client.patch(
        f"/api/v1/centres/{centre.id}/employees/{emp_user_id}",
        json={"is_available": False, "max_active_requests": 15},
        headers=headers,
    )
    assert r_patch.status_code == 200
    assert r_patch.json()["is_available"] is False
    assert r_patch.json()["max_active_requests"] == 15


def test_employee_capacity_excludes_completed_requests(
    client: TestClient, db_session: Session
) -> None:
    from app.models.assignment import RequestAssignment
    from app.models.request import ServiceRequest
    from app.models.service import Service

    headers = get_sysadmin_headers(client, db_session)
    centre = AkshayaCentre(name="TC Cap", code="TCCAP1", address_text="x", district="Kottayam")
    db_session.add(centre)
    service = Service(name="Cap Svc", code="CAP001", service_type="A")
    db_session.add(service)
    db_session.commit()

    emp_data = {
        "email": "cap_emp@example.com",
        "password": "securepassword",
        "full_name": "Cap Employee",
    }
    r_create = client.post(f"/api/v1/centres/{centre.id}/employees", json=emp_data, headers=headers)
    assert r_create.status_code == 201
    emp_user_id = r_create.json()["user"]["id"]

    # Set capacity to 2
    r_patch = client.patch(
        f"/api/v1/centres/{centre.id}/employees/{emp_user_id}",
        json={"max_active_requests": 2},
        headers=headers,
    )
    assert r_patch.status_code == 200

    # Create 1 active request and 2 completed requests
    req_active = ServiceRequest(
        citizen_id=centre.id,
        service_id=service.id,
        selected_centre_id=centre.id,
        status="UNDER_REVIEW",
        service_type_snapshot="A",
        service_name_snapshot="Cap Svc",
    )
    req_completed1 = ServiceRequest(
        citizen_id=centre.id,
        service_id=service.id,
        selected_centre_id=centre.id,
        status="COMPLETED",
        service_type_snapshot="A",
        service_name_snapshot="Cap Svc",
    )
    req_completed2 = ServiceRequest(
        citizen_id=centre.id,
        service_id=service.id,
        selected_centre_id=centre.id,
        status="COMPLETED",
        service_type_snapshot="A",
        service_name_snapshot="Cap Svc",
    )
    db_session.add_all([req_active, req_completed1, req_completed2])
    db_session.commit()

    # Assign all 3 to employee with is_active=True
    emp_uuid = UUID(emp_user_id)
    a1 = RequestAssignment(request_id=req_active.id, employee_id=emp_uuid, is_active=True)
    a2 = RequestAssignment(request_id=req_completed1.id, employee_id=emp_uuid, is_active=True)
    a3 = RequestAssignment(request_id=req_completed2.id, employee_id=emp_uuid, is_active=True)
    db_session.add_all([a1, a2, a3])
    db_session.commit()

    # Query employees list - active_requests_count should be 1 (not 3)
    r_list = client.get(f"/api/v1/centres/{centre.id}/employees", headers=headers)
    assert r_list.status_code == 200
    emp_item = next(e for e in r_list.json() if e["user_id"] == emp_user_id)
    assert emp_item["active_requests_count"] == 1
