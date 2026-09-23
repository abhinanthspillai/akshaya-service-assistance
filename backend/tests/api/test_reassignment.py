from uuid import uuid4, UUID
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.request import ServiceRequest
from app.models.assignment import RequestAssignment, RequestHistory
from app.models.profile import EmployeeProfile

def test_admin_reassign_request(client: TestClient, db_session: Session, admin_headers: dict[str, str], admin_id: str, normal_user_id: str, test_centre_id: str):
    # Setup accepted request with assignment
    req_id = uuid4()
    req = ServiceRequest(
        id=req_id,
        citizen_id=UUID(normal_user_id),
        service_id=uuid4(),
        selected_centre_id=UUID(test_centre_id),
        status="ACCEPTED",
        service_type_snapshot="A",
        service_name_snapshot="Test",
    )
    db_session.add(req)
    
    old_employee_id = uuid4()
    old_emp = EmployeeProfile(centre_id=UUID(test_centre_id), is_available=True, user_id=old_employee_id, full_name="Old Emp")
    db_session.add(old_emp)

    new_employee_id = uuid4()
    new_emp = EmployeeProfile(centre_id=UUID(test_centre_id), is_available=True, user_id=new_employee_id, full_name="New Emp")
    db_session.add(new_emp)
    
    assignment = RequestAssignment(
        request_id=req_id,
        employee_id=old_employee_id,
        is_active=True,
    )
    db_session.add(assignment)
    db_session.commit()
    
    r = client.post(
        f"/api/v1/requests/{req_id}/reassign", 
        headers=admin_headers,
        json={"employee_id": str(new_employee_id)}
    )
    assert r.status_code == 200
    
    # Check assignment replaced
    old_assignment = db_session.query(RequestAssignment).filter_by(employee_id=old_employee_id).first()
    assert old_assignment.is_active is False
    assert old_assignment.revoked_at is not None
    
    new_assignment = db_session.query(RequestAssignment).filter_by(employee_id=new_employee_id).first()
    assert new_assignment.is_active is True
    
    # Check history
    history = db_session.query(RequestHistory).filter_by(request_id=req_id).first()
    assert history is not None
    assert history.note == f"Reassigned to {new_employee_id}"
    assert history.action == "REASSIGNED"
