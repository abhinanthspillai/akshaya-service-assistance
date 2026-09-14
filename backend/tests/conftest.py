from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import app.models as _models  # noqa
from app.core.database import Base, get_db
from app.main import app as fastapi_app

SQLALCHEMY_DATABASE_URL = "sqlite:///file:memdb1?mode=memory&cache=shared"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    print("TABLES:", Base.metadata.tables)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        try:
            yield db_session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    yield TestClient(fastapi_app)
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def normal_user_headers(client: TestClient, db_session: Session) -> dict[str, str]:
    client.post(
        "/api/v1/auth/register",
        json={"email": "cit_notif@example.com", "password": "securepassword", "full_name": "Citizen"}
    )
    r = client.post("/api/v1/auth/login", data={"username": "cit_notif@example.com", "password": "securepassword"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}

@pytest.fixture
def normal_user_id(client: TestClient, normal_user_headers: dict[str, str]) -> str:
    r = client.get("/api/v1/auth/me", headers=normal_user_headers)
    return r.json()["id"]

@pytest.fixture
def admin_headers(client: TestClient, db_session: Session) -> dict[str, str]:
    client.post(
        "/api/v1/auth/register",
        json={"email": "admin_notif@example.com", "password": "securepassword", "full_name": "Admin"}
    )
    from app.models.user import User
    user = db_session.query(User).filter_by(email="admin_notif@example.com").first()
    user.role = "system_administrator"
    db_session.commit()
    r = client.post("/api/v1/auth/login", data={"username": "admin_notif@example.com", "password": "securepassword"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}

@pytest.fixture
def admin_id(client: TestClient, admin_headers: dict[str, str]) -> str:
    r = client.get("/api/v1/auth/me", headers=admin_headers)
    return r.json()["id"]

@pytest.fixture
def test_centre_id(db_session: Session) -> str:
    from app.models.centre import AkshayaCentre
    from uuid import uuid4
    c_id = uuid4()
    c = AkshayaCentre(
        id=c_id,
        name="Test Centre",
        code="TC001",
        address_text="Address",
        district="Ernakulam",
        is_active=True
    )
    db_session.add(c)
    db_session.commit()
    return str(c_id)

@pytest.fixture
def employee_headers(client: TestClient, db_session: Session, test_centre_id: str) -> dict[str, str]:
    client.post(
        "/api/v1/auth/register",
        json={"email": "emp1@example.com", "password": "securepassword", "full_name": "Employee"}
    )
    from app.models.user import User
    from app.models.profile import EmployeeProfile
    from uuid import UUID
    user = db_session.query(User).filter_by(email="emp1@example.com").first()
    user.role = "centre_employee"
    
    emp_prof = EmployeeProfile(
        user_id=user.id,
        centre_id=UUID(test_centre_id),
        full_name="Employee",
        max_active_requests=10,
        is_available=True
    )
    db_session.add(emp_prof)
    db_session.commit()
    r = client.post("/api/v1/auth/login", data={"username": "emp1@example.com", "password": "securepassword"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}

@pytest.fixture
def employee_id(client: TestClient, employee_headers: dict[str, str]) -> str:
    r = client.get("/api/v1/auth/me", headers=employee_headers)
    return r.json()["id"]
