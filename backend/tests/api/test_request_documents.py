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
    ServiceInteractionRequirement,
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

    service = Service(name="Document Service", code="DOCSVC", service_type="A", base_fee=100)
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


def test_employee_review_correction_cycle_preserves_review_evidence(
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
    assert upload.status_code == 201
    document_id = upload.json()["id"]

    submit = client.post(f"/api/v1/requests/{request_id}/submit", headers=citizen_headers)
    assert submit.status_code == 200
    accept = client.post(f"/api/v1/requests/{request_id}/accept", headers=employee_headers)
    assert accept.status_code == 200

    start_review = client.post(
        f"/api/v1/requests/{request_id}/start-review",
        headers=employee_headers,
    )
    assert start_review.status_code == 200
    assert start_review.json()["status"] == "UNDER_REVIEW"

    review = client.post(
        f"/api/v1/requests/{request_id}/documents/{document_id}/review",
        json={"decision": "REPLACEMENT_REQUESTED", "reason": "Address page is unreadable."},
        headers=employee_headers,
    )
    assert review.status_code == 201
    assert review.json()["reason"] == "Address page is unreadable."

    request_after_review = client.get(f"/api/v1/requests/{request_id}", headers=citizen_headers)
    assert request_after_review.json()["status"] == "CORRECTION_REQUIRED"

    citizen_reviews = client.get(
        f"/api/v1/requests/{request_id}/document-reviews",
        headers=citizen_headers,
    )
    assert citizen_reviews.status_code == 200
    assert citizen_reviews.json()[0]["reason"] == "Address page is unreadable."

    replacement = client.post(
        f"/api/v1/requests/{request_id}/documents",
        data={"requirement_id": str(requirement_id)},
        files={"file": ("identity-fixed.pdf", b"%PDF-1.4 fixed", "application/pdf")},
        headers=citizen_headers,
    )
    assert replacement.status_code == 201
    assert replacement.json()["version"] == 2

    request_after_replacement = client.get(
        f"/api/v1/requests/{request_id}", headers=citizen_headers
    )
    assert request_after_replacement.json()["status"] == "UNDER_REVIEW"

    preserved_reviews = client.get(
        f"/api/v1/requests/{request_id}/document-reviews",
        headers=citizen_headers,
    )
    assert len(preserved_reviews.json()) == 1
    assert preserved_reviews.json()[0]["document_id"] == document_id


def test_review_requires_current_assignment_and_under_review_state(
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

    not_assigned = client.post(
        f"/api/v1/requests/{request_id}/start-review",
        headers=employee_headers,
    )
    assert not_assigned.status_code == 403

    client.post(f"/api/v1/requests/{request_id}/submit", headers=citizen_headers)
    client.post(f"/api/v1/requests/{request_id}/accept", headers=employee_headers)
    wrong_state = client.post(
        f"/api/v1/requests/{request_id}/documents/{document_id}/review",
        json={"decision": "APPROVED"},
        headers=employee_headers,
    )
    assert wrong_state.status_code == 409


def test_interaction_required_scheduled_and_completed_flow(
    client: TestClient, db_session: Session, tmp_path: Path
) -> None:
    citizen_headers, employee_headers, request_id, requirement_id = _document_fixture(
        client, db_session, tmp_path
    )
    doc_requirement = db_session.get(ServiceDocumentRequirement, requirement_id)
    assert doc_requirement is not None
    interaction_requirement = ServiceInteractionRequirement(
        service_id=doc_requirement.service_id,
        name="Centre visit",
        description="Visit centre for verification",
        is_mandatory=True,
    )
    db_session.add(interaction_requirement)
    db_session.commit()

    client.post(
        f"/api/v1/requests/{request_id}/documents",
        data={"requirement_id": str(requirement_id)},
        files={"file": ("identity.pdf", b"%PDF-1.4 document", "application/pdf")},
        headers=citizen_headers,
    )
    client.post(f"/api/v1/requests/{request_id}/submit", headers=citizen_headers)
    client.post(f"/api/v1/requests/{request_id}/accept", headers=employee_headers)
    client.post(f"/api/v1/requests/{request_id}/start-review", headers=employee_headers)

    required = client.post(
        f"/api/v1/requests/{request_id}/require-interaction",
        json={
            "requirement_id": str(interaction_requirement.id),
            "reason": "Original certificate must be verified.",
            "instructions": "Bring the original certificate.",
        },
        headers=employee_headers,
    )
    assert required.status_code == 201
    interaction_id = required.json()["id"]
    request_after_required = client.get(f"/api/v1/requests/{request_id}", headers=citizen_headers)
    assert request_after_required.json()["status"] == "INTERACTION_REQUIRED"

    visible = client.get(f"/api/v1/requests/{request_id}/interactions", headers=citizen_headers)
    assert visible.status_code == 200
    assert visible.json()[0]["reason"] == "Original certificate must be verified."

    scheduled = client.post(
        f"/api/v1/requests/{request_id}/schedule-interaction",
        json={"interaction_id": interaction_id, "scheduled_at": "2026-09-14T10:00:00+05:30"},
        headers=citizen_headers,
    )
    assert scheduled.status_code == 200
    assert scheduled.json()["status"] == "SCHEDULED"
    request_after_scheduled = client.get(f"/api/v1/requests/{request_id}", headers=citizen_headers)
    assert request_after_scheduled.json()["status"] == "INTERACTION_SCHEDULED"

    completed = client.post(
        f"/api/v1/requests/{request_id}/interactions/{interaction_id}/outcome",
        json={"outcome": "COMPLETED", "note": "Citizen attended."},
        headers=employee_headers,
    )
    assert completed.status_code == 200
    assert completed.json()["status"] == "COMPLETED"
    request_after_completed = client.get(f"/api/v1/requests/{request_id}", headers=citizen_headers)
    assert request_after_completed.json()["status"] == "UNDER_REVIEW"


def test_missed_interaction_uses_record_not_primary_missed_state(
    client: TestClient, db_session: Session, tmp_path: Path
) -> None:
    citizen_headers, employee_headers, request_id, requirement_id = _document_fixture(
        client, db_session, tmp_path
    )
    doc_requirement = db_session.get(ServiceDocumentRequirement, requirement_id)
    assert doc_requirement is not None
    interaction_requirement = ServiceInteractionRequirement(
        service_id=doc_requirement.service_id,
        name="Biometric visit",
        is_mandatory=True,
    )
    db_session.add(interaction_requirement)
    db_session.commit()

    client.post(
        f"/api/v1/requests/{request_id}/documents",
        data={"requirement_id": str(requirement_id)},
        files={"file": ("identity.pdf", b"%PDF-1.4 document", "application/pdf")},
        headers=citizen_headers,
    )
    client.post(f"/api/v1/requests/{request_id}/submit", headers=citizen_headers)
    client.post(f"/api/v1/requests/{request_id}/accept", headers=employee_headers)
    client.post(f"/api/v1/requests/{request_id}/start-review", headers=employee_headers)
    required = client.post(
        f"/api/v1/requests/{request_id}/require-interaction",
        json={
            "requirement_id": str(interaction_requirement.id),
            "reason": "Biometric capture is mandatory.",
        },
        headers=employee_headers,
    )
    interaction_id = required.json()["id"]
    client.post(
        f"/api/v1/requests/{request_id}/schedule-interaction",
        json={"interaction_id": interaction_id, "scheduled_at": "2026-09-14T10:00:00+05:30"},
        headers=citizen_headers,
    )

    missed = client.post(
        f"/api/v1/requests/{request_id}/interactions/{interaction_id}/outcome",
        json={"outcome": "MISSED", "note": "Citizen did not attend."},
        headers=employee_headers,
    )
    assert missed.status_code == 200
    assert missed.json()["status"] == "MISSED"
    request_after_missed = client.get(f"/api/v1/requests/{request_id}", headers=citizen_headers)
    assert request_after_missed.json()["status"] == "INTERACTION_REQUIRED"


def test_request_messages_are_scoped_to_owner_and_active_assignment(
    client: TestClient, db_session: Session, tmp_path: Path
) -> None:
    citizen_headers, employee_headers, request_id, requirement_id = _document_fixture(
        client, db_session, tmp_path
    )
    other = _create_user(db_session, "messageother@example.com", "citizen")
    other_headers = _login(client, other.email)

    citizen_message = client.post(
        f"/api/v1/requests/{request_id}/messages",
        json={"body": "Please review my uploaded document."},
        headers=citizen_headers,
    )
    assert citizen_message.status_code == 201

    other_read = client.get(f"/api/v1/requests/{request_id}/messages", headers=other_headers)
    assert other_read.status_code == 403

    employee_before_assignment = client.get(
        f"/api/v1/requests/{request_id}/messages",
        headers=employee_headers,
    )
    assert employee_before_assignment.status_code == 403

    client.post(
        f"/api/v1/requests/{request_id}/documents",
        data={"requirement_id": str(requirement_id)},
        files={"file": ("identity.pdf", b"%PDF-1.4 document", "application/pdf")},
        headers=citizen_headers,
    )
    client.post(f"/api/v1/requests/{request_id}/submit", headers=citizen_headers)
    client.post(f"/api/v1/requests/{request_id}/accept", headers=employee_headers)

    employee_reply = client.post(
        f"/api/v1/requests/{request_id}/messages",
        json={"body": "We have started reviewing your request."},
        headers=employee_headers,
    )
    assert employee_reply.status_code == 201

    messages = client.get(f"/api/v1/requests/{request_id}/messages", headers=citizen_headers)
    assert messages.status_code == 200
    assert [message["body"] for message in messages.json()] == [
        "Please review my uploaded document.",
        "We have started reviewing your request.",
    ]


def test_ready_and_processing_require_approved_documents(
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
    client.post(f"/api/v1/requests/{request_id}/submit", headers=citizen_headers)
    client.post(f"/api/v1/requests/{request_id}/accept", headers=employee_headers)
    client.post(f"/api/v1/requests/{request_id}/start-review", headers=employee_headers)

    blocked = client.post(f"/api/v1/requests/{request_id}/mark-ready", headers=employee_headers)
    assert blocked.status_code == 409

    approved = client.post(
        f"/api/v1/requests/{request_id}/documents/{document_id}/review",
        json={"decision": "APPROVED"},
        headers=employee_headers,
    )
    assert approved.status_code == 201

    ready = client.post(f"/api/v1/requests/{request_id}/mark-ready", headers=employee_headers)
    assert ready.status_code == 200
    assert ready.json()["status"] == "READY_FOR_PROCESSING"

    processing = client.post(
        f"/api/v1/requests/{request_id}/start-processing",
        headers=employee_headers,
    )
    assert processing.status_code == 200
    assert processing.json()["status"] == "PROCESSING"


def test_unable_to_proceed_requires_reason_and_assignment(
    client: TestClient, db_session: Session, tmp_path: Path
) -> None:
    citizen_headers, employee_headers, request_id, requirement_id = _document_fixture(
        client, db_session, tmp_path
    )
    client.post(
        f"/api/v1/requests/{request_id}/documents",
        data={"requirement_id": str(requirement_id)},
        files={"file": ("identity.pdf", b"%PDF-1.4 document", "application/pdf")},
        headers=citizen_headers,
    )
    client.post(f"/api/v1/requests/{request_id}/submit", headers=citizen_headers)
    client.post(f"/api/v1/requests/{request_id}/accept", headers=employee_headers)
    client.post(f"/api/v1/requests/{request_id}/start-review", headers=employee_headers)

    missing_reason = client.post(
        f"/api/v1/requests/{request_id}/unable-to-proceed",
        json={"reason": "   "},
        headers=employee_headers,
    )
    assert missing_reason.status_code == 422

    unable = client.post(
        f"/api/v1/requests/{request_id}/unable-to-proceed",
        json={"reason": "External portal rejected the supplied reference number."},
        headers=employee_headers,
    )
    assert unable.status_code == 200
    assert unable.json()["status"] == "UNABLE_TO_PROCEED"


def _move_request_to_processing(
    client: TestClient,
    citizen_headers: dict[str, str],
    employee_headers: dict[str, str],
    request_id: UUID,
    requirement_id: UUID,
) -> None:
    upload = client.post(
        f"/api/v1/requests/{request_id}/documents",
        data={"requirement_id": str(requirement_id)},
        files={"file": ("identity.pdf", b"%PDF-1.4 document", "application/pdf")},
        headers=citizen_headers,
    )
    document_id = upload.json()["id"]
    client.post(f"/api/v1/requests/{request_id}/submit", headers=citizen_headers)
    client.post(f"/api/v1/requests/{request_id}/accept", headers=employee_headers)
    client.post(f"/api/v1/requests/{request_id}/start-review", headers=employee_headers)
    client.post(
        f"/api/v1/requests/{request_id}/documents/{document_id}/review",
        json={"decision": "APPROVED"},
        headers=employee_headers,
    )
    client.post(f"/api/v1/requests/{request_id}/mark-ready", headers=employee_headers)
    client.post(f"/api/v1/requests/{request_id}/start-processing", headers=employee_headers)


def test_mock_payment_request_and_idempotent_confirmation(
    client: TestClient, db_session: Session, tmp_path: Path
) -> None:
    citizen_headers, employee_headers, request_id, requirement_id = _document_fixture(
        client, db_session, tmp_path
    )
    _move_request_to_processing(
        client, citizen_headers, employee_headers, request_id, requirement_id
    )

    payment = client.post(
        f"/api/v1/requests/{request_id}/request-payment", headers=employee_headers
    )
    assert payment.status_code == 200
    body = payment.json()
    assert body["status"] == "PENDING"
    assert body["provider"] == "mock"

    request_after_payment = client.get(f"/api/v1/requests/{request_id}", headers=citizen_headers)
    assert request_after_payment.json()["status"] == "PAYMENT_PENDING"

    confirmed = client.post(
        f"/api/v1/requests/{request_id}/payments/{body['id']}/confirm",
        headers=citizen_headers,
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "CONFIRMED"
    confirmed_again = client.post(
        f"/api/v1/requests/{request_id}/payments/{body['id']}/confirm",
        headers=citizen_headers,
    )
    assert confirmed_again.status_code == 200
    assert confirmed_again.json()["status"] == "CONFIRMED"


def test_mock_payment_failure_keeps_request_payment_pending(
    client: TestClient, db_session: Session, tmp_path: Path
) -> None:
    citizen_headers, employee_headers, request_id, requirement_id = _document_fixture(
        client, db_session, tmp_path
    )
    _move_request_to_processing(
        client, citizen_headers, employee_headers, request_id, requirement_id
    )

    payment = client.post(
        f"/api/v1/requests/{request_id}/request-payment", headers=employee_headers
    )
    payment_id = payment.json()["id"]
    failed = client.post(
        f"/api/v1/requests/{request_id}/payments/{payment_id}/fail",
        headers=citizen_headers,
    )
    assert failed.status_code == 200
    assert failed.json()["status"] == "FAILED"
    request_after_failure = client.get(f"/api/v1/requests/{request_id}", headers=citizen_headers)
    assert request_after_failure.json()["status"] == "PAYMENT_PENDING"
