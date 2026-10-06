import io
from fastapi.testclient import TestClient
from PIL import Image

def create_test_image(format="JPEG", size=(100, 100)):
    file = io.BytesIO()
    image = Image.new('RGB', size, color='red')
    image.save(file, format)
    file.seek(0)
    return file.read()

def test_upload_photo_valid(client: TestClient) -> None:
    # Register and login
    client.post(
        "/api/v1/auth/register",
        json={"email": "photo@example.com", "password": "securepassword", "full_name": "Test"},
    )
    res = client.post(
        "/api/v1/auth/login", data={"username": "photo@example.com", "password": "securepassword"}
    )
    token = res.json()["access_token"]
    
    img_bytes = create_test_image("PNG")
    response = client.post(
        "/api/v1/users/me/photo",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("test.png", img_bytes, "image/png")}
    )
    assert response.status_code == 200
    assert "photo_url" in response.json()
    assert response.json()["photo_url"].startswith("/api/v1/avatars/")
    
    # Check if photo_url is in current-user response
    me_response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.json()["photo_url"] == response.json()["photo_url"]

def test_upload_photo_invalid_type(client: TestClient) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"email": "photo2@example.com", "password": "securepassword", "full_name": "Test"},
    )
    res = client.post(
        "/api/v1/auth/login", data={"username": "photo2@example.com", "password": "securepassword"}
    )
    token = res.json()["access_token"]
    
    response = client.post(
        "/api/v1/users/me/photo",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("test.txt", b"not an image", "text/plain")}
    )
    assert response.status_code == 415

def test_upload_photo_oversize(client: TestClient) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"email": "photo3@example.com", "password": "securepassword", "full_name": "Test"},
    )
    res = client.post(
        "/api/v1/auth/login", data={"username": "photo3@example.com", "password": "securepassword"}
    )
    token = res.json()["access_token"]
    
    # Mocking large file by creating a payload greater than 2MB
    large_bytes = b"0" * (2 * 1024 * 1024 + 10)
    response = client.post(
        "/api/v1/users/me/photo",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("large.png", large_bytes, "image/png")}
    )
    assert response.status_code == 413

def test_delete_photo(client: TestClient) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"email": "photo4@example.com", "password": "securepassword", "full_name": "Test"},
    )
    res = client.post(
        "/api/v1/auth/login", data={"username": "photo4@example.com", "password": "securepassword"}
    )
    token = res.json()["access_token"]
    
    img_bytes = create_test_image("PNG")
    client.post(
        "/api/v1/users/me/photo",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("test.png", img_bytes, "image/png")}
    )
    
    me_response1 = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response1.json()["photo_url"] is not None
    
    del_res = client.delete(
        "/api/v1/users/me/photo",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert del_res.status_code == 204
    
    me_response2 = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response2.json()["photo_url"] is None
