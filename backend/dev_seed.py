"""SAHAYA Dev Seeder Script.

Seeds test users, centres, employee profiles, and sample requests across all
lifecycle states for manual testing, evaluation, and end-to-end flow validation.
"""

from datetime import UTC, datetime, timedelta
from decimal import Decimal
import os
import sys
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.assignment import RequestAssignment, RequestHistory
from app.models.centre import AkshayaCentre
from app.models.document import RequestDocument
from app.models.enums import RequestAction
from app.models.interaction import RequestInteraction
from app.models.output import CompletedOutput
from app.models.payment import RequestPayment
from app.models.profile import CentreAdministrator, CitizenProfile, EmployeeProfile
from app.models.request import ServiceRequest
from app.models.service import (
    CentreSupportedService,
    Service,
    ServiceDocumentRequirement,
    ServiceInteractionRequirement,
)
from app.models.user import User
from seed_services import seed_services

SEED_PASSWORD = "Password123!"


def verify_dev_environment() -> None:
    settings = get_settings()
    env = (os.environ.get("ENVIRONMENT") or settings.app_env or "").lower()
    allowed_envs = {"dev", "local", "test", "development"}
    if env not in allowed_envs:
        print(
            f"ERROR: dev_seed.py is fail-closed and only runs in dev/local/test environments. Current environment: '{env}'."
        )
        sys.exit(1)


def get_or_create_user(
    db: SessionLocal,
    email: str,
    full_name: str,
    role: str,
    password: str = SEED_PASSWORD,
    phone: str | None = None,
) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        user = User(
            id=uuid4(),
            email=email,
            password_hash=get_password_hash(password),
            role=role,
            is_active=True,
        )
        db.add(user)
        db.flush()
    else:
        user.password_hash = get_password_hash(password)
        user.role = role
        user.is_active = True
        db.flush()

    if role == "citizen":
        prof = db.get(CitizenProfile, user.id)
        if not prof:
            prof = CitizenProfile(
                user_id=user.id,
                full_name=full_name,
                phone=phone or "9876543210",
                address_text="Kerala, India",
            )
            db.add(prof)
            db.flush()
    return user


def seed_database():
    verify_dev_environment()

    print("==================================================================")
    print("  SAHAYA - Akshaya Service Assistance Development Seeder")
    print("==================================================================")

    # 1. Run baseline service catalog seeding
    print("\n[1/5] Seeding Services & Catalog...")
    seed_services()

    db = SessionLocal()
    try:
        # 2. Get Centres
        print("\n[2/5] Setting up Akshaya Centres...")
        centre_a = db.scalar(select(AkshayaCentre).where(AkshayaCentre.code == "AKC_EKM_01"))
        centre_b = db.scalar(select(AkshayaCentre).where(AkshayaCentre.code == "AKC_TVM_01"))

        if not centre_a:
            centre_a = AkshayaCentre(
                id=uuid4(),
                name="Akshaya Centre Kochi (Kaloor)",
                code="AKC_EKM_01",
                address_text="Near Kaloor Metro Station, Kochi",
                locality="Kaloor",
                district="Ernakulam",
                pincode="682017",
                is_active=True,
            )
            db.add(centre_a)
            db.flush()

        if not centre_b:
            centre_b = AkshayaCentre(
                id=uuid4(),
                name="Akshaya Centre Thiruvananthapuram (Pattom)",
                code="AKC_TVM_01",
                address_text="Ground Floor, Pattom Palace Building, TVM",
                locality="Pattom",
                district="Thiruvananthapuram",
                pincode="695004",
                is_active=True,
            )
            db.add(centre_b)
            db.flush()

        db.commit()

        # 3. Seed Users & Profiles
        print("\n[3/5] Seeding System Users & Roles...")

        # System Administrator
        admin_user = get_or_create_user(
            db,
            email="admin@akshaya.test",
            full_name="System Administrator",
            role="system_administrator",
        )

        # Centre Administrator (Centre A)
        cad_user = get_or_create_user(
            db,
            email="admin.kaloor@akshaya.test",
            full_name="Kaloor Centre Administrator",
            role="centre_administrator",
        )
        cad_prof = db.get(CentreAdministrator, cad_user.id)
        if not cad_prof:
            cad_prof = CentreAdministrator(
                user_id=cad_user.id,
                centre_id=centre_a.id,
                full_name="Kaloor Centre Administrator",
            )
            db.add(cad_prof)

        # Centre A Employees (Approved)
        emp1_a = get_or_create_user(
            db,
            email="employee1.ernakulam@akshaya.test",
            full_name="Rahul Nair (Senior Associate)",
            role="centre_employee",
        )
        emp1_prof = db.get(EmployeeProfile, emp1_a.id)
        if not emp1_prof:
            emp1_prof = EmployeeProfile(
                user_id=emp1_a.id,
                centre_id=centre_a.id,
                full_name="Rahul Nair (Senior Associate)",
                max_active_requests=10,
                is_available=True,
                approval_status="APPROVED",
            )
            db.add(emp1_prof)
        else:
            emp1_prof.approval_status = "APPROVED"
            emp1_prof.centre_id = centre_a.id

        emp2_a = get_or_create_user(
            db,
            email="employee2.ernakulam@akshaya.test",
            full_name="Ananya Menon (Verification Officer)",
            role="centre_employee",
        )
        emp2_prof = db.get(EmployeeProfile, emp2_a.id)
        if not emp2_prof:
            emp2_prof = EmployeeProfile(
                user_id=emp2_a.id,
                centre_id=centre_a.id,
                full_name="Ananya Menon (Verification Officer)",
                max_active_requests=10,
                is_available=True,
                approval_status="APPROVED",
            )
            db.add(emp2_prof)
        else:
            emp2_prof.approval_status = "APPROVED"
            emp2_prof.centre_id = centre_a.id

        # Centre B Employee (Approved)
        emp1_b = get_or_create_user(
            db,
            email="employee1.tvm@akshaya.test",
            full_name="Kavitha Pillai (TVM Staff)",
            role="centre_employee",
        )
        emp1_b_prof = db.get(EmployeeProfile, emp1_b.id)
        if not emp1_b_prof:
            emp1_b_prof = EmployeeProfile(
                user_id=emp1_b.id,
                centre_id=centre_b.id,
                full_name="Kavitha Pillai (TVM Staff)",
                max_active_requests=10,
                is_available=True,
                approval_status="APPROVED",
            )
            db.add(emp1_b_prof)
        else:
            emp1_b_prof.approval_status = "APPROVED"
            emp1_b_prof.centre_id = centre_b.id

        # Centre A Pending Employee
        emp_pend = get_or_create_user(
            db,
            email="employee.pending@akshaya.test",
            full_name="Sujith Kumar (Pending Trainee)",
            role="centre_employee",
        )
        emp_pend_prof = db.get(EmployeeProfile, emp_pend.id)
        if not emp_pend_prof:
            emp_pend_prof = EmployeeProfile(
                user_id=emp_pend.id,
                centre_id=centre_a.id,
                full_name="Sujith Kumar (Pending Trainee)",
                max_active_requests=10,
                is_available=True,
                approval_status="PENDING_APPROVAL",
            )
            db.add(emp_pend_prof)
        else:
            emp_pend_prof.approval_status = "PENDING_APPROVAL"
            emp_pend_prof.centre_id = centre_a.id

        # Citizens
        cit1 = get_or_create_user(
            db,
            email="citizen.anand@test.com",
            full_name="Anand Chandran",
            role="citizen",
            phone="9847123456",
        )
        cit2 = get_or_create_user(
            db,
            email="citizen.meera@test.com",
            full_name="Meera Varma",
            role="citizen",
            phone="9847234567",
        )
        cit3 = get_or_create_user(
            db,
            email="citizen.gopika@test.com",
            full_name="Gopika Suresh",
            role="citizen",
            phone="9847345678",
        )

        db.commit()

        # 4. Get active services
        print("\n[4/5] Linking Supported Services...")
        services = db.scalars(select(Service).where(Service.is_active.is_(True))).all()
        if not services:
            print("ERROR: No active services found after running seed_services.")
            return

        service_map = {s.name: s for s in services}
        income_cert = service_map.get("Income Certificate") or services[0]
        caste_cert = service_map.get("Community Certificate") or (services[1] if len(services) > 1 else services[0])
        ration_card = service_map.get("Ration Card Application") or (services[2] if len(services) > 2 else services[0])

        for s in [income_cert, caste_cert, ration_card]:
            for c in [centre_a, centre_b]:
                css = db.scalar(
                    select(CentreSupportedService).where(
                        CentreSupportedService.centre_id == c.id,
                        CentreSupportedService.service_id == s.id,
                    )
                )
                if not css:
                    db.add(CentreSupportedService(centre_id=c.id, service_id=s.id, is_active=True))
        db.commit()

        # 5. Seed requests across every lifecycle status
        print("\n[5/5] Seeding Requests Across All Lifecycle States...")
        now = datetime.now(UTC)

        def create_seed_request(
            title_marker: str,
            citizen: User,
            service: Service,
            centre: AkshayaCentre,
            status: str,
            assigned_employee: User | None = None,
            created_offset_hours: int = 10,
            completed_today: bool = False,
            rejected_days_ago: int | None = None,
            reuploaded_doc: bool = False,
        ) -> ServiceRequest:
            created_at = now - timedelta(hours=created_offset_hours)
            completed_at = None
            if completed_today:
                kolkata_tz = ZoneInfo("Asia/Kolkata")
                now_kolkata = datetime.now(kolkata_tz)
                start_of_day_kolkata = datetime(
                    now_kolkata.year, now_kolkata.month, now_kolkata.day, tzinfo=kolkata_tz
                )
                completed_at = start_of_day_kolkata.astimezone(UTC) + timedelta(hours=1)

            updated_at = created_at
            if rejected_days_ago:
                updated_at = now - timedelta(days=rejected_days_ago)
            elif completed_today:
                updated_at = completed_at

            # Idempotency check: find request by marker in history or snapshot
            marker_str = f"SEED:{title_marker}"
            existing_history = db.scalar(
                select(RequestHistory).where(RequestHistory.note.like(f"%{marker_str}%"))
            )
            if existing_history:
                req = db.get(ServiceRequest, existing_history.request_id)
                if req:
                    req.status = status
                    req.selected_centre_id = centre.id
                    req.updated_at = updated_at
                    if completed_at:
                        req.completed_at = completed_at
                    db.add(req)
                    db.commit()
                    return req

            req = ServiceRequest(
                id=uuid4(),
                citizen_id=citizen.id,
                service_id=service.id,
                selected_centre_id=centre.id,
                status=status,
                service_type_snapshot=service.service_type,
                service_name_snapshot=service.name,
                fee_snapshot=service.base_fee or Decimal("120.00"),
                submitted_at=created_at,
                completed_at=completed_at,
                created_at=created_at,
                updated_at=updated_at,
            )
            db.add(req)
            db.flush()

            # Record creation history
            db.add(
                RequestHistory(
                    id=uuid4(),
                    request_id=req.id,
                    actor_id=citizen.id,
                    action=RequestAction.SUBMIT_REQUEST,
                    from_status="SUBMITTED",
                    to_status="WAITING_FOR_CENTRE",
                    note=f"Submitted application [{marker_str}]",
                    created_at=created_at,
                )
            )

            # Assignment if applicable
            if assigned_employee:
                db.add(
                    RequestAssignment(
                        id=uuid4(),
                        request_id=req.id,
                        employee_id=assigned_employee.id,
                        is_active=True,
                        assigned_at=created_at + timedelta(minutes=15),
                    )
                )
                db.add(
                    RequestHistory(
                        id=uuid4(),
                        request_id=req.id,
                        actor_id=assigned_employee.id,
                        action=RequestAction.ACCEPT,
                        from_status="WAITING_FOR_CENTRE",
                        to_status=status if status in ["ACCEPTED", "UNDER_REVIEW"] else "ACCEPTED",
                        note="Accepted into employee queue",
                        created_at=created_at + timedelta(minutes=15),
                    )
                )

            # Re-uploaded document for Needs Attention priority 1
            if reuploaded_doc:
                # Find or create doc requirement
                req_def = db.scalar(
                    select(ServiceDocumentRequirement).where(
                        ServiceDocumentRequirement.service_id == service.id,
                        ServiceDocumentRequirement.is_active.is_(True),
                    )
                )
                if req_def:
                    doc = RequestDocument(
                        id=uuid4(),
                        request_id=req.id,
                        requirement_id=req_def.id,
                        uploaded_by_id=citizen.id,
                        storage_key=f"seed/{req.id}/doc_v2.pdf",
                        original_filename="corrected_salary_slip.pdf",
                        content_type="application/pdf",
                        size_bytes=245000,
                        sha256="0" * 64,
                        version=2,
                        is_current=True,
                        uploaded_at=now - timedelta(minutes=30),
                    )
                    db.add(doc)

            # Additional state artifacts
            if status == "PAYMENT_PENDING":
                db.add(
                    RequestPayment(
                        id=uuid4(),
                        request_id=req.id,
                        amount=Decimal("120.00"),
                        currency="INR",
                        status="PENDING",
                        provider="mock",
                        provider_reference=f"PAY_MOCK_{uuid4().hex[:8].upper()}",
                        requested_at=now - timedelta(hours=1),
                    )
                )

            if status in ["INTERACTION_REQUIRED", "INTERACTION_SCHEDULED"]:
                req_int = db.scalar(
                    select(ServiceInteractionRequirement).where(
                        ServiceInteractionRequirement.service_id == service.id,
                        ServiceInteractionRequirement.is_active.is_(True),
                    )
                )
                if not req_int:
                    req_int = ServiceInteractionRequirement(
                        id=uuid4(),
                        service_id=service.id,
                        name="Biometric Verification",
                        description="Physical biometric authentication at centre",
                        is_mandatory=True,
                        is_active=True,
                    )
                    db.add(req_int)
                    db.flush()

                db.add(
                    RequestInteraction(
                        id=uuid4(),
                        request_id=req.id,
                        requirement_id=req_int.id,
                        requested_by_id=assigned_employee.id if assigned_employee else emp1_a.id,
                        status="SCHEDULED" if status == "INTERACTION_SCHEDULED" else "REQUESTED",
                        reason="Citizen must appear in-person for iris & fingerprint verification.",
                        scheduled_at=now + timedelta(days=2) if status == "INTERACTION_SCHEDULED" else None,
                        created_at=now - timedelta(hours=2),
                    )
                )

            if status == "COMPLETED":
                existing_output = db.scalar(
                    select(CompletedOutput).where(CompletedOutput.request_id == req.id)
                )
                if not existing_output:
                    db.add(
                        CompletedOutput(
                            id=uuid4(),
                            request_id=req.id,
                            created_by_id=assigned_employee.id if assigned_employee else emp1_a.id,
                            original_filename="income_certificate_signed.pdf",
                            content_type="application/pdf",
                            storage_key=f"outputs/{req.id}/cert.pdf",
                            collection_instructions="Digital copy signed by Tahsildar. Physical attested printout can be collected from Kaloor Akshaya Centre during working hours (9 AM - 5 PM).",
                            created_at=completed_at or now,
                        )
                    )

            if status == "UNABLE_TO_PROCEED":
                db.add(
                    RequestHistory(
                        id=uuid4(),
                        request_id=req.id,
                        actor_id=assigned_employee.id if assigned_employee else emp1_a.id,
                        action=RequestAction.UNABLE_TO_PROCEED,
                        from_status="UNDER_REVIEW",
                        to_status="UNABLE_TO_PROCEED",
                        note="Applicant residential address does not fall within Ernakulam Taluk jurisdiction. Please apply through your local centre.",
                        created_at=updated_at,
                    )
                )

            db.commit()
            return req

        # Create all states
        print("  - Creating WAITING_FOR_CENTRE request...")
        create_seed_request("WFC", cit1, income_cert, centre_a, "WAITING_FOR_CENTRE", created_offset_hours=24)

        print("  - Creating ACCEPTED request...")
        create_seed_request("ACC", cit2, caste_cert, centre_a, "ACCEPTED", assigned_employee=emp1_a, created_offset_hours=18)

        print("  - Creating UNDER_REVIEW request (with re-uploaded doc v2)...")
        create_seed_request("REV_REUP", cit3, income_cert, centre_a, "UNDER_REVIEW", assigned_employee=emp1_a, created_offset_hours=12, reuploaded_doc=True)

        print("  - Creating CORRECTION_REQUIRED request...")
        create_seed_request("CORR", cit1, caste_cert, centre_a, "CORRECTION_REQUIRED", assigned_employee=emp1_a, created_offset_hours=16)

        print("  - Creating READY_FOR_PROCESSING request...")
        create_seed_request("READY", cit2, income_cert, centre_a, "READY_FOR_PROCESSING", assigned_employee=emp2_a, created_offset_hours=8)

        print("  - Creating PROCESSING request...")
        create_seed_request("PROC", cit3, ration_card, centre_a, "PROCESSING", assigned_employee=emp2_a, created_offset_hours=6)

        print("  - Creating PAYMENT_PENDING request...")
        create_seed_request("PAY", cit1, ration_card, centre_a, "PAYMENT_PENDING", assigned_employee=emp1_a, created_offset_hours=5)

        print("  - Creating INTERACTION_REQUIRED request...")
        create_seed_request("INT_REQ", cit2, ration_card, centre_a, "INTERACTION_REQUIRED", assigned_employee=emp1_a, created_offset_hours=4)

        print("  - Creating INTERACTION_SCHEDULED request...")
        create_seed_request("INT_SCHED", cit3, ration_card, centre_a, "INTERACTION_SCHEDULED", assigned_employee=emp1_a, created_offset_hours=3)

        print("  - Creating COMPLETED request (Completed Today)...")
        create_seed_request("COMPL", cit1, income_cert, centre_a, "COMPLETED", assigned_employee=emp1_a, completed_today=True)

        print("  - Creating UNABLE_TO_PROCEED request (Rejected last 5 days)...")
        create_seed_request("REJ", cit2, income_cert, centre_a, "UNABLE_TO_PROCEED", assigned_employee=emp1_a, rejected_days_ago=5)

        print("  - Creating CANCELLED request...")
        create_seed_request("CANC", cit3, caste_cert, centre_a, "CANCELLED", created_offset_hours=30)

        print("  - Creating Centre B request (Isolation test)...")
        create_seed_request("CENTRE_B_WFC", cit1, income_cert, centre_b, "WAITING_FOR_CENTRE", created_offset_hours=10)

        print("\n[SUCCESS] All seed data created successfully!")

        # Print Credential Layout Summary
        print("\n" + "=" * 70)
        print("  SAHAYA SEED CREDENTIALS & TEST LAYOUT SUMMARY")
        print("=" * 70)
        print(f"Default Password for all test accounts: {SEED_PASSWORD}\n")
        print("AKSHAYA CENTRES:")
        print(f"  Centre A: {centre_a.name} (Code: {centre_a.code}) - ID: {centre_a.id}")
        print(f"  Centre B: {centre_b.name} (Code: {centre_b.code}) - ID: {centre_b.id}\n")

        print("ADMINISTRATORS:")
        print("  [System Admin]       email: admin@akshaya.test")
        print(f"  [Centre Admin (A)]   email: admin.kaloor@akshaya.test (Centre: {centre_a.name})\n")

        print("CENTRE EMPLOYEES:")
        print(f"  [Emp 1 Approved (A)] email: employee1.ernakulam@akshaya.test (Centre: {centre_a.name})")
        print(f"  [Emp 2 Approved (A)] email: employee2.ernakulam@akshaya.test (Centre: {centre_a.name})")
        print(f"  [Emp 1 Approved (B)] email: employee1.tvm@akshaya.test       (Centre: {centre_b.name})")
        print(f"  [Emp Pending (A)]    email: employee.pending@akshaya.test   (Status: PENDING_APPROVAL)\n")

        print("CITIZENS:")
        print("  [Citizen 1]          email: citizen.anand@test.com  (Anand Chandran)")
        print("  [Citizen 2]          email: citizen.meera@test.com  (Meera Varma)")
        print("  [Citizen 3]          email: citizen.gopika@test.com (Gopika Suresh)\n")

        print("REQUESTS SUMMARY:")
        print("  Centre A Requests: 12 requests across all states (Waiting, Accepted, In-Review with")
        print("                     re-uploaded v2 doc, Correction, Ready, Processing, Payment,")
        print("                     Interaction Req/Sched, Completed Today, Rejected last 30d, Cancelled)")
        print("  Centre B Requests: 1 WAITING_FOR_CENTRE (isolated from Centre A dashboard)")
        print("=" * 70 + "\n")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
