from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.centre import AkshayaCentre
from app.models.profile import CitizenProfile, EmployeeProfile
from app.models.service import CentreSupportedService, Service
from app.models.user import User


def test_e2e_citizen_to_employee_workflow(client: TestClient, db_session: Session) -> None:
    # 1. Setup seed data
    pwd = get_password_hash("testpass")

    # Citizen
    citizen = User(email="e2ecitizen@example.com", password_hash=pwd, role="citizen")
    db_session.add(citizen)
    db_session.commit()
    cit_prof = CitizenProfile(user_id=citizen.id, full_name="E2E Citizen")
    db_session.add(cit_prof)

    # Centres and Employees
    c1 = AkshayaCentre(
        name="E2E Centre 1", code="E2E001", district="Kollam", locality="Kollam", address_text="C1"
    )
    c2 = AkshayaCentre(
        name="E2E Centre 2", code="E2E002", district="Kollam", locality="Kollam", address_text="C2"
    )
    db_session.add_all([c1, c2])
    db_session.commit()

    emp1 = User(email="e2eemp1@example.com", password_hash=pwd, role="centre_employee")
    emp2 = User(email="e2eemp2@example.com", password_hash=pwd, role="centre_employee")
    db_session.add_all([emp1, emp2])
    db_session.commit()

    ep1 = EmployeeProfile(user_id=emp1.id, centre_id=c1.id, full_name="Emp 1")
    ep2 = EmployeeProfile(user_id=emp2.id, centre_id=c2.id, full_name="Emp 2")
    db_session.add_all([ep1, ep2])

    # Service and support
    svc = Service(name="E2E Service", code="E2ESVC", service_type="A", base_fee=100)
    db_session.add(svc)
    db_session.commit()
    css1 = CentreSupportedService(centre_id=c1.id, service_id=svc.id, is_active=True)
    db_session.add(css1)
    db_session.commit()

    # 2. Citizen Login & Create Request
    r = client.post(
        "/api/v1/auth/login", data={"username": "e2ecitizen@example.com", "password": "testpass"}
    )
    cit_token = r.json()["access_token"]
    cit_headers = {"Authorization": f"Bearer {cit_token}"}

    r = client.post("/api/v1/requests/", json={"service_id": str(svc.id)}, headers=cit_headers)
    assert r.status_code == 201
    req_id = r.json()["id"]
    assert r.json()["status"] == "DRAFT"

    # 3. Citizen selects centre (Centre 1 supports it)
    r = client.post(
        f"/api/v1/requests/{req_id}/select-centre",
        json={"centre_id": str(c1.id)},
        headers=cit_headers,
    )
    assert r.status_code == 200, r.json()

    # 4. Citizen submits
    r = client.post(f"/api/v1/requests/{req_id}/submit", headers=cit_headers)
    assert r.status_code == 200, r.json()
    assert r.json()["status"] == "WAITING_FOR_CENTRE"

    # 5. Security: Emp 2 (from Centre 2) tries to accept -> Fails
    r = client.post(
        "/api/v1/auth/login", data={"username": "e2eemp2@example.com", "password": "testpass"}
    )
    emp2_token = r.json()["access_token"]
    emp2_headers = {"Authorization": f"Bearer {emp2_token}"}

    r = client.post(f"/api/v1/requests/{req_id}/accept", headers=emp2_headers)
    assert r.status_code == 404  # Not found in their centre

    # 6. Emp 1 (from Centre 1) accepts
    r = client.post(
        "/api/v1/auth/login", data={"username": "e2eemp1@example.com", "password": "testpass"}
    )
    emp1_token = r.json()["access_token"]
    emp1_headers = {"Authorization": f"Bearer {emp1_token}"}

    r = client.post(f"/api/v1/requests/{req_id}/accept", headers=emp1_headers)
    assert r.status_code == 200, r.json()
    assert r.json()["status"] == "ACCEPTED"

    # 7. Check history
    r = client.get(f"/api/v1/requests/{req_id}/history", headers=emp1_headers)
    assert r.status_code == 200, r.json()
    history = r.json()
    assert len(history) == 3
    assert history[-1]["action"] == "accept"
    assert history[-1]["to_status"] == "ACCEPTED"
    assert history[-1]["actor_id"] == str(emp1.id)
