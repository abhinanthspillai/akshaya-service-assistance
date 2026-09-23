from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.centre import AkshayaCentre
from app.models.service import CentreSupportedService, Service
from app.models.user import User


def get_sysadmin_headers(client: TestClient, db_session: Session) -> dict[str, str]:
    email = "sysadmin3@example.com"
    if not db_session.query(User).filter(User.email == email).first():
        user = User(
            email=email, password_hash=get_password_hash("sysadmin123"), role="system_administrator"
        )
        db_session.add(user)
        db_session.commit()
    r = client.post("/api/v1/auth/login", data={"username": email, "password": "sysadmin123"})
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_service(client: TestClient, db_session: Session) -> None:
    headers = get_sysadmin_headers(client, db_session)
    data = {
        "name": "Test Service 1",
        "code": "SRV001",
        "description": "Test",
        "service_type": "A",
        "base_fee": 100.50,
        "retention_days": 30,
    }
    r = client.post("/api/v1/services/", json=data, headers=headers)
    assert r.status_code == 201
    assert r.json()["code"] == "SRV001"


def test_get_services(client: TestClient, db_session: Session) -> None:
    headers = get_sysadmin_headers(client, db_session)
    service = Service(name="Test Service 2", code="SRV002", service_type="B")
    db_session.add(service)
    db_session.commit()

    r = client.get("/api/v1/services/", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_get_service_centres(client: TestClient, db_session: Session) -> None:
    headers = get_sysadmin_headers(client, db_session)

    service = Service(
        name="Test Centre Service", code="SRV_CENTRE", service_type="C", is_active=True
    )
    db_session.add(service)
    db_session.commit()

    c1 = AkshayaCentre(
        code="AC001",
        name="C1",
        district="D1",
        locality="LB1",
        is_active=True,
        address_text="Address 1",
    )
    c2 = AkshayaCentre(
        code="AC002",
        name="C2",
        district="D1",
        locality="LB1",
        is_active=True,
        address_text="Address 2",
    )
    c3 = AkshayaCentre(
        code="AC003",
        name="C3",
        district="D1",
        locality="LB1",
        is_active=False,
        address_text="Address 3",
    )

    db_session.add_all([c1, c2, c3])
    db_session.commit()

    s1 = CentreSupportedService(centre_id=c1.id, service_id=service.id, is_active=True)
    s2 = CentreSupportedService(centre_id=c2.id, service_id=service.id, is_active=False)
    s3 = CentreSupportedService(centre_id=c3.id, service_id=service.id, is_active=True)

    db_session.add_all([s1, s2, s3])
    db_session.commit()

    r = client.get(f"/api/v1/services/{service.id}/centres", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["code"] == "AC001"

    service.is_active = False
    db_session.commit()
    r = client.get(f"/api/v1/services/{service.id}/centres", headers=headers)
    assert r.status_code == 404


def test_activate_service_without_centre_fails(client: TestClient, db_session: Session) -> None:
    headers = get_sysadmin_headers(client, db_session)
    service = Service(name="Test Activate No Centre", code="TANC001", service_type="A", is_active=False)
    db_session.add(service)
    db_session.commit()

    r = client.patch(f"/api/v1/services/{service.id}", json={"is_active": True}, headers=headers)
    assert r.status_code == 400
    assert "Cannot activate a service without at least one active supporting centre" in r.json()["detail"]


def test_get_service_centres_distance_sorting(client: TestClient, db_session: Session) -> None:
    headers = get_sysadmin_headers(client, db_session)

    service = Service(
        name="Distance Sort Service", code="DIST_SVC", service_type="A", is_active=True
    )
    db_session.add(service)
    db_session.commit()

    # Trivandrum
    c1 = AkshayaCentre(
        code="AC_TVM", name="Trivandrum", district="TVM", locality="Pattom",
        is_active=True, address_text="TVM", latitude=8.5241, longitude=76.9366
    )
    # Kochi
    c2 = AkshayaCentre(
        code="AC_EKM", name="Kochi", district="EKM", locality="Kaloor",
        is_active=True, address_text="EKM", latitude=9.9312, longitude=76.2673
    )
    # Kozhikode
    c3 = AkshayaCentre(
        code="AC_KKD", name="Kozhikode", district="KKD", locality="Mavoor",
        is_active=True, address_text="KKD", latitude=11.2588, longitude=75.7804
    )
    db_session.add_all([c1, c2, c3])
    db_session.commit()

    db_session.add_all([
        CentreSupportedService(centre_id=c1.id, service_id=service.id, is_active=True),
        CentreSupportedService(centre_id=c2.id, service_id=service.id, is_active=True),
        CentreSupportedService(centre_id=c3.id, service_id=service.id, is_active=True),
    ])
    db_session.commit()

    # Query from Kollam (~8.89 lat) - TVM is closest, then Kochi, then KKD
    lat = 8.8932
    lng = 76.6141
    r = client.get(f"/api/v1/services/{service.id}/centres?lat={lat}&lng={lng}", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 3
    
    # TVM should be first
    assert data[0]["code"] == "AC_TVM"
    assert data[0]["distance_km"] is not None
    assert data[0]["distance_km"] < 60  # roughly 55 km
    
    # Kochi should be second
    assert data[1]["code"] == "AC_EKM"
    assert data[1]["distance_km"] > 100
    
    # Kozhikode should be third
    assert data[2]["code"] == "AC_KKD"
    assert data[2]["distance_km"] > 200

