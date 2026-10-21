from uuid import UUID, uuid4
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.centre import AkshayaCentre
from app.models.profile import EmployeeProfile
from app.models.request import ServiceRequest
from app.models.service import Service


@pytest.fixture
def approval_test_centre(db_session: Session) -> AkshayaCentre:
    c = AkshayaCentre(
        id=uuid4(),
        name="Approval Test Centre",
        code=f"ATC_{uuid4().hex[:6]}",
        address_text="Approval Test Address",
        district="Ernakulam",
        is_active=True,
    )
    db_session.add(c)
    db_session.commit()
    return c


def test_role_tampering_rejected_at_registration(client: TestClient):
    """Registration endpoint strictly rejects unauthorized administrative roles like system_administrator."""
    for forbidden_role in ["system_administrator", "admin", "superuser", "root"]:
        r = client.post(
            "/api/v1/auth/register",
            json={
                "email": f"hacker_{forbidden_role}@test.com",
                "password": "Password123!",
                "full_name": "Tamper Test",
                "role": forbidden_role,
            },
        )
        assert r.status_code == 422, f"Expected 422 for role '{forbidden_role}', got {r.status_code}"



def test_employee_registration_validation(client: TestClient, approval_test_centre: AkshayaCentre):
    """Employee registration requires a valid active centre_id."""
    # 1. Missing centre_id
    r1 = client.post(
        "/api/v1/auth/register",
        json={
            "email": "emp_nocentre@test.com",
            "password": "Password123!",
            "full_name": "No Centre Emp",
            "role": "centre_employee",
        },
    )
    assert r1.status_code == 422

    # 2. Non-existent centre_id
    r2 = client.post(
        "/api/v1/auth/register",
        json={
            "email": "emp_badcentre@test.com",
            "password": "Password123!",
            "full_name": "Bad Centre Emp",
            "role": "centre_employee",
            "centre_id": str(uuid4()),
        },
    )
    assert r2.status_code == 404

    # 3. Valid centre_id creates pending employee
    r3 = client.post(
        "/api/v1/auth/register",
        json={
            "email": "emp_valid@test.com",
            "password": "Password123!",
            "full_name": "Valid Emp",
            "role": "centre_employee",
            "centre_id": str(approval_test_centre.id),
        },
    )
    assert r3.status_code == 201
    data = r3.json()
    assert data["role"] == "centre_employee"


def test_pending_employee_gets_403_and_approved_employee_works(
    client: TestClient,
    db_session: Session,
    approval_test_centre: AkshayaCentre,
):
    """Pending employees can log in and view /auth/me, but receive 403 on all employee-only endpoints

    until approved.
    """
    # 1. Register employee
    email = f"pending_emp_{uuid4().hex[:6]}@test.com"
    r = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": "Pending Worker",
            "role": "centre_employee",
            "centre_id": str(approval_test_centre.id),
        },
    )
    assert r.status_code == 201
    user_id = UUID(r.json()["id"])

    # 2. Verify EmployeeProfile in DB has PENDING_APPROVAL
    profile = db_session.get(EmployeeProfile, user_id)
    assert profile is not None
    assert profile.approval_status == "PENDING_APPROVAL"

    # 3. Login attempt for pending employee fails with 403 and awaiting approval message
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "Password123!"},
    )
    assert login_res.status_code == 403
    assert "awaiting approval" in login_res.json()["detail"].lower()

    # 4. Approve employee
    profile.approval_status = "APPROVED"
    db_session.add(profile)
    db_session.commit()

    # 5. Login now succeeds
    login_approved_res = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "Password123!"},
    )
    assert login_approved_res.status_code == 200
    token = login_approved_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 6. /auth/me reveals approved status
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["role"] == "centre_employee"
    assert me_data["approval_status"] == "APPROVED"

    # 7. Employee queue access is now permitted
    resp_after = client.get("/api/v1/requests/", headers=headers)
    assert resp_after.status_code == 200



def test_citizen_registration_and_login_unaffected(client: TestClient):
    """Citizen registration and login flows continue to work as normal."""
    email = f"citizen_unaffected_{uuid4().hex[:6]}@test.com"
    r = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": "Normal Citizen",
            "phone": "9876543210",
            "role": "citizen",
        },
    )
    assert r.status_code == 201
    assert r.json()["role"] == "citizen"

    # Login
    l_res = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "Password123!"},
    )
    assert l_res.status_code == 200
    token = l_res.json()["access_token"]

    # /auth/me
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "citizen"
    assert me_res.json()["full_name"] == "Normal Citizen"


def test_manager_account_flow_and_approval_routing(
    client: TestClient,
    db_session: Session,
):
    from app.core.security import get_password_hash
    from app.models.profile import CentreAdministrator
    from app.models.user import User

    # Create 2 test centres
    centre_a = AkshayaCentre(
        id=uuid4(),
        name="Centre Alpha",
        code=f"CA_{uuid4().hex[:6]}",
        address_text="Address Alpha",
        district="Ernakulam",
        is_active=True,
    )
    centre_b = AkshayaCentre(
        id=uuid4(),
        name="Centre Beta",
        code=f"CB_{uuid4().hex[:6]}",
        address_text="Address Beta",
        district="Ernakulam",
        is_active=True,
    )
    db_session.add_all([centre_a, centre_b])

    # Create System Admin
    sysadmin_user = User(
        id=uuid4(),
        email=f"sysadmin_{uuid4().hex[:6]}@test.com",
        password_hash=get_password_hash("Password123!"),
        role="system_administrator",
        is_active=True,
    )
    # Create an active manager for Centre Alpha
    mgr_a_user = User(
        id=uuid4(),
        email=f"mgr_a_{uuid4().hex[:6]}@test.com",
        password_hash=get_password_hash("Password123!"),
        role="centre_administrator",
        is_active=True,
    )
    db_session.add_all([sysadmin_user, mgr_a_user])
    db_session.flush()

    mgr_a_profile = CentreAdministrator(
        user_id=mgr_a_user.id,
        centre_id=centre_a.id,
        full_name="Manager Alpha",
        approval_status="APPROVED",
    )
    db_session.add(mgr_a_profile)
    db_session.commit()

    # Login tokens
    sysadmin_token = client.post(
        "/api/v1/auth/login",
        data={"username": sysadmin_user.email, "password": "Password123!"},
    ).json()["access_token"]
    sysadmin_headers = {"Authorization": f"Bearer {sysadmin_token}"}

    mgr_a_token = client.post(
        "/api/v1/auth/login",
        data={"username": mgr_a_user.email, "password": "Password123!"},
    ).json()["access_token"]
    mgr_a_headers = {"Authorization": f"Bearer {mgr_a_token}"}

    # 1. Register staff for Centre Alpha
    staff_email = f"staff_a_{uuid4().hex[:6]}@test.com"
    r_staff = client.post(
        "/api/v1/auth/register",
        json={
            "email": staff_email,
            "password": "Password123!",
            "full_name": "Staff Alpha",
            "role": "centre_employee",
            "centre_id": str(centre_a.id),
        },
    )
    assert r_staff.status_code == 201
    staff_user_id = r_staff.json()["id"]

    # 2. Centre Alpha Manager sees this request
    mgr_reqs = client.get("/api/v1/staff/account-requests", headers=mgr_a_headers).json()
    assert any(req["user_id"] == staff_user_id for req in mgr_reqs)

    # 3. System Admin also sees this request
    sys_reqs = client.get("/api/v1/staff/account-requests", headers=sysadmin_headers).json()
    assert any(req["user_id"] == staff_user_id for req in sys_reqs)

    # 4. Register Manager for Centre Alpha (already has active manager) -> blocked with 409
    r_dup_mgr = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"dup_mgr_{uuid4().hex[:6]}@test.com",
            "password": "Password123!",
            "full_name": "Duplicate Mgr",
            "role": "centre_administrator",
            "centre_id": str(centre_a.id),
        },
    )
    assert r_dup_mgr.status_code == 409
    assert "already has an active manager or a pending manager request" in r_dup_mgr.json()["detail"]

    # 5. Register Manager for Centre Beta (no manager yet) -> succeeds with PENDING_APPROVAL
    mgr_b_email = f"mgr_b_{uuid4().hex[:6]}@test.com"
    r_mgr_b = client.post(
        "/api/v1/auth/register",
        json={
            "email": mgr_b_email,
            "password": "Password123!",
            "full_name": "Manager Beta",
            "role": "centre_administrator",
            "centre_id": str(centre_b.id),
        },
    )
    assert r_mgr_b.status_code == 201
    mgr_b_id = r_mgr_b.json()["id"]

    # 6. Centre Alpha Manager DOES NOT see Manager Beta's request
    mgr_reqs_2 = client.get("/api/v1/staff/account-requests", headers=mgr_a_headers).json()
    assert not any(req["user_id"] == mgr_b_id for req in mgr_reqs_2)

    # 7. System Admin DOES see Manager Beta's request
    sys_reqs_2 = client.get("/api/v1/staff/account-requests", headers=sysadmin_headers).json()
    assert any(req["user_id"] == mgr_b_id for req in sys_reqs_2)

    # 8. Centre Alpha Manager CANNOT approve Manager Beta
    rej_mgr_act = client.post(
        f"/api/v1/staff/account-requests/{mgr_b_id}/approve",
        headers=mgr_a_headers,
    )
    assert rej_mgr_act.status_code == 403

    # 9. Manager A approves Staff Alpha
    appr_staff = client.post(
        f"/api/v1/staff/account-requests/{staff_user_id}/approve",
        headers=mgr_a_headers,
    )
    assert appr_staff.status_code == 200

    # Request disappeared from list
    mgr_reqs_3 = client.get("/api/v1/staff/account-requests", headers=mgr_a_headers).json()
    assert not any(req["user_id"] == staff_user_id for req in mgr_reqs_3)

    # Staff can now log in
    staff_login = client.post(
        "/api/v1/auth/login",
        data={"username": staff_email, "password": "Password123!"},
    )
    assert staff_login.status_code == 200

    # 10. System Admin approves Manager Beta
    appr_mgr_b = client.post(
        f"/api/v1/staff/account-requests/{mgr_b_id}/approve",
        headers=sysadmin_headers,
    )
    assert appr_mgr_b.status_code == 200

    # Manager Beta can now log in
    mgr_b_login = client.post(
        "/api/v1/auth/login",
        data={"username": mgr_b_email, "password": "Password123!"},
    )
    assert mgr_b_login.status_code == 200

