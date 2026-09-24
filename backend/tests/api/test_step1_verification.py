from io import BytesIO
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.centre import AkshayaCentre
from app.models.document import RequestDocument
from app.models.interaction import RequestInteraction
from app.models.request import ServiceRequest
from app.models.service import (
    Service,
    ServiceDocumentRequirement,
    ServiceRequirementAllowedFileType,
)


@pytest.fixture
def second_centre(db_session: Session) -> AkshayaCentre:
    c = AkshayaCentre(
        id=uuid4(),
        name="Centre B",
        code="CB002",
        address_text="Address B",
        district="Kottayam",
        is_active=True,
    )
    db_session.add(c)
    db_session.commit()
    return c


@pytest.fixture
def centre_b_request(db_session: Session, normal_user_id: str, second_centre: AkshayaCentre) -> ServiceRequest:
    service = Service(
        id=uuid4(),
        name="Service B",
        code=f"SB_{uuid4().hex[:6]}",
        service_type="B",
        base_fee=50,
        is_active=True,
    )
    db_session.add(service)
    db_session.commit()

    req = ServiceRequest(
        id=uuid4(),
        citizen_id=UUID(normal_user_id),
        service_id=service.id,
        selected_centre_id=second_centre.id,
        status="UNDER_REVIEW",
        service_type_snapshot="B",
        service_name_snapshot="Service B",
        fee_snapshot=50,
    )
    db_session.add(req)
    db_session.commit()
    return req


# --- 1. Parametrised cross-centre 403/404 over every action endpoint ---

@pytest.mark.parametrize(
    "endpoint_suffix,payload",
    [
        ("accept", {}),
        ("start-review", {}),
        ("mark-ready", {}),
        ("start-processing", {}),
        ("unable-to-proceed", {"reason": "Not eligible"}),
        ("request-payment", {}),
        ("complete", {"collection_instructions": "Come pick up"}),
        ("reassign", {"employee_id": str(uuid4())}),
        ("require-interaction", {"requirement_id": str(uuid4()), "reason": "Meet in person"}),
    ],
)
def test_cross_centre_action_endpoints_forbidden(
    client: TestClient,
    employee_headers: dict[str, str],
    centre_b_request: ServiceRequest,
    endpoint_suffix: str,
    payload: dict,
):
    r = client.post(
        f"/api/v1/requests/{centre_b_request.id}/{endpoint_suffix}",
        headers=employee_headers,
        json=payload,
    )
    assert r.status_code in (403, 404), f"Expected 403 or 404 for {endpoint_suffix}, got {r.status_code}: {r.text}"


def test_cross_centre_document_review_forbidden(
    client: TestClient,
    db_session: Session,
    employee_headers: dict[str, str],
    centre_b_request: ServiceRequest,
    normal_user_id: str,
):
    doc = RequestDocument(
        id=uuid4(),
        request_id=centre_b_request.id,
        requirement_id=uuid4(),
        storage_key="request-documents/fake.pdf",
        original_filename="fake.pdf",
        content_type="application/pdf",
        size_bytes=100,
        sha256="fakehash",
        status="SUBMITTED",
        is_current=True,
        uploaded_by_id=UUID(normal_user_id),
    )
    db_session.add(doc)
    db_session.commit()

    r = client.post(
        f"/api/v1/requests/{centre_b_request.id}/documents/{doc.id}/review",
        headers=employee_headers,
        json={"decision": "APPROVED"},
    )
    assert r.status_code in (403, 404)


def test_cross_centre_interaction_outcome_forbidden(
    client: TestClient,
    db_session: Session,
    employee_headers: dict[str, str],
    centre_b_request: ServiceRequest,
    normal_user_id: str,
):
    interaction = RequestInteraction(
        id=uuid4(),
        request_id=centre_b_request.id,
        requirement_id=uuid4(),
        requested_by_id=UUID(normal_user_id),
        status="SCHEDULED",
        reason="Test",
    )
    db_session.add(interaction)
    db_session.commit()

    r = client.post(
        f"/api/v1/requests/{centre_b_request.id}/interactions/{interaction.id}/outcome",
        headers=employee_headers,
        json={"outcome": "COMPLETED", "note": "Finished"},
    )
    assert r.status_code in (403, 404)


# --- 2. Partial vs full document replacement ---

def test_partial_vs_full_document_replacement(
    client: TestClient,
    db_session: Session,
    normal_user_headers: dict[str, str],
    normal_user_id: str,
    test_centre_id: str,
):
    service = Service(
        id=uuid4(),
        name="Multi-Doc Service",
        code=f"MD_{uuid4().hex[:6]}",
        service_type="A",
        base_fee=10,
        is_active=True,
    )
    db_session.add(service)

    req1 = ServiceDocumentRequirement(
        id=uuid4(), service_id=service.id, name="Doc 1", requirement_type="REQUIRED"
    )
    req2 = ServiceDocumentRequirement(
        id=uuid4(), service_id=service.id, name="Doc 2", requirement_type="REQUIRED"
    )
    ft1 = ServiceRequirementAllowedFileType(requirement_id=req1.id, mime_type="application/pdf")
    ft2 = ServiceRequirementAllowedFileType(requirement_id=req2.id, mime_type="application/pdf")
    db_session.add_all([req1, req2, ft1, ft2])
    db_session.commit()

    # Create service request in CORRECTION_REQUIRED with two documents requiring replacement
    sreq = ServiceRequest(
        id=uuid4(),
        citizen_id=UUID(normal_user_id),
        service_id=service.id,
        selected_centre_id=UUID(test_centre_id),
        status="CORRECTION_REQUIRED",
        service_type_snapshot="A",
        service_name_snapshot="Multi-Doc Service",
    )
    db_session.add(sreq)

    doc1 = RequestDocument(
        id=uuid4(),
        request_id=sreq.id,
        requirement_id=req1.id,
        storage_key="fake/path1.pdf",
        original_filename="doc1.pdf",
        content_type="application/pdf",
        size_bytes=100,
        sha256="h1",
        status="REUPLOAD_REQUIRED",
        is_current=True,
        uploaded_by_id=UUID(normal_user_id),
    )
    doc2 = RequestDocument(
        id=uuid4(),
        request_id=sreq.id,
        requirement_id=req2.id,
        storage_key="fake/path2.pdf",
        original_filename="doc2.pdf",
        content_type="application/pdf",
        size_bytes=100,
        sha256="h2",
        status="REUPLOAD_REQUIRED",
        is_current=True,
        uploaded_by_id=UUID(normal_user_id),
    )
    db_session.add_all([doc1, doc2])
    db_session.commit()

    # Step A: Upload replacement for doc1 ONLY (partial replacement)
    file_bytes1 = BytesIO(b"%PDF-1.4 replacement content 1")
    r1 = client.post(
        f"/api/v1/requests/{sreq.id}/documents",
        headers=normal_user_headers,
        data={"requirement_id": str(req1.id)},
        files={"file": ("doc1_v2.pdf", file_bytes1, "application/pdf")},
    )
    assert r1.status_code == 201, r1.text

    db_session.refresh(sreq)
    # MUST REMAIN in CORRECTION_REQUIRED because doc2 is still REUPLOAD_REQUIRED
    assert sreq.status == "CORRECTION_REQUIRED"

    # Step B: Upload replacement for doc2 (full replacement)
    file_bytes2 = BytesIO(b"%PDF-1.4 replacement content 2")
    r2 = client.post(
        f"/api/v1/requests/{sreq.id}/documents",
        headers=normal_user_headers,
        data={"requirement_id": str(req2.id)},
        files={"file": ("doc2_v2.pdf", file_bytes2, "application/pdf")},
    )
    assert r2.status_code == 201, r2.text

    db_session.refresh(sreq)
    # MUST transition to UNDER_REVIEW now that all replacements are uploaded
    assert sreq.status == "UNDER_REVIEW"


# --- 3. Centre-first search ---

def test_centre_first_search(
    client: TestClient,
    db_session: Session,
    employee_headers: dict[str, str],
    test_centre_id: str,
    second_centre: AkshayaCentre,
    normal_user_id: str,
):
    service = Service(
        id=uuid4(),
        name="Income Certificate",
        code=f"IC_{uuid4().hex[:6]}",
        service_type="A",
        base_fee=25,
        is_active=True,
    )
    db_session.add(service)
    db_session.commit()

    # Request at Employee's centre
    req_a = ServiceRequest(
        id=uuid4(),
        citizen_id=UUID(normal_user_id),
        service_id=service.id,
        selected_centre_id=UUID(test_centre_id),
        status="UNDER_REVIEW",
        service_type_snapshot="A",
        service_name_snapshot="Income Certificate",
    )
    # Request at other centre
    req_b = ServiceRequest(
        id=uuid4(),
        citizen_id=UUID(normal_user_id),
        service_id=service.id,
        selected_centre_id=second_centre.id,
        status="UNDER_REVIEW",
        service_type_snapshot="A",
        service_name_snapshot="Income Certificate",
    )
    db_session.add_all([req_a, req_b])
    db_session.commit()

    # Employee searches for "Income"
    r = client.get("/api/v1/requests/", headers=employee_headers, params={"q": "Income"})
    assert r.status_code == 200
    data = r.json()
    returned_ids = [item["id"] for item in data["items"]]
    assert str(req_a.id) in returned_ids
    assert str(req_b.id) not in returned_ids

    # Employee searches for Centre B request's short ID
    short_id_b = f"#{str(req_b.id)[:8]}"
    r2 = client.get("/api/v1/requests/", headers=employee_headers, params={"q": short_id_b})
    assert r2.status_code == 200
    assert len(r2.json()["items"]) == 0


# --- 4. Search % and _ escaping ---

def test_search_escaping_wildcards_and_short_id(
    client: TestClient,
    db_session: Session,
    employee_headers: dict[str, str],
    test_centre_id: str,
    normal_user_id: str,
):
    service = Service(
        id=uuid4(),
        name="Wildcard Service",
        code=f"WS_{uuid4().hex[:6]}",
        service_type="A",
        base_fee=10,
        is_active=True,
    )
    db_session.add(service)

    # req1 has literal % and _
    req1 = ServiceRequest(
        id=uuid4(),
        citizen_id=UUID(normal_user_id),
        service_id=service.id,
        selected_centre_id=UUID(test_centre_id),
        status="ACCEPTED",
        service_type_snapshot="A",
        service_name_snapshot="Special_50%_Service",
    )
    # req2 has standard characters
    req2 = ServiceRequest(
        id=uuid4(),
        citizen_id=UUID(normal_user_id),
        service_id=service.id,
        selected_centre_id=UUID(test_centre_id),
        status="ACCEPTED",
        service_type_snapshot="A",
        service_name_snapshot="Standard Service",
    )
    db_session.add_all([req1, req2])
    db_session.commit()

    # Search for % should only match req1
    r_pct = client.get("/api/v1/requests/", headers=employee_headers, params={"q": "%"})
    assert r_pct.status_code == 200
    pct_ids = [item["id"] for item in r_pct.json()["items"]]
    assert str(req1.id) in pct_ids
    assert str(req2.id) not in pct_ids

    # Search for _ should only match req1
    r_und = client.get("/api/v1/requests/", headers=employee_headers, params={"q": "_"})
    assert r_und.status_code == 200
    und_ids = [item["id"] for item in r_und.json()["items"]]
    assert str(req1.id) in und_ids
    assert str(req2.id) not in und_ids

    # Search for short ID prefix (#xxxxxxxx) of req2
    short_id = f"#{str(req2.id)[:8]}"
    r_id = client.get("/api/v1/requests/", headers=employee_headers, params={"q": short_id})
    assert r_id.status_code == 200
    id_results = [item["id"] for item in r_id.json()["items"]]
    assert str(req2.id) in id_results
    assert str(req1.id) not in id_results
