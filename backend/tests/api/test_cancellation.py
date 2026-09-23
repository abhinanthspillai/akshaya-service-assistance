from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.request import ServiceRequest
from app.models.assignment import RequestHistory

def test_citizen_cancel_allowed_state(client: TestClient, db_session: Session, normal_user_headers: dict[str, str], normal_user_id: str):
    from uuid import UUID
    req = ServiceRequest(
        id=uuid4(),
        citizen_id=UUID(normal_user_id),
        service_id=uuid4(),
        status="DRAFT",
        service_type_snapshot="A",
        service_name_snapshot="Test",
    )
    db_session.add(req)
    db_session.commit()
    
    r = client.post(f"/api/v1/requests/{req.id}/cancel", headers=normal_user_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "CANCELLED"
    
    history = db_session.query(RequestHistory).filter_by(request_id=req.id).first()
    assert history is not None
    assert history.action == "CANCELLED"

def test_citizen_cancel_not_allowed_state(client: TestClient, db_session: Session, normal_user_headers: dict[str, str], normal_user_id: str):
    from uuid import UUID
    req = ServiceRequest(
        id=uuid4(),
        citizen_id=UUID(normal_user_id),
        service_id=uuid4(),
        status="PROCESSING",
        service_type_snapshot="A",
        service_name_snapshot="Test",
    )
    db_session.add(req)
    db_session.commit()
    
    r = client.post(f"/api/v1/requests/{req.id}/cancel", headers=normal_user_headers)
    assert r.status_code == 400

def test_non_owner_cannot_cancel(client: TestClient, db_session: Session, normal_user_headers: dict[str, str]):
    req = ServiceRequest(
        id=uuid4(),
        citizen_id=uuid4(),
        service_id=uuid4(),
        status="DRAFT",
        service_type_snapshot="A",
        service_name_snapshot="Test",
    )
    db_session.add(req)
    db_session.commit()
    
    r = client.post(f"/api/v1/requests/{req.id}/cancel", headers=normal_user_headers)
    assert r.status_code == 403
