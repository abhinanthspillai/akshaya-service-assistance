from pathlib import Path
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.models.centre import AkshayaCentre
from app.models.profile import EmployeeProfile
from app.models.service import (
    CentreSupportedService,
    Service,
    ServiceDocumentRequirement,
    ServiceRequirementAllowedFileType,
)
from app.models.user import User


def _login(client: TestClient, email: str, password: str = "password123") -> dict[str, str]:
    response = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _create_user(db_session: Session, email: str, role: str) -> User:
    user = User(email=email, password_hash=get_password_hash("password123"), role=role)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _document_fixture(
    client: TestClient, db_session: Session, tmp_path: Path
) -> tuple[dict[str, str], dict[str, str], UUID, UUID]:
    settings = get_settings()
    settings.file_storage_path = str(tmp_path / "private-storage")

    citizen = _create_user(db_session, "doccitizen@example.com", "citizen")
    employee = _create_user(db_session, "docemployee@example.com", "centre_employee")
    centre = AkshayaCentre(
        name="Document Centre",
        code="DOC001",
        district="Kollam",
        locality="Kollam",
        address_text="Document test address",
    )
    db_session.add(centre)
    db_session.commit()
    employee_profile = EmployeeProfile(
        user_id=employee.id,
        centre_id=centre.id,
        full_name="Document Employee",
    )
    db_session.add(employee_profile)

    service = Service(name="Document Service", code="DOCSVC", service_type="A")
    db_session.add(service)
    db_session.commit()
    requirement = ServiceDocumentRequirement(
        service_id=service.id,
        name="Proof of identity",
        is_required=True,
        max_file_size_bytes=32,
        sort_order=1,
    )
    db_session.add(requirement)
    db_session.commit()
    db_session.add(
        ServiceRequirementAllowedFileType(
            requirement_id=requirement.id,
            mime_type="application/pdf",
        )
    )
    db_session.add(CentreSupportedService(centre_id=centre.id, service_id=service.id))
    db_session.commit()

    citizen_headers = _login(client, citizen.email)
    employee_headers = _login(client, employee.email)
    response = client.post(
        "/api/v1/requests/",
        json={"service_id": str(service.id)},
        headers=citizen_headers,
    )
    request_id = UUID(response.json()["id"])
    client.post(
        f"/api/v1/requests/{request_id}/select-centre",
        json={"centre_id": str(centre.id)},
        headers=citizen_headers,
    )
    return citizen_headers, employee_headers, request_id, requirement.id


def test_citizen_uploads_request_document_without_storage_path_leak(
    client: TestClient, db_session: Session, tmp_path: Path
) -> None:
    citizen_headers, _employee_headers, request_id, requirement_id = _document_fixture(
        client, db_session, tmp_path
    )

    response = client.post(
        f"/api/v1/requests/{request_id}/documents",
        data={"requirement_id": str(requirement_id)},
        files={"file": ("identity.pdf", b"%PDF-1.4 document", "application/pdf")},
        headers=citizen_headers,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["original_filename"] == "identity.pdf"
    assert body["content_type"] == "application/pdf"
    assert body["version"] == 1
    assert body["is_current"] is True
    assert "storage_key" not in body


def test_upload_rejects_invalid_type_and_size(
    client: TestClient, db_session: Session, tmp_path: Path
) -> None:
    citizen_headers, _employee_headers, request_id, requirement_id = _document_fixture(
        client, db_session, tmp_path
    )

    invalid_type = client.post(
        f"/api/v1/requests/{request_id}/documents",
        data={"requirement_id": str(requirement_id)},
        files={"file": ("identity.txt", b"hello", "text/plain")},
        headers=citizen_headers,
    )
    assert invalid_type.status_code == 422

    too_large = client.post(
        f"/api/v1/requests/{request_id}/documents",
        data={"requirement_id": str(requirement_id)},
        files={"file": ("identity.pdf", b"x" * 33, "application/pdf")},
        headers=citizen_headers,
    )
    assert too_large.status_code == 413


def test_reupload_preserves_prior_document_version(
    client: TestClient, db_session: Session, tmp_path: Path
) -> None:
    citizen_headers, _employee_headers, request_id, requirement_id = _document_fixture(
        client, db_session, tmp_path
    )

    for filename in ["identity.pdf", "identity-fixed.pdf"]:
        response = client.post(
            f"/api/v1/requests/{request_id}/documents",
            data={"requirement_id": str(requirement_id)},
            files={"file": (filename, b"%PDF-1.4 document", "application/pdf")},
            headers=citizen_headers,
        )
        assert response.status_code == 201

    response = client.get(f"/api/v1/requests/{request_id}/documents", headers=citizen_headers)
    assert response.status_code == 200
    versions = response.json()
    assert [doc["version"] for doc in versions] == [1, 2]
    assert versions[0]["is_current"] is False
    assert versions[0]["replaced_at"] is not None
    assert versions[1]["is_current"] is True


def test_cross_citizen_document_access_is_blocked(
    client: TestClient, db_session: Session, tmp_path: Path
) -> None:
    _citizen_headers, _employee_headers, request_id, _requirement_id = _document_fixture(
        client, db_session, tmp_path
    )
    other = _create_user(db_session, "otherdoccitizen@example.com", "citizen")
    other_headers = _login(client, other.email)

    response = client.get(f"/api/v1/requests/{request_id}/documents", headers=other_headers)

    assert response.status_code == 403


def test_employee_document_access_requires_active_assignment(
    client: TestClient, db_session: Session, tmp_path: Path
) -> None:
    citizen_headers, employee_headers, request_id, requirement_id = _document_fixture(
        client, db_session, tmp_path
    )
    upload = client.post(
        f"/api/v1/requests/{request_id}/documents",
        data={"requirement_id": str(requirement_id)},
        files={"file": ("identity.pdf", b"%PDF-1.4 document", "application/pdf")},
        headers=citizen_headers,
    )
    document_id = upload.json()["id"]

    before_accept = client.get(f"/api/v1/requests/{request_id}/documents", headers=employee_headers)
    assert before_accept.status_code == 403

    submit = client.post(f"/api/v1/requests/{request_id}/submit", headers=citizen_headers)
    assert submit.status_code == 200
    accept = client.post(f"/api/v1/requests/{request_id}/accept", headers=employee_headers)
    assert accept.status_code == 200

    after_accept = client.get(f"/api/v1/requests/{request_id}/documents", headers=employee_headers)
    assert after_accept.status_code == 200

    download = client.get(
        f"/api/v1/requests/{request_id}/documents/{document_id}/download",
        headers=employee_headers,
    )
    assert download.status_code == 200
    assert download.content == b"%PDF-1.4 document"


def test_pre_validation_blocks_submission_until_required_document_uploaded(
    client: TestClient, db_session: Session, tmp_path: Path
) -> None:
    citizen_headers, _employee_headers, request_id, requirement_id = _document_fixture(
        client, db_session, tmp_path
    )

    missing = client.post(f"/api/v1/requests/{request_id}/pre-validate", headers=citizen_headers)
    assert missing.status_code == 200
    missing_body = missing.json()
    assert missing_body["is_valid"] is False
    assert missing_body["items"][0]["status"] == "FAIL"
    assert "authentic" not in str(missing_body).lower()

    blocked_submit = client.post(f"/api/v1/requests/{request_id}/submit", headers=citizen_headers)
    assert blocked_submit.status_code == 409

    upload = client.post(
        f"/api/v1/requests/{request_id}/documents",
        data={"requirement_id": str(requirement_id)},
        files={"file": ("identity.pdf", b"%PDF-1.4 document", "application/pdf")},
        headers=citizen_headers,
    )
    assert upload.status_code == 201

    valid = client.post(f"/api/v1/requests/{request_id}/pre-validate", headers=citizen_headers)
    assert valid.status_code == 200
    valid_body = valid.json()
    assert valid_body["is_valid"] is True
    assert valid_body["items"][0]["status"] == "PASS"

    submit = client.post(f"/api/v1/requests/{request_id}/submit", headers=citizen_headers)
    assert submit.status_code == 200
    assert submit.json()["status"] == "WAITING_FOR_CENTRE"


def test_pre_validation_returns_deterministic_duplicate_warning(
    client: TestClient, db_session: Session, tmp_path: Path
) -> None:
    citizen_headers, _employee_headers, request_id, requirement_id = _document_fixture(
        client, db_session, tmp_path
    )
    first_requirement = db_session.get(ServiceDocumentRequirement, requirement_id)
    assert first_requirement is not None
    second_requirement = ServiceDocumentRequirement(
        service_id=first_requirement.service_id,
        name="Address proof",
        is_required=True,
        max_file_size_bytes=32,
        sort_order=2,
    )
    db_session.add(second_requirement)
    db_session.commit()
    db_session.add(
        ServiceRequirementAllowedFileType(
            requirement_id=second_requirement.id,
            mime_type="application/pdf",
        )
    )
    db_session.commit()

    for requirement in [requirement_id, second_requirement.id]:
        upload = client.post(
            f"/api/v1/requests/{request_id}/documents",
            data={"requirement_id": str(requirement)},
            files={"file": ("same.pdf", b"%PDF-1.4 same", "application/pdf")},
            headers=citizen_headers,
        )
        assert upload.status_code == 201

    validation = client.post(f"/api/v1/requests/{request_id}/pre-validate", headers=citizen_headers)
    assert validation.status_code == 200
    body = validation.json()
    assert body["is_valid"] is True
    assert body["warnings"]
    assert any(item["status"] == "WARNING" for item in body["items"])
