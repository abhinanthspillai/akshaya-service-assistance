from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.centre import AkshayaCentre
from app.models.service import CentreSupportedService, Service
from app.models.user import User


def get_citizen_headers(
    client: TestClient, db_session: Session, email: str = "citizen1@example.com"
) -> dict[str, str]:
    u = db_session.query(User).filter(User.email == email).first()
    if not u:
        u = User(email=email, password_hash=get_password_hash("password123"), role="citizen")
        db_session.add(u)
        db_session.commit()
    r = client.post("/api/v1/auth/login", data={"username": email, "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_create_request_draft(client: TestClient, db_session: Session) -> None:
    headers = get_citizen_headers(client, db_session)
    service = Service(name="Test Req Service", code="TREQ001", service_type="A")
    db_session.add(service)
    db_session.commit()
    r = client.post("/api/v1/requests/", json={"service_id": str(service.id)}, headers=headers)
    assert r.status_code == 201
    assert r.json()["status"] == "DRAFT"
    assert r.json()["service_name_snapshot"] == "Test Req Service"


def test_select_centre_and_submit(client: TestClient, db_session: Session) -> None:
    headers = get_citizen_headers(client, db_session, "citizen2@example.com")

    service = Service(name="Test Submit Svc", code="TSUB001", service_type="B")
    db_session.add(service)
    centre = AkshayaCentre(
        name="Test Submit Centre",
        code="TSC001",
        district="Kollam",
        locality="Kollam",
        address_text="Test addr",
    )
    db_session.add(centre)
    db_session.commit()

    css = CentreSupportedService(centre_id=centre.id, service_id=service.id, is_active=True)
    db_session.add(css)
    db_session.commit()

    r = client.post("/api/v1/requests/", json={"service_id": str(service.id)}, headers=headers)
    assert r.status_code == 201
    req_id = r.json()["id"]

    r = client.post(
        f"/api/v1/requests/{req_id}/select-centre",
        json={"centre_id": str(centre.id)},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["selected_centre_id"] == str(centre.id)

    r = client.post(f"/api/v1/requests/{req_id}/submit", headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "WAITING_FOR_CENTRE"


def test_submit_without_centre_fails(client: TestClient, db_session: Session) -> None:
    headers = get_citizen_headers(client, db_session, "citizen3@example.com")
    service = Service(name="Test No Centre", code="TNC001", service_type="C")
    db_session.add(service)
    db_session.commit()
    r = client.post("/api/v1/requests/", json={"service_id": str(service.id)}, headers=headers)
    req_id = r.json()["id"]
    r = client.post(f"/api/v1/requests/{req_id}/submit", headers=headers)
    assert r.status_code == 409


def test_cross_citizen_access_blocked(client: TestClient, db_session: Session) -> None:
    h1 = get_citizen_headers(client, db_session, "citizen4@example.com")
    h2 = get_citizen_headers(client, db_session, "citizen5@example.com")
    service = Service(name="Test BOLA", code="TBOLA01", service_type="A")
    db_session.add(service)
    db_session.commit()
    r = client.post("/api/v1/requests/", json={"service_id": str(service.id)}, headers=h1)
    req_id = r.json()["id"]
    # citizen2 tries to access citizen1's request
    r = client.get(f"/api/v1/requests/{req_id}", headers=h2)
    assert r.status_code == 403


def get_employee_headers(
    client: TestClient, db_session: Session, centre_id: str, email: str = "emp1@example.com"
) -> dict[str, str]:
    from app.models.profile import EmployeeProfile
    from app.models.user import User

    u = db_session.query(User).filter(User.email == email).first()
    if not u:
        u = User(
            email=email, password_hash=get_password_hash("password123"), role="centre_employee"
        )
        db_session.add(u)
        db_session.flush()
        import uuid

        emp = EmployeeProfile(
            user_id=u.id, centre_id=uuid.UUID(centre_id), full_name="Test Emp", is_available=True
        )
        db_session.add(emp)
        db_session.commit()
    r = client.post("/api/v1/auth/login", data={"username": email, "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def setup_request_waiting_for_centre(client: TestClient, db_session: Session):
    citizen_headers = get_citizen_headers(client, db_session, "citizentest2@example.com")
    service = Service(name="Test Full Svc", code="TFULL02", service_type="A", base_fee=100)
    db_session.add(service)
    centre = AkshayaCentre(
        name="Test Full Centre",
        code="TFC002",
        district="Kollam",
        locality="Kollam",
        address_text="Addr",
    )
    db_session.add(centre)
    db_session.commit()

    css = CentreSupportedService(centre_id=centre.id, service_id=service.id, is_active=True)
    db_session.add(css)
    db_session.commit()

    r = client.post(
        "/api/v1/requests/", json={"service_id": str(service.id)}, headers=citizen_headers
    )
    req_id = r.json()["id"]
    client.post(
        f"/api/v1/requests/{req_id}/select-centre",
        json={"centre_id": str(centre.id)},
        headers=citizen_headers,
    )
    client.post(f"/api/v1/requests/{req_id}/submit", headers=citizen_headers)
    return req_id, str(centre.id), citizen_headers


def test_full_request_lifecycle(client: TestClient, db_session: Session) -> None:
    req_id, centre_id, citizen_headers = setup_request_waiting_for_centre(client, db_session)
    employee_headers = get_employee_headers(client, db_session, centre_id)

    # 1. Accept
    r = client.post(f"/api/v1/requests/{req_id}/accept", headers=employee_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "ACCEPTED"

    # 2. Start Review
    r = client.post(f"/api/v1/requests/{req_id}/start-review", headers=employee_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "UNDER_REVIEW"

    # 3. Mark Ready
    r = client.post(f"/api/v1/requests/{req_id}/mark-ready", headers=employee_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "READY_FOR_PROCESSING"

    # 4. Start Processing
    r = client.post(f"/api/v1/requests/{req_id}/start-processing", headers=employee_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "PROCESSING"

    # 5. Request Payment
    r = client.post(f"/api/v1/requests/{req_id}/request-payment", headers=employee_headers)
    assert r.status_code == 200
    r2 = client.get(f"/api/v1/requests/{req_id}", headers=employee_headers)
    assert r2.json()["status"] == "PAYMENT_PENDING"
    payment_id = r.json()["id"]

    # 6. Confirm Payment (by citizen)
    r = client.post(
        f"/api/v1/requests/{req_id}/payments/{payment_id}/confirm", headers=citizen_headers
    )
    assert r.status_code == 200
    r2 = client.get(f"/api/v1/requests/{req_id}", headers=citizen_headers)
    assert r2.json()["status"] == "PROCESSING"

    # 7. Complete Request
    r = client.post(
        f"/api/v1/requests/{req_id}/complete",
        json={"collection_instructions": "Collect from counter"},
        headers=employee_headers,
    )
    assert r.status_code == 200
    r2 = client.get(f"/api/v1/requests/{req_id}", headers=citizen_headers)
    assert r2.json()["status"] == "COMPLETED"

    # 8. Close Request (by citizen)
    r = client.post(f"/api/v1/requests/{req_id}/close", headers=citizen_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "CLOSED"


def test_unable_to_proceed(client: TestClient, db_session: Session) -> None:
    req_id, centre_id, _ = setup_request_waiting_for_centre(client, db_session)
    employee_headers = get_employee_headers(
        client, db_session, centre_id, email="emp_unable@example.com"
    )

    client.post(f"/api/v1/requests/{req_id}/accept", headers=employee_headers)
    client.post(f"/api/v1/requests/{req_id}/start-review", headers=employee_headers)

    r = client.post(
        f"/api/v1/requests/{req_id}/unable-to-proceed",
        json={"reason": "Missing info"},
        headers=employee_headers,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "UNABLE_TO_PROCEED"


def test_cancel_request(client: TestClient, db_session: Session) -> None:
    req_id, _, citizen_headers = setup_request_waiting_for_centre(client, db_session)
    r = client.post(f"/api/v1/requests/{req_id}/cancel", headers=citizen_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "CANCELLED"


def test_illegal_transition_and_unauthorized_actor(client: TestClient, db_session: Session) -> None:
    req_id, centre_id, citizen_headers = setup_request_waiting_for_centre(client, db_session)
    employee_headers = get_employee_headers(
        client, db_session, centre_id, email="emp_ill1@example.com"
    )
    wrong_emp_headers = get_employee_headers(
        client, db_session, centre_id, email="emp_ill2@example.com"
    )

    # Illegal transition: start-review before accept
    r = client.post(f"/api/v1/requests/{req_id}/start-review", headers=employee_headers)
    assert r.status_code == 403  # Not authorized since no active assignment

    client.post(f"/api/v1/requests/{req_id}/accept", headers=employee_headers)

    # Unauthorized actor: wrong employee tries to start review
    r = client.post(f"/api/v1/requests/{req_id}/start-review", headers=wrong_emp_headers)
    assert r.status_code == 403

    # Valid start review
    client.post(f"/api/v1/requests/{req_id}/start-review", headers=employee_headers)

    # Citizen tries to start processing (requires CurrentUserEmployee)
    r = client.post(f"/api/v1/requests/{req_id}/start-processing", headers=citizen_headers)
    assert r.status_code == 403

    # Illegal transition: start processing from UNDER_REVIEW (needs to be READY_FOR_PROCESSING)
    r = client.post(f"/api/v1/requests/{req_id}/start-processing", headers=employee_headers)
    assert r.status_code == 409


def test_delete_draft_request(client: TestClient, db_session: Session) -> None:
    headers = get_citizen_headers(client, db_session, "citizendel1@example.com")
    service = Service(name="Test Del Service", code="TDEL001", service_type="A")
    db_session.add(service)
    db_session.commit()

    r = client.post("/api/v1/requests/", json={"service_id": str(service.id)}, headers=headers)
    assert r.status_code == 201
    req_id = r.json()["id"]

    r2 = client.delete(f"/api/v1/requests/{req_id}", headers=headers)
    assert r2.status_code == 204

    r3 = client.get(f"/api/v1/requests/{req_id}", headers=headers)
    assert r3.status_code == 404


def test_archive_completed_request(client: TestClient, db_session: Session) -> None:
    req_id, centre_id, citizen_headers = setup_request_waiting_for_centre(client, db_session)
    employee_headers = get_employee_headers(client, db_session, centre_id)

    # Fast track to COMPLETED (including payment since base_fee=100)
    client.post(f"/api/v1/requests/{req_id}/accept", headers=employee_headers)
    client.post(f"/api/v1/requests/{req_id}/start-review", headers=employee_headers)
    client.post(f"/api/v1/requests/{req_id}/mark-ready", headers=employee_headers)
    client.post(f"/api/v1/requests/{req_id}/start-processing", headers=employee_headers)
    pay_res = client.post(f"/api/v1/requests/{req_id}/request-payment", headers=employee_headers)
    payment_id = pay_res.json()["id"]
    client.post(f"/api/v1/requests/{req_id}/payments/{payment_id}/confirm", headers=citizen_headers)
    client.post(
        f"/api/v1/requests/{req_id}/complete",
        json={"collection_instructions": "Collect"},
        headers=employee_headers,
    )

    # Archive
    r = client.delete(f"/api/v1/requests/{req_id}", headers=citizen_headers)
    assert r.status_code == 204

    # Verify it doesn't show in list
    r2 = client.get("/api/v1/requests/", headers=citizen_headers)
    assert r2.status_code == 200
    assert not any(req["id"] == str(req_id) for req in r2.json()["items"])

    # But can still be fetched directly
    r3 = client.get(f"/api/v1/requests/{req_id}", headers=citizen_headers)
    assert r3.status_code == 200


def test_archive_cancelled_request(client: TestClient, db_session: Session) -> None:
    req_id, _, citizen_headers = setup_request_waiting_for_centre(client, db_session)

    # Cancel the request
    client.post(f"/api/v1/requests/{req_id}/cancel", headers=citizen_headers)

    # Archive
    r = client.delete(f"/api/v1/requests/{req_id}", headers=citizen_headers)
    assert r.status_code == 204

    # Verify it doesn't show in list
    r2 = client.get("/api/v1/requests/", headers=citizen_headers)
    assert r2.status_code == 200
    assert not any(req["id"] == str(req_id) for req in r2.json()["items"])


def test_delete_request_invalid_status(client: TestClient, db_session: Session) -> None:
    req_id, centre_id, citizen_headers = setup_request_waiting_for_centre(client, db_session)

    # SUBMITTED/WAITING_FOR_CENTRE status cannot be deleted/archived
    r = client.delete(f"/api/v1/requests/{req_id}", headers=citizen_headers)
    assert r.status_code == 400


def test_citizen_status_counts_isolated_to_own_requests(
    client: TestClient, db_session: Session
) -> None:
    """Verify that a citizen's status_counts in GET /requests/ only include requests
    belonging to that citizen, and are not polluted by another citizen's requests.
    """
    citizen1_headers = get_citizen_headers(client, db_session, "cit1_counts@example.com")
    citizen2_headers = get_citizen_headers(client, db_session, "cit2_counts@example.com")

    service = Service(name="Count Test Service", code=f"CTS_{uuid4().hex[:6]}", service_type="A")
    db_session.add(service)
    db_session.commit()

    # Citizen 1 creates 1 DRAFT
    r1 = client.post(
        "/api/v1/requests/", json={"service_id": str(service.id)}, headers=citizen1_headers
    )
    assert r1.status_code == 201

    # Citizen 2 creates 2 DRAFTs
    r2 = client.post(
        "/api/v1/requests/", json={"service_id": str(service.id)}, headers=citizen2_headers
    )
    assert r2.status_code == 201
    r3 = client.post(
        "/api/v1/requests/", json={"service_id": str(service.id)}, headers=citizen2_headers
    )
    assert r3.status_code == 201

    # Citizen 1 gets status_counts: DRAFT must be exactly 1
    res1 = client.get("/api/v1/requests/", headers=citizen1_headers)
    assert res1.status_code == 200
    counts1 = res1.json()["status_counts"]
    assert counts1.get("DRAFT", 0) == 1

    # Citizen 2 gets status_counts: DRAFT must be exactly 2
    res2 = client.get("/api/v1/requests/", headers=citizen2_headers)
    assert res2.status_code == 200
    counts2 = res2.json()["status_counts"]
    assert counts2.get("DRAFT", 0) == 2


def test_mark_ready_and_start_processing_rejects_paid_service_without_payment(
    client: TestClient, db_session: Session
) -> None:
    req_id, centre_id, _ = setup_request_waiting_for_centre(client, db_session)
    employee_headers = get_employee_headers(client, db_session, centre_id)

    # Move to UNDER_REVIEW
    client.post(f"/api/v1/requests/{req_id}/accept", headers=employee_headers)
    client.post(f"/api/v1/requests/{req_id}/start-review", headers=employee_headers)

    # Calling mark-ready-and-start-processing for paid service without
    # confirmed payment must fail with 409
    res = client.post(
        f"/api/v1/requests/{req_id}/mark-ready-and-start-processing",
        headers=employee_headers,
    )
    assert res.status_code == 409
    assert "Payment is required" in res.json()["detail"]


def test_mark_ready_and_start_processing_allows_zero_fee_service(
    client: TestClient, db_session: Session
) -> None:
    citizen_headers = get_citizen_headers(client, db_session, "cit_zerofee@example.com")
    service = Service(name="Zero Fee Service", code="TZF001", service_type="A", base_fee=0)
    db_session.add(service)
    centre = AkshayaCentre(
        name="Zero Fee Centre",
        code="TZFC001",
        district="Kollam",
        locality="Kollam",
        address_text="Addr",
    )
    db_session.add(centre)
    db_session.commit()

    css = CentreSupportedService(centre_id=centre.id, service_id=service.id, is_active=True)
    db_session.add(css)
    db_session.commit()

    r = client.post(
        "/api/v1/requests/", json={"service_id": str(service.id)}, headers=citizen_headers
    )
    req_id = r.json()["id"]
    client.post(
        f"/api/v1/requests/{req_id}/select-centre",
        json={"centre_id": str(centre.id)},
        headers=citizen_headers,
    )
    client.post(f"/api/v1/requests/{req_id}/submit", headers=citizen_headers)

    employee_headers = get_employee_headers(
        client, db_session, str(centre.id), email="emp_zerofee@example.com"
    )
    client.post(f"/api/v1/requests/{req_id}/accept", headers=employee_headers)
    client.post(f"/api/v1/requests/{req_id}/start-review", headers=employee_headers)

    # Zero-fee service should succeed
    res = client.post(
        f"/api/v1/requests/{req_id}/mark-ready-and-start-processing",
        headers=employee_headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "PROCESSING"


def test_complete_blocked_for_paid_service_without_confirmed_payment(
    client: TestClient, db_session: Session
) -> None:
    req_id, centre_id, _ = setup_request_waiting_for_centre(client, db_session)
    employee_headers = get_employee_headers(client, db_session, centre_id)

    client.post(f"/api/v1/requests/{req_id}/accept", headers=employee_headers)
    client.post(f"/api/v1/requests/{req_id}/start-review", headers=employee_headers)
    client.post(f"/api/v1/requests/{req_id}/mark-ready", headers=employee_headers)
    client.post(f"/api/v1/requests/{req_id}/start-processing", headers=employee_headers)

    # Try to complete directly without paying
    r = client.post(
        f"/api/v1/requests/{req_id}/complete",
        json={"collection_instructions": "Collect"},
        headers=employee_headers,
    )
    assert r.status_code == 409
    assert "Cannot complete paid request without confirmed payment" in r.json()["detail"]


def test_request_payment_from_under_review_transitions_to_payment_pending(
    client: TestClient, db_session: Session
) -> None:
    req_id, centre_id, citizen_headers = setup_request_waiting_for_centre(client, db_session)
    employee_headers = get_employee_headers(client, db_session, centre_id)

    client.post(f"/api/v1/requests/{req_id}/accept", headers=employee_headers)
    client.post(f"/api/v1/requests/{req_id}/start-review", headers=employee_headers)

    # Request payment directly from UNDER_REVIEW
    pay_res = client.post(f"/api/v1/requests/{req_id}/request-payment", headers=employee_headers)
    assert pay_res.status_code == 200
    payment_id = pay_res.json()["id"]

    check = client.get(f"/api/v1/requests/{req_id}", headers=citizen_headers)
    assert check.json()["status"] == "PAYMENT_PENDING"

    # Confirming payment transitions to PROCESSING
    conf_res = client.post(
        f"/api/v1/requests/{req_id}/payments/{payment_id}/confirm", headers=citizen_headers
    )
    assert conf_res.status_code == 200
    check2 = client.get(f"/api/v1/requests/{req_id}", headers=citizen_headers)
    assert check2.json()["status"] == "PROCESSING"


def test_unaccepted_request_messages_returns_empty_and_rejects_send(
    client: TestClient, db_session: Session
) -> None:
    req_id, _centre_id, citizen_headers = setup_request_waiting_for_centre(client, db_session)

    # 1. GET messages before acceptance returns 200 with empty list
    get_res = client.get(f"/api/v1/requests/{req_id}/messages", headers=citizen_headers)
    assert get_res.status_code == 200
    assert get_res.json() == []

    # 2. POST message before acceptance returns 409
    post_res = client.post(
        f"/api/v1/requests/{req_id}/messages",
        json={"body": "Hello before acceptance"},
        headers=citizen_headers,
    )
    assert post_res.status_code == 409
    assert (
        post_res.json()["detail"]
        == "Chat is not available before the request is accepted by a centre employee"
    )


def test_freshly_submitted_request_details_and_sub_endpoints(
    client: TestClient, db_session: Session
) -> None:
    req_id, _centre_id, citizen_headers = setup_request_waiting_for_centre(client, db_session)

    # Verify all detail-page endpoints succeed with empty states on a freshly submitted request
    req_res = client.get(f"/api/v1/requests/{req_id}", headers=citizen_headers)
    assert req_res.status_code == 200
    assert req_res.json()["status"] == "WAITING_FOR_CENTRE"

    docs_res = client.get(f"/api/v1/requests/{req_id}/documents", headers=citizen_headers)
    assert docs_res.status_code == 200
    assert isinstance(docs_res.json(), list)

    reviews_res = client.get(f"/api/v1/requests/{req_id}/document-reviews", headers=citizen_headers)
    assert reviews_res.status_code == 200
    assert isinstance(reviews_res.json(), list)

    interactions_res = client.get(
        f"/api/v1/requests/{req_id}/interactions", headers=citizen_headers
    )
    assert interactions_res.status_code == 200
    assert isinstance(interactions_res.json(), list)

    messages_res = client.get(f"/api/v1/requests/{req_id}/messages", headers=citizen_headers)
    assert messages_res.status_code == 200
    assert messages_res.json() == []

    payments_res = client.get(f"/api/v1/requests/{req_id}/payments", headers=citizen_headers)
    assert payments_res.status_code == 200
    assert messages_res.json() == []


def test_get_request_output_access_control(client: TestClient, db_session: Session) -> None:
    # 1. Setup request with citizen owner and centre A
    req_id, centre_a_id, citizen_headers = setup_request_waiting_for_centre(client, db_session)
    employee_a_headers = get_employee_headers(
        client, db_session, centre_a_id, email="emp_a_output@example.com"
    )

    # 2. Advance to PROCESSING and complete with output
    client.post(f"/api/v1/requests/{req_id}/accept", headers=employee_a_headers)
    client.post(f"/api/v1/requests/{req_id}/start-review", headers=employee_a_headers)
    client.post(f"/api/v1/requests/{req_id}/mark-ready", headers=employee_a_headers)
    client.post(f"/api/v1/requests/{req_id}/start-processing", headers=employee_a_headers)
    pay_res = client.post(f"/api/v1/requests/{req_id}/request-payment", headers=employee_a_headers)
    payment_id = pay_res.json()["id"]
    client.post(f"/api/v1/requests/{req_id}/payments/{payment_id}/confirm", headers=citizen_headers)

    comp_res = client.post(
        f"/api/v1/requests/{req_id}/complete",
        json={
            "collection_instructions": "Collect from counter 1",
            "note": "Internal verification completed",
        },
        headers=employee_a_headers,
    )
    assert comp_res.status_code == 200

    # 3. Create a different citizen -> 403
    other_citizen_headers = get_citizen_headers(
        client, db_session, email="other_citizen_output@example.com"
    )
    res_other_cit = client.get(f"/api/v1/requests/{req_id}/output", headers=other_citizen_headers)
    assert res_other_cit.status_code == 403

    # 4. Create another centre B and staff of centre B -> 403
    centre_b = AkshayaCentre(
        name="Centre B Output",
        code="CBO001",
        district="Ernakulam",
        locality="Kochi",
        address_text="Addr B",
    )
    db_session.add(centre_b)
    db_session.commit()
    employee_b_headers = get_employee_headers(
        client, db_session, str(centre_b.id), email="emp_b_output@example.com"
    )
    res_other_emp = client.get(f"/api/v1/requests/{req_id}/output", headers=employee_b_headers)
    assert res_other_emp.status_code == 403

    # 5. Owner citizen -> 200
    res_owner = client.get(f"/api/v1/requests/{req_id}/output", headers=citizen_headers)
    assert res_owner.status_code == 200
    owner_data = res_owner.json()
    assert owner_data["collection_instructions"] == "Collect from counter 1"

    # 6. Staff of centre A -> 200
    res_staff = client.get(f"/api/v1/requests/{req_id}/output", headers=employee_a_headers)
    assert res_staff.status_code == 200

    # 7. System administrator -> 200
    from app.models.user import User

    admin_user = User(
        email="sysadmin_output@example.com",
        password_hash=get_password_hash("password123"),
        role="system_administrator",
    )
    db_session.add(admin_user)
    db_session.commit()
    login_adm = client.post(
        "/api/v1/auth/login",
        data={"username": "sysadmin_output@example.com", "password": "password123"},
    )
    admin_headers = {"Authorization": f"Bearer {login_adm.json()['access_token']}"}
    res_admin = client.get(f"/api/v1/requests/{req_id}/output", headers=admin_headers)
    assert res_admin.status_code == 200


def test_accept_request_not_blocked_by_completed_requests(
    client: TestClient, db_session: Session
) -> None:
    from app.models.assignment import RequestAssignment
    from app.models.profile import EmployeeProfile
    from app.models.request import ServiceRequest

    centre = AkshayaCentre(name="Cap Centre", code="CAP002", district="Kottayam", address_text="x")
    service = Service(name="Cap Svc", code="CAP002", service_type="A")
    db_session.add_all([centre, service])
    db_session.commit()

    css = CentreSupportedService(centre_id=centre.id, service_id=service.id, is_active=True)
    db_session.add(css)

    emp_user = User(
        email="emp_cap_test@example.com",
        password_hash=get_password_hash("password123"),
        role="centre_employee",
    )
    db_session.add(emp_user)
    db_session.commit()

    emp_profile = EmployeeProfile(
        user_id=emp_user.id,
        centre_id=centre.id,
        full_name="Cap Test Emp",
        max_active_requests=1,
        approval_status="APPROVED",
    )
    db_session.add(emp_profile)
    db_session.commit()

    # Create 5 completed requests assigned to this employee
    for _ in range(5):
        completed_req = ServiceRequest(
            citizen_id=emp_user.id,
            service_id=service.id,
            selected_centre_id=centre.id,
            status="COMPLETED",
            service_type_snapshot="A",
            service_name_snapshot="Cap Svc",
        )
        db_session.add(completed_req)
        db_session.commit()
        assign = RequestAssignment(
            request_id=completed_req.id,
            employee_id=emp_user.id,
            is_active=True,
        )
        db_session.add(assign)
    db_session.commit()

    # Now create a new request in WAITING_FOR_CENTRE
    new_req = ServiceRequest(
        citizen_id=emp_user.id,
        service_id=service.id,
        selected_centre_id=centre.id,
        status="WAITING_FOR_CENTRE",
        service_type_snapshot="A",
        service_name_snapshot="Cap Svc",
    )
    db_session.add(new_req)
    db_session.commit()

    emp_login = client.post(
        "/api/v1/auth/login",
        data={"username": "emp_cap_test@example.com", "password": "password123"},
    )
    emp_headers = {"Authorization": f"Bearer {emp_login.json()['access_token']}"}

    # Should succeed because employee has 0 active requests (max_active_requests = 1)
    res_accept = client.post(f"/api/v1/requests/{new_req.id}/accept", headers=emp_headers)
    assert res_accept.status_code == 200
    assert res_accept.json()["status"] == "ACCEPTED"
