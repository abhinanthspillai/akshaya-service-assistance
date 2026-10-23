import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.centre import AkshayaCentre
from app.models.document import RequestDocument
from app.models.profile import EmployeeProfile
from app.models.request import ServiceRequest
from app.models.service import CentreSupportedService, Service
from app.models.user import User


def test_employee_document_download_inline_only(
    client: TestClient, db_session: Session, tmp_path
) -> None:
    # 1. Setup Centre
    centre = AkshayaCentre(
        name="Inline Doc Test Centre",
        code=f"IDC-{uuid.uuid4().hex[:6]}",
        district="Ernakulam",
        locality="Kochi",
        address_text="Kochi test address",
    )
    db_session.add(centre)

    # 2. Setup Employee
    emp_user = User(
        email=f"emp_doc_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=get_password_hash("password123"),
        role="centre_employee",
    )
    db_session.add(emp_user)
    db_session.flush()

    emp_profile = EmployeeProfile(
        user_id=emp_user.id,
        centre_id=centre.id,
        full_name="Doc Inline Employee",
        is_available=True,
        approval_status="APPROVED",
    )
    db_session.add(emp_profile)

    # 3. Setup Citizen
    citizen = User(
        email=f"citizen_doc_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=get_password_hash("password123"),
        role="citizen",
    )
    db_session.add(citizen)

    # 4. Setup Service
    service = Service(
        name="Doc Test Service",
        code=f"DTS-{uuid.uuid4().hex[:6]}",
        service_type="A",
        base_fee=50,
    )
    db_session.add(service)
    db_session.flush()

    css = CentreSupportedService(centre_id=centre.id, service_id=service.id, is_active=True)
    db_session.add(css)
    db_session.commit()

    # 5. Setup Request & Document
    req = ServiceRequest(
        citizen_id=citizen.id,
        service_id=service.id,
        selected_centre_id=centre.id,
        status="UNDER_REVIEW",
        service_name_snapshot=service.name,
        service_type_snapshot=service.service_type,
    )
    db_session.add(req)
    db_session.flush()

    from app.models.assignment import RequestAssignment
    assignment = RequestAssignment(
        request_id=req.id,
        employee_id=emp_user.id,
        is_active=True,
    )
    db_session.add(assignment)

    from app.models.service import ServiceDocumentRequirement
    req_doc_req = ServiceDocumentRequirement(
        service_id=service.id,
        name="ID Proof",
        requirement_type="REQUIRED",
    )
    db_session.add(req_doc_req)
    db_session.flush()

    # Create dummy storage file in local uploads
    from app.api.endpoints.requests import _write_private_upload
    storage_key = _write_private_upload(
        request_id=req.id,
        original_filename="sample_id_card.pdf",
        data=b"%PDF-1.4 test dummy content",
    )

    doc = RequestDocument(
        request_id=req.id,
        requirement_id=req_doc_req.id,
        uploaded_by_id=citizen.id,
        original_filename="sample_id_card.pdf",
        storage_key=storage_key,
        content_type="application/pdf",
        size_bytes=len(b"%PDF-1.4 test dummy content"),
        sha256="dummy_sha256_hash_here_12345678901234567890123456789012345678901234",
        version=1,
        is_current=True,
    )
    db_session.add(doc)
    db_session.commit()

    # 6. Test Employee access: must return Content-Disposition: inline (not attachment)
    emp_login = client.post(
        "/api/v1/auth/login",
        data={"username": emp_user.email, "password": "password123"},
    )
    assert emp_login.status_code == 200
    emp_token = emp_login.json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    emp_resp = client.get(
        f"/api/v1/requests/{req.id}/documents/{doc.id}/download",
        headers=emp_headers,
    )
    assert emp_resp.status_code == 200
    content_disp_emp = emp_resp.headers.get("content-disposition", "")
    assert "inline" in content_disp_emp
    assert "attachment" not in content_disp_emp

    # 7. Test Citizen access: can download as attachment
    citizen_login = client.post(
        "/api/v1/auth/login",
        data={"username": citizen.email, "password": "password123"},
    )
    assert citizen_login.status_code == 200
    citizen_token = citizen_login.json()["access_token"]
    citizen_headers = {"Authorization": f"Bearer {citizen_token}"}

    cit_resp = client.get(
        f"/api/v1/requests/{req.id}/documents/{doc.id}/download",
        headers=citizen_headers,
    )
    assert cit_resp.status_code == 200
    content_disp_cit = cit_resp.headers.get("content-disposition", "")
    assert "attachment" in content_disp_cit
    assert "sample_id_card.pdf" in content_disp_cit
