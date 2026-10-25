"""One-off script to seed demo accounts in the hosted database specified by DATABASE_URL.

Creates four demo accounts:
1. System Administrator
2. Centre Manager (Centre Administrator, assigned to existing centre AKC_TVM_01)
3. Centre Staff (EmployeeProfile, APPROVED, assigned to existing centre AKC_TVM_01)
4. Citizen (CitizenProfile)

Passwords are read strictly from environment variables:
- SEED_ADMIN_PASSWORD
- SEED_MANAGER_PASSWORD
- SEED_STAFF_PASSWORD
- SEED_CITIZEN_PASSWORD
"""

import os
import sys
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.engine import make_url

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.centre import AkshayaCentre
from app.models.profile import CentreAdministrator, CitizenProfile, EmployeeProfile
from app.models.user import User

MIN_PASSWORD_LENGTH = 12

DEMO_ACCOUNTS = [
    {
        "role": "system_administrator",
        "email": "admin@sahaya.demo",
        "full_name": "System Administrator",
        "env_var": "SEED_ADMIN_PASSWORD",
    },
    {
        "role": "centre_administrator",
        "email": "manager.tvm@sahaya.demo",
        "full_name": "Pattom Centre Manager",
        "env_var": "SEED_MANAGER_PASSWORD",
    },
    {
        "role": "centre_employee",
        "email": "staff.tvm@sahaya.demo",
        "full_name": "Pattom Centre Staff",
        "env_var": "SEED_STAFF_PASSWORD",
    },
    {
        "role": "citizen",
        "email": "citizen@sahaya.demo",
        "full_name": "Demo Citizen",
        "env_var": "SEED_CITIZEN_PASSWORD",
    },
]


def validate_passwords() -> dict[str, str]:
    passwords: dict[str, str] = {}
    missing_or_short: list[str] = []

    for acc in DEMO_ACCOUNTS:
        env_var = acc["env_var"]
        val = os.environ.get(env_var, "").strip()
        if len(val) < MIN_PASSWORD_LENGTH:
            missing_or_short.append(
                f"  - {env_var}: must be set and at least {MIN_PASSWORD_LENGTH} characters"
            )
        else:
            passwords[env_var] = val

    if missing_or_short:
        print("ERROR: Password validation failed for hosted seeder:")
        for msg in missing_or_short:
            print(msg)
        sys.exit(1)

    return passwords


def prompt_confirmation(database_url: str) -> None:
    try:
        url = make_url(database_url)
        host = url.host or "localhost"
        port = f":{url.port}" if url.port else ""
        db_name = url.database or "<unknown>"
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: Unable to parse DATABASE_URL: {exc}")
        sys.exit(1)

    print("=" * 60)
    print("  HOSTED DATABASE SEEDING - CONFIRMATION")
    print("=" * 60)
    print(f"Target Database Host : {host}{port}")
    print(f"Target Database Name : {db_name}")
    print("=" * 60)

    response = input("Type 'YES' to proceed with seeding demo accounts: ").strip()
    if response != "YES":
        print("Aborted by user. No changes were made.")
        sys.exit(0)


def seed_hosted_users() -> None:
    passwords = validate_passwords()

    settings = get_settings()
    db_url = os.environ.get("DATABASE_URL") or settings.database_url
    prompt_confirmation(db_url)

    db = SessionLocal()
    try:
        centre = db.scalar(select(AkshayaCentre).where(AkshayaCentre.code == "AKC_TVM_01"))
        if not centre:
            print(
                "ERROR: Required centre with code 'AKC_TVM_01' not found in database. "
                "Please run service/centre seed first."
            )
            sys.exit(1)

        print(f"\nUsing Centre: {centre.name} (Code: {centre.code}, ID: {centre.id})")

        for acc in DEMO_ACCOUNTS:
            email = acc["email"]
            role = acc["role"]
            full_name = acc["full_name"]
            pwd = passwords[acc["env_var"]]

            existing_user = db.scalar(select(User).where(User.email == email))
            if existing_user:
                print(f"[SKIP] User already exists: {email} (Role: {existing_user.role})")
                continue

            user = User(
                id=uuid4(),
                email=email,
                password_hash=get_password_hash(pwd),
                role=role,
                is_active=True,
            )
            db.add(user)
            db.flush()

            if role == "citizen":
                prof = CitizenProfile(
                    user_id=user.id,
                    full_name=full_name,
                    phone="9876543210",
                    address_text="Thiruvananthapuram, Kerala, India",
                )
                db.add(prof)
            elif role == "centre_administrator":
                cad = CentreAdministrator(
                    user_id=user.id,
                    centre_id=centre.id,
                    full_name=full_name,
                    approval_status="APPROVED",
                )
                db.add(cad)
            elif role == "centre_employee":
                emp = EmployeeProfile(
                    user_id=user.id,
                    centre_id=centre.id,
                    full_name=full_name,
                    max_active_requests=10,
                    is_available=True,
                    approval_status="APPROVED",
                )
                db.add(emp)

            db.commit()
            print(f"[CREATED] User: {email} | Role: {role} | Full Name: {full_name}")

        print("\nHosted demo user seeding complete.")

    except Exception as exc:
        db.rollback()
        print(f"\nERROR during seeding: {exc}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_hosted_users()
