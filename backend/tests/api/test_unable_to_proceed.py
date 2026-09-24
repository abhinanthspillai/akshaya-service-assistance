from uuid import uuid4, UUID
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.request import ServiceRequest
from app.models.assignment import RequestAssignment, RequestHistory
from app.models.profile import EmployeeProfile

def test_employee_unable_to_proceed(client: TestClient, db_session: Session, employee_headers: dict[str, str], employee_id: str, normal_user_id: str, test_centre_id: str):
    # Setup accepted request
    req_id = uuid4()
    req = ServiceRequest(
        id=req_id,
        citizen_id=UUID(normal_user_id),
        service_id=uuid4(),
        selected_centre_id=UUID(test_centre_id),
        status="UNDER_REVIEW",
        service_type_snapshot="A",
        service_name_snapshot="Test",
    )
    db_session.add(req)
    
    assignment = RequestAssignment(
        request_id=req_id,
        employee_id=UUID(employee_id),
        is_active=True,
    )
    db_session.add(assignment)
    db_session.commit()
    
    r = client.post(
        f"/api/v1/requests/{req_id}/unable-to-proceed", 
        headers=employee_headers,
        json={"reason": "Missing documents"}
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "UNABLE_TO_PROCEED"
    
    history = db_session.query(RequestHistory).filter_by(request_id=req_id).first()
    assert history is not None
    assert history.action == "unable_to_proceed"
    assert history.note == "Missing documents"

def test_unauthorized_employee_unable_to_proceed(client: TestClient, db_session: Session, employee_headers: dict[str, str], normal_user_id: str, test_centre_id: str):
    req_id = uuid4()
    req = ServiceRequest(
        id=req_id,
        citizen_id=UUID(normal_user_id),
        service_id=uuid4(),
        selected_centre_id=UUID(test_centre_id),
        status="UNDER_REVIEW",
        service_type_snapshot="A",
        service_name_snapshot="Test",
    )
    db_session.add(req)
    # Different employee assigned
    assignment = RequestAssignment(
        request_id=req_id,
        employee_id=uuid4(),
        is_active=True,
    )
    db_session.add(assignment)
    db_session.commit()
    
    r = client.post(
        f"/api/v1/requests/{req_id}/unable-to-proceed", 
        headers=employee_headers,
        json={"reason": "Can't do this"}
    )
    assert r.status_code == 403
