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
    """Registration endpoint strictly rejects any role other than 'citizen' and 'centre_employee'."""
    for forbidden_role in ["system_administrator", "centre_administrator", "admin", "superuser", "root"]:
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

    # 3. Login succeeds
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "Password123!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 4. /auth/me reveals pending status to frontend
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["role"] == "centre_employee"
    assert me_data["approval_status"] == "PENDING_APPROVAL"

    # 5. All employee endpoints return 403
    fake_req_id = uuid4()
    endpoints = [
        ("GET", "/api/v1/requests/", None),
        ("POST", f"/api/v1/requests/{fake_req_id}/accept", {}),
        ("POST", f"/api/v1/requests/{fake_req_id}/start-review", {}),
        ("POST", f"/api/v1/requests/{fake_req_id}/mark-ready", {}),
        ("POST", f"/api/v1/requests/{fake_req_id}/start-processing", {}),
        ("POST", f"/api/v1/requests/{fake_req_id}/unable-to-proceed", {"reason": "Test"}),
        ("POST", f"/api/v1/requests/{fake_req_id}/request-payment", {}),
        ("POST", f"/api/v1/requests/{fake_req_id}/complete", {"collection_instructions": "Collect"}),
        ("POST", f"/api/v1/requests/{fake_req_id}/require-interaction", {"requirement_id": str(uuid4()), "reason": "Meet"}),
        ("POST", f"/api/v1/requests/{fake_req_id}/schedule-interaction", {"interaction_id": str(uuid4()), "scheduled_at": "2026-10-01T10:00:00Z"}),
    ]

    for method, path, body in endpoints:
        if method == "GET":
            resp = client.get(path, headers=headers)
        else:
            resp = client.post(path, headers=headers, json=body)
        assert resp.status_code == 403, f"Expected 403 for {method} {path}, got {resp.status_code}"
        assert "pending approval" in resp.json().get("detail", "").lower()

    # 6. Approve employee
    profile.approval_status = "APPROVED"
    db_session.add(profile)
    db_session.commit()

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
