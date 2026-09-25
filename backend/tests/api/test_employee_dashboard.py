from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.centre import AkshayaCentre
from app.models.document import RequestDocument
from app.models.profile import CitizenProfile, EmployeeProfile
from app.models.request import ServiceRequest
from app.models.service import CentreSupportedService, Service, ServiceDocumentRequirement
from app.models.user import User


@pytest.fixture
def dashboard_fixture(db_session: Session, client: TestClient):
    pwd = get_password_hash("testpass123")

    # Centre A and Centre B
    centre_a = AkshayaCentre(
        id=uuid4(),
        name="Dashboard Centre A",
        code=f"DCA_{uuid4().hex[:6]}",
        address_text="Centre A Street",
        district="Ernakulam",
        is_active=True,
    )
    centre_b = AkshayaCentre(
        id=uuid4(),
        name="Dashboard Centre B",
        code=f"DCB_{uuid4().hex[:6]}",
        address_text="Centre B Street",
        district="Ernakulam",
        is_active=True,
    )
    db_session.add_all([centre_a, centre_b])
    db_session.commit()

    # Service
    svc = Service(name="Dashboard Test Service", code=f"DTS_{uuid4().hex[:4]}", service_type="A", base_fee=150)
    db_session.add(svc)
    db_session.commit()

    css_a = CentreSupportedService(centre_id=centre_a.id, service_id=svc.id, is_active=True)
    css_b = CentreSupportedService(centre_id=centre_b.id, service_id=svc.id, is_active=True)
    db_session.add_all([css_a, css_b])
    db_session.commit()

    # Citizen
    cit_user = User(email=f"cit_dash_{uuid4().hex[:6]}@test.com", password_hash=pwd, role="citizen")
    db_session.add(cit_user)
    db_session.commit()
    cit_prof = CitizenProfile(user_id=cit_user.id, full_name="Citizen Dash")
    db_session.add(cit_prof)
    db_session.commit()

    # Employee Centre A - Approved
    emp_a_user = User(email=f"emp_a_{uuid4().hex[:6]}@test.com", password_hash=pwd, role="centre_employee")
    db_session.add(emp_a_user)
    db_session.commit()
    emp_a_prof = EmployeeProfile(
        user_id=emp_a_user.id,
        centre_id=centre_a.id,
        full_name="Emp Centre A",
        approval_status="APPROVED",
    )
    db_session.add(emp_a_prof)
    db_session.commit()

    # Employee Centre A - Pending Approval
    emp_pending_user = User(email=f"emp_pend_{uuid4().hex[:6]}@test.com", password_hash=pwd, role="centre_employee")
    db_session.add(emp_pending_user)
    db_session.commit()
    emp_pending_prof = EmployeeProfile(
        user_id=emp_pending_user.id,
        centre_id=centre_a.id,
        full_name="Emp Pending",
        approval_status="PENDING_APPROVAL",
    )
    db_session.add(emp_pending_prof)
    db_session.commit()

    # Logins
    res_a = client.post("/api/v1/auth/login", data={"username": emp_a_user.email, "password": "testpass123"})
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    res_pend = client.post("/api/v1/auth/login", data={"username": emp_pending_user.email, "password": "testpass123"})
    token_pend = res_pend.json()["access_token"]
    headers_pend = {"Authorization": f"Bearer {token_pend}"}

    res_cit = client.post("/api/v1/auth/login", data={"username": cit_user.email, "password": "testpass123"})
    token_cit = res_cit.json()["access_token"]
    headers_cit = {"Authorization": f"Bearer {token_cit}"}

    return {
        "centre_a": centre_a,
        "centre_b": centre_b,
        "service": svc,
        "citizen": cit_user,
        "emp_a": emp_a_user,
        "headers_a": headers_a,
        "headers_pend": headers_pend,
        "headers_cit": headers_cit,
    }


def test_dashboard_guards(client: TestClient, dashboard_fixture: dict):
    # Citizen gets 403
    r1 = client.get("/api/v1/requests/dashboard", headers=dashboard_fixture["headers_cit"])
    assert r1.status_code == 403

    # Pending employee gets 403
    r2 = client.get("/api/v1/requests/dashboard", headers=dashboard_fixture["headers_pend"])
    assert r2.status_code == 403
    assert "pending approval" in r2.json()["detail"].lower()

    # Approved employee gets 200
    r3 = client.get("/api/v1/requests/dashboard", headers=dashboard_fixture["headers_a"])
    assert r3.status_code == 200


def test_dashboard_bucket_counts_and_exclusions(
    client: TestClient, db_session: Session, dashboard_fixture: dict
):
    centre_a = dashboard_fixture["centre_a"]
    centre_b = dashboard_fixture["centre_b"]
    svc = dashboard_fixture["service"]
    cit = dashboard_fixture["citizen"]
    now = datetime.now(UTC)

    # Centre A requests
    req_draft = ServiceRequest(
        citizen_id=cit.id, service_id=svc.id, selected_centre_id=centre_a.id,
        status="DRAFT", service_name_snapshot="Svc", service_type_snapshot="A", fee_snapshot=100
    )
    req_submitted = ServiceRequest(
        citizen_id=cit.id, service_id=svc.id, selected_centre_id=centre_a.id,
        status="SUBMITTED", service_name_snapshot="Svc", service_type_snapshot="A", fee_snapshot=100
    )
    req_waiting = ServiceRequest(
        citizen_id=cit.id, service_id=svc.id, selected_centre_id=centre_a.id,
        status="WAITING_FOR_CENTRE", service_name_snapshot="Svc", service_type_snapshot="A", fee_snapshot=100
    )
    req_accepted = ServiceRequest(
        citizen_id=cit.id, service_id=svc.id, selected_centre_id=centre_a.id,
        status="ACCEPTED", service_name_snapshot="Svc", service_type_snapshot="A", fee_snapshot=100
    )
    req_review = ServiceRequest(
        citizen_id=cit.id, service_id=svc.id, selected_centre_id=centre_a.id,
        status="UNDER_REVIEW", service_name_snapshot="Svc", service_type_snapshot="A", fee_snapshot=100
    )
    req_payment = ServiceRequest(
        citizen_id=cit.id, service_id=svc.id, selected_centre_id=centre_a.id,
        status="PAYMENT_PENDING", service_name_snapshot="Svc", service_type_snapshot="A", fee_snapshot=100
    )
    req_completed_today = ServiceRequest(
        citizen_id=cit.id, service_id=svc.id, selected_centre_id=centre_a.id,
        status="COMPLETED", service_name_snapshot="Svc", service_type_snapshot="A", fee_snapshot=100,
        completed_at=now
    )
    req_completed_yesterday = ServiceRequest(
        citizen_id=cit.id, service_id=svc.id, selected_centre_id=centre_a.id,
        status="COMPLETED", service_name_snapshot="Svc", service_type_snapshot="A", fee_snapshot=100,
        completed_at=now - timedelta(days=2)
    )
    req_unable = ServiceRequest(
        citizen_id=cit.id, service_id=svc.id, selected_centre_id=centre_a.id,
        status="UNABLE_TO_PROCEED", service_name_snapshot="Svc", service_type_snapshot="A", fee_snapshot=100,
        updated_at=now - timedelta(days=5)
    )

    # Centre B request (must NOT bleed into Centre A)
    req_centre_b = ServiceRequest(
        citizen_id=cit.id, service_id=svc.id, selected_centre_id=centre_b.id,
        status="WAITING_FOR_CENTRE", service_name_snapshot="Svc", service_type_snapshot="A", fee_snapshot=100
    )

    db_session.add_all([
        req_draft, req_submitted, req_waiting, req_accepted,
        req_review, req_payment, req_completed_today, req_completed_yesterday,
        req_unable, req_centre_b
    ])
    db_session.commit()

    res = client.get("/api/v1/requests/dashboard", headers=dashboard_fixture["headers_a"])
    assert res.status_code == 200
    data = res.json()

    # DRAFT and SUBMITTED must be excluded from status_counts
    status_counts = data["status_counts"]
    assert "DRAFT" not in status_counts
    assert "SUBMITTED" not in status_counts

    # Check buckets
    buckets = data["buckets"]
    assert buckets["new"] == 2  # WAITING_FOR_CENTRE (1) + ACCEPTED (1)
    assert buckets["in_review"] == 1  # UNDER_REVIEW (1)
    assert buckets["awaiting_citizen"] == 1  # PAYMENT_PENDING (1)
    assert buckets["completed_today"] == 1  # completed today only
    assert buckets["rejected_last_30_days"] == 1  # unable to proceed within 30 days


def test_dashboard_needs_attention_ranking(
    client: TestClient, db_session: Session, dashboard_fixture: dict
):
    centre_a = dashboard_fixture["centre_a"]
    svc = dashboard_fixture["service"]
    cit = dashboard_fixture["citizen"]
    now = datetime.now(UTC)

    # 1. Normal WAITING_FOR_CENTRE
    req_normal = ServiceRequest(
        citizen_id=cit.id, service_id=svc.id, selected_centre_id=centre_a.id,
        status="WAITING_FOR_CENTRE", service_name_snapshot="Svc", service_type_snapshot="A", fee_snapshot=100,
        created_at=now - timedelta(hours=2)
    )
    db_session.add(req_normal)
    db_session.commit()

    # 2. Request with re-uploaded document (version 2)
    req_reuploaded = ServiceRequest(
        citizen_id=cit.id, service_id=svc.id, selected_centre_id=centre_a.id,
        status="UNDER_REVIEW", service_name_snapshot="Svc", service_type_snapshot="A", fee_snapshot=100,
        created_at=now - timedelta(hours=1)
    )
    db_session.add(req_reuploaded)
    db_session.commit()

    req_doc_def = ServiceDocumentRequirement(
        id=uuid4(),
        service_id=svc.id,
        name="Test Doc",
        is_active=True,
    )
    db_session.add(req_doc_def)
    db_session.commit()

    doc = RequestDocument(
        id=uuid4(),
        request_id=req_reuploaded.id,
        requirement_id=req_doc_def.id,
        uploaded_by_id=cit.id,
        original_filename="passport.pdf",
        storage_key=f"test/key_{uuid4().hex[:6]}",
        content_type="application/pdf",
        size_bytes=1024,
        sha256="abcd" * 16,
        version=2,
        is_current=True,
    )
    db_session.add(doc)
    db_session.commit()

    res = client.get("/api/v1/requests/dashboard", headers=dashboard_fixture["headers_a"])
    assert res.status_code == 200
    needs_attention = res.json()["needs_attention"]
    assert len(needs_attention) >= 2
    # Re-uploaded doc request must be ranked first (Priority 1)
    assert needs_attention[0]["id"] == str(req_reuploaded.id)
