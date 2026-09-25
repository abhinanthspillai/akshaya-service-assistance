from uuid import UUID, uuid4
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.assignment import RequestAssignment
from app.models.centre import AkshayaCentre
from app.models.profile import EmployeeProfile
from app.models.request import ServiceRequest
from app.models.service import Service


def test_employee_centre_change_revokes_assignment_and_returns_403(
    client: TestClient,
    db_session: Session,
    employee_headers: dict[str, str],
    employee_id: str,
    test_centre_id: str,
    normal_user_id: str,
):
    """When an employee's centre is changed in EmployeeProfile, their existing active

    assignments on requests from the old centre are revoked, and subsequent calls
    return 403 Forbidden.
    """
    # 1. Create a second centre
    new_centre = AkshayaCentre(
        id=uuid4(),
        name="Transferred Centre",
        code=f"TC_{uuid4().hex[:6]}",
        address_text="New Centre Location",
        district="Ernakulam",
        is_active=True,
    )
    db_session.add(new_centre)

    # 2. Create a service and a request assigned to employee at their current centre
    service = Service(
        id=uuid4(),
        name="Revocation Test Service",
        code=f"RTS_{uuid4().hex[:6]}",
        service_type="A",
        base_fee=100,
        is_active=True,
    )
    db_session.add(service)
    db_session.commit()

    req = ServiceRequest(
        id=uuid4(),
        citizen_id=UUID(normal_user_id),
        service_id=service.id,
        selected_centre_id=UUID(test_centre_id),
        status="UNDER_REVIEW",
        service_type_snapshot="A",
        service_name_snapshot="Revocation Test Service",
        fee_snapshot=100,
    )
    db_session.add(req)
    db_session.commit()

    # Active assignment at test_centre
    assignment = RequestAssignment(
        id=uuid4(),
        request_id=req.id,
        employee_id=UUID(employee_id),
        is_active=True,
    )
    db_session.add(assignment)
    db_session.commit()

    # Verify assignment is active before centre change
    db_session.refresh(assignment)
    assert assignment.is_active is True
    assert assignment.revoked_at is None

    # 3. Transfer the employee to the new centre
    emp_profile = db_session.get(EmployeeProfile, UUID(employee_id))
    assert emp_profile is not None
    emp_profile.centre_id = new_centre.id
    db_session.add(emp_profile)
    db_session.commit()

    # 4. Attempt action on the old centre's request
    r = client.post(
        f"/api/v1/requests/{req.id}/mark-ready",
        headers=employee_headers,
        json={},
    )
    assert r.status_code == 403
    assert "Not authorized for this centre" in r.text

    # 5. Verify the assignment was revoked in the DB
    db_session.refresh(assignment)
    assert assignment.is_active is False
    assert assignment.revoked_at is not None

    # 6. Verify subsequent attempts continue returning 403
    r2 = client.post(
        f"/api/v1/requests/{req.id}/start-processing",
        headers=employee_headers,
        json={},
    )
    assert r2.status_code == 403
