from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.assignment import RequestAssignment
from app.models.centre import AkshayaCentre
from app.models.profile import CentreAdministrator, EmployeeProfile
from app.models.request import ServiceRequest
from app.models.service import Service
from app.models.user import User


def _login(client: TestClient, email: str, password: str = "password123") -> dict[str, str]:
    response = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _create_user(db_session: Session, email: str, role: str) -> User:
    user = User(email=email, password_hash=get_password_hash("password123"), role=role)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_assigned_employee_and_admin_request_workspace_access(
    client: TestClient, db_session: Session
) -> None:
    # 1. Setup Centre
    centre = AkshayaCentre(
        id=uuid4(),
        name="Workspace Test Centre",
        code=f"WTC_{uuid4().hex[:6]}",
        district="Kottayam",
        locality="Pala",
        address_text="Pala Main Road",
        is_active=True,
    )
    db_session.add(centre)
    db_session.commit()

    # 2. Setup Users
    cit_user = _create_user(db_session, f"cit_{uuid4().hex[:6]}@akshaya.test", "citizen")
    emp_user = _create_user(db_session, f"emp_{uuid4().hex[:6]}@akshaya.test", "centre_employee")
    emp_other = _create_user(
        db_session, f"other_{uuid4().hex[:6]}@akshaya.test", "centre_employee"
    )
    admin_user = _create_user(
        db_session, f"admin_{uuid4().hex[:6]}@akshaya.test", "centre_administrator"
    )

    # Profiles
    emp_profile = EmployeeProfile(
        user_id=emp_user.id,
        centre_id=centre.id,
        full_name="Assigned Operator",
        approval_status="APPROVED",
    )
    emp_other_profile = EmployeeProfile(
        user_id=emp_other.id,
        centre_id=centre.id,
        full_name="Other Operator",
        approval_status="APPROVED",
    )
    admin_profile = CentreAdministrator(
        user_id=admin_user.id,
        centre_id=centre.id,
        full_name="Centre Manager",
    )
    db_session.add_all([emp_profile, emp_other_profile, admin_profile])
    db_session.commit()

    # Service & Request
    service = Service(
        id=uuid4(),
        name="Workspace Service",
        code=f"WKS_{uuid4().hex[:6]}",
        service_type="A",
        base_fee=0,
        is_active=True,
    )
    db_session.add(service)
    db_session.commit()

    req = ServiceRequest(
        id=uuid4(),
        citizen_id=cit_user.id,
        service_id=service.id,
        selected_centre_id=centre.id,
        status="PROCESSING",
        service_type_snapshot="A",
        service_name_snapshot="Workspace Service",
        fee_snapshot=0,
    )
    db_session.add(req)
    db_session.commit()

    # Unrevoked assignment with is_active = False (simulating assignment reset)
    assignment = RequestAssignment(
        id=uuid4(),
        request_id=req.id,
        employee_id=emp_user.id,
        is_active=False,
        revoked_at=None,
    )
    db_session.add(assignment)
    db_session.commit()

    emp_headers = _login(client, emp_user.email)
    other_headers = _login(client, emp_other.email)
    admin_headers = _login(client, admin_user.email)

    # 3. Assigned employee accesses documents: should auto-reactivate unrevoked assignment
    res_docs = client.get(f"/api/v1/requests/{req.id}/documents", headers=emp_headers)
    assert res_docs.status_code == 200, res_docs.text

    # Verify assignment is now active
    db_session.refresh(assignment)
    assert assignment.is_active is True

    # 4. Other employee at the centre cannot access while another employee is actively assigned
    res_other = client.get(f"/api/v1/requests/{req.id}/documents", headers=other_headers)
    assert res_other.status_code == 403

    # 5. Centre Administrator CAN access documents during PROCESSING
    res_admin_docs = client.get(f"/api/v1/requests/{req.id}/documents", headers=admin_headers)
    assert res_admin_docs.status_code == 200

    # 6. Assigned employee can request OTP
    res_otp_req = client.post(f"/api/v1/requests/{req.id}/otp/request", headers=emp_headers)
    assert res_otp_req.status_code == 200, res_otp_req.text
    otp_data = res_otp_req.json()
    assert otp_data["status"] == "PENDING"

    # 7. Centre Administrator can view OTP state
    res_admin_otp = client.get(f"/api/v1/requests/{req.id}/otp", headers=admin_headers)
    assert res_admin_otp.status_code == 200
    assert res_admin_otp.json()["is_awaiting_otp"] is True

    # 8. Complete request
    res_complete = client.post(
        f"/api/v1/requests/{req.id}/complete",
        headers=emp_headers,
        json={"collection_instructions": "Collect from centre"},
    )
    assert res_complete.status_code == 200, res_complete.text

    # 9. After completion, documents return empty list and 403 if accessed directly
    db_session.refresh(req)
    assert req.status == "COMPLETED"

    res_docs_after = client.get(f"/api/v1/requests/{req.id}/documents", headers=emp_headers)
    assert res_docs_after.status_code == 200
    assert res_docs_after.json() == []
