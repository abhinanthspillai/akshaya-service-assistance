from decimal import Decimal
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.centre import AkshayaCentre
from app.models.profile import CitizenProfile, EmployeeProfile
from app.models.service import CentreSupportedService, Service
from app.models.user import User


def test_razorpay_order_creation_and_verification(
    client: TestClient, db_session: Session
) -> None:
    # 1. Setup Service and Centre
    service = Service(
        name="Razorpay Test Service",
        code=f"RZP{uuid4().hex[:5].upper()}",
        service_type="A",
        base_fee=150,
    )
    db_session.add(service)

    centre = AkshayaCentre(
        name="Razorpay Test Centre",
        code=f"RZPC{uuid4().hex[:4].upper()}",
        district="Ernakulam",
        locality="Kochi",
        address_text="Kochi Main Road",
    )
    db_session.add(centre)
    db_session.commit()

    css = CentreSupportedService(centre_id=centre.id, service_id=service.id, is_active=True)
    db_session.add(css)

    # 2. Setup Citizen
    cit_email = f"citizen.{uuid4().hex[:8]}@akshaya.test"
    cit_user = User(
        email=cit_email,
        password_hash=get_password_hash("Password123!"),
        role="citizen",
        is_active=True,
    )
    db_session.add(cit_user)
    db_session.flush()

    cit_profile = CitizenProfile(
        user_id=cit_user.id,
        full_name="Razorpay Citizen",
        phone="9876543210",
        address_text="123 Kerala Road",
    )
    db_session.add(cit_profile)

    # 3. Setup Employee
    emp_email = f"emp.{uuid4().hex[:8]}@akshaya.test"
    emp_user = User(
        email=emp_email,
        password_hash=get_password_hash("Password123!"),
        role="centre_employee",
        is_active=True,
    )
    db_session.add(emp_user)
    db_session.flush()

    emp_profile = EmployeeProfile(
        user_id=emp_user.id,
        centre_id=centre.id,
        full_name="Razorpay Staff",
        approval_status="APPROVED",
        is_available=True,
    )
    db_session.add(emp_profile)
    db_session.commit()

    # 4. Auth headers
    cit_tok = client.post(
        "/api/v1/auth/login",
        data={"username": cit_email, "password": "Password123!"},
    ).json()["access_token"]
    cit_headers = {"Authorization": f"Bearer {cit_tok}"}

    emp_tok = client.post(
        "/api/v1/auth/login",
        data={"username": emp_email, "password": "Password123!"},
    ).json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_tok}"}

    # 5. Create, assign centre, and submit request
    req_res = client.post(
        "/api/v1/requests/",
        json={"service_id": str(service.id)},
        headers=cit_headers,
    )
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    sel_res = client.post(
        f"/api/v1/requests/{req_id}/select-centre",
        json={"centre_id": str(centre.id)},
        headers=cit_headers,
    )
    assert sel_res.status_code == 200

    sub_res = client.post(f"/api/v1/requests/{req_id}/submit", headers=cit_headers)
    assert sub_res.status_code == 200

    # 6. Staff accepts, reviews, marks ready, and starts processing
    acc_res = client.post(f"/api/v1/requests/{req_id}/accept", headers=emp_headers)
    assert acc_res.status_code == 200

    rev_res = client.post(f"/api/v1/requests/{req_id}/start-review", headers=emp_headers)
    assert rev_res.status_code == 200

    rdy_res = client.post(f"/api/v1/requests/{req_id}/mark-ready", headers=emp_headers)
    assert rdy_res.status_code == 200

    proc_res = client.post(f"/api/v1/requests/{req_id}/start-processing", headers=emp_headers)
    assert proc_res.status_code == 200

    # 7. Staff requests payment
    pay_res = client.post(f"/api/v1/requests/{req_id}/request-payment", headers=emp_headers)
    assert pay_res.status_code == 200
    payment = pay_res.json()
    payment_id = payment["id"]
    assert payment["status"] == "PENDING"
    assert float(payment["amount"]) == 150.0

    # Verify request transitioned to PAYMENT_PENDING
    req_check = client.get(f"/api/v1/requests/{req_id}", headers=cit_headers)
    assert req_check.json()["status"] == "PAYMENT_PENDING"

    # 8. Citizen creates Razorpay order
    order_res = client.post(
        f"/api/v1/requests/{req_id}/payments/{payment_id}/razorpay-order",
        headers=cit_headers,
    )
    assert order_res.status_code == 200
    order_data = order_res.json()
    assert order_data["order_id"].startswith("order_")
    assert order_data["amount"] == 15000  # 150 INR in paise

    # 9. Verify invalid signature fails
    bad_verify = client.post(
        f"/api/v1/requests/{req_id}/payments/{payment_id}/razorpay-verify",
        json={
            "razorpay_order_id": order_data["order_id"],
            "razorpay_payment_id": "pay_fake_000",
            "razorpay_signature": "invalid_sig",
        },
        headers=cit_headers,
    )
    assert bad_verify.status_code == 400

    # 10. Verify valid signature succeeds
    good_verify = client.post(
        f"/api/v1/requests/{req_id}/payments/{payment_id}/razorpay-verify",
        json={
            "razorpay_order_id": order_data["order_id"],
            "razorpay_payment_id": "pay_rzp_test_success_123",
            "razorpay_signature": "mock_signature_valid",
        },
        headers=cit_headers,
    )
    assert good_verify.status_code == 200
    assert good_verify.json()["status"] == "CONFIRMED"

    # 11. Request transitioned to PROCESSING idempotently
    after_verify = client.get(f"/api/v1/requests/{req_id}", headers=cit_headers)
    assert after_verify.json()["status"] == "PROCESSING"

    # 12. Re-verifying is idempotent
    idempotent_res = client.post(
        f"/api/v1/requests/{req_id}/payments/{payment_id}/razorpay-verify",
        json={
            "razorpay_order_id": order_data["order_id"],
            "razorpay_payment_id": "pay_rzp_test_success_123",
            "razorpay_signature": "mock_signature_valid",
        },
        headers=cit_headers,
    )
    assert idempotent_res.status_code == 200
    assert idempotent_res.json()["status"] == "CONFIRMED"
