from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_register(client: TestClient, db_session: Session) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "citizen@example.com",
            "password": "securepassword",
            "full_name": "Test Citizen",
            "phone": "1234567890",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "citizen@example.com"
    assert data["role"] == "citizen"


def test_register_duplicate_email(client: TestClient, db_session: Session) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"email": "dup@example.com", "password": "securepassword", "full_name": "Test"},
    )
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "dup@example.com", "password": "securepassword", "full_name": "Test 2"},
    )
    assert response.status_code == 409


def test_login_and_me(client: TestClient, db_session: Session) -> None:
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "login@example.com",
            "password": "securepassword",
            "full_name": "Login User",
        },
    )

    response = client.post(
        "/api/v1/auth/login", data={"username": "login@example.com", "password": "securepassword"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]

    me_response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["email"] == "login@example.com"
    assert me_data["full_name"] == "Login User"
