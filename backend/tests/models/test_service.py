from uuid import uuid4

from app.models.service import (
    Service,
    ServiceDocumentRequirement,
    ServiceInteractionRequirement,
)


def test_service_model() -> None:
    service = Service(
        name="Test Service", code="SRV001", service_type="A", base_fee=100.50, retention_days=30
    )
    assert service.name == "Test Service"
    assert service.code == "SRV001"
    assert service.service_type == "A"


def test_service_document_requirement_model() -> None:
    req = ServiceDocumentRequirement(
        service_id=uuid4(),
        name="ID Proof",
        requirement_type="REQUIRED",
        max_file_size_bytes=1048576,
    )
    assert req.name == "ID Proof"
    assert req.requirement_type == "REQUIRED"


def test_service_interaction_requirement_model() -> None:
    req = ServiceInteractionRequirement(
        service_id=uuid4(),
        name="In-person verification",
        is_mandatory=True,
    )
    assert req.name == "In-person verification"
    assert req.is_mandatory is True
