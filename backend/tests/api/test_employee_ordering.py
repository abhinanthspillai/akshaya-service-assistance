import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.centre import AkshayaCentre
from app.models.profile import EmployeeProfile
from app.models.request import ServiceRequest
from app.models.service import CentreSupportedService, Service
from app.models.user import User


def test_employee_queue_latest_first_order(client: TestClient, db_session: Session) -> None:
    # 1. Setup Centre
    centre = AkshayaCentre(
        name="Order Test Centre",
        code=f"OTC-{uuid.uuid4().hex[:6]}",
        district="Ernakulam",
        locality="Kochi",
        address_text="Kochi test address",
    )
    db_session.add(centre)

    # 2. Setup Employee
    emp_user = User(
        email=f"emp_order_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=get_password_hash("password123"),
        role="centre_employee",
    )
    db_session.add(emp_user)
    db_session.flush()

    emp_profile = EmployeeProfile(
        user_id=emp_user.id,
        centre_id=centre.id,
        full_name="Queue Order Employee",
        is_available=True,
    )
    db_session.add(emp_profile)

    # 3. Setup Citizen
    citizen = User(
        email=f"citizen_order_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=get_password_hash("password123"),
        role="citizen",
    )
    db_session.add(citizen)

    # 4. Setup Service
    service = Service(
        name="Order Test Service",
        code=f"OTS-{uuid.uuid4().hex[:6]}",
        service_type="A",
        base_fee=50,
    )
    db_session.add(service)
    db_session.flush()

    css = CentreSupportedService(centre_id=centre.id, service_id=service.id, is_active=True)
    db_session.add(css)
    db_session.commit()

    # 5. Create 3 requests with differing submission / creation timestamps
    now = datetime.now(timezone.utc)
    t_old = now - timedelta(hours=3)
    t_mid = now - timedelta(hours=2)
    t_new = now - timedelta(hours=1)

    req_old = ServiceRequest(
        citizen_id=citizen.id,
        service_id=service.id,
        selected_centre_id=centre.id,
        status="WAITING_FOR_CENTRE",
        service_name_snapshot=service.name,
        service_type_snapshot=service.service_type,
        created_at=t_old - timedelta(minutes=5),
        submitted_at=t_old,
    )
    req_mid = ServiceRequest(
        citizen_id=citizen.id,
        service_id=service.id,
        selected_centre_id=centre.id,
        status="WAITING_FOR_CENTRE",
        service_name_snapshot=service.name,
        service_type_snapshot=service.service_type,
        created_at=t_mid - timedelta(minutes=5),
        submitted_at=t_mid,
    )
    req_new = ServiceRequest(
        citizen_id=citizen.id,
        service_id=service.id,
        selected_centre_id=centre.id,
        status="WAITING_FOR_CENTRE",
        service_name_snapshot=service.name,
        service_type_snapshot=service.service_type,
        created_at=t_new - timedelta(minutes=5),
        submitted_at=t_new,
    )
    db_session.add_all([req_old, req_mid, req_new])
    db_session.commit()

    # Login as Employee
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": emp_user.email, "password": "password123"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch requests endpoint
    res = client.get("/api/v1/requests/?limit=50", headers=headers)
    assert res.status_code == 200
    items = res.json()["items"]

    # Filter to our 3 requests
    target_ids = {str(req_old.id), str(req_mid.id), str(req_new.id)}
    returned_target_ids = [item["id"] for item in items if item["id"] in target_ids]

    assert returned_target_ids == [str(req_new.id), str(req_mid.id), str(req_old.id)]
