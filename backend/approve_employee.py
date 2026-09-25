import os
import sys
from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models.profile import EmployeeProfile
from app.models.user import User


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python approve_employee.py <email>")
        sys.exit(1)

    email = sys.argv[1].strip()

    # Fail-closed guard: runs only if ENVIRONMENT is explicitly dev, local, test, or development
    settings = get_settings()
    env = (os.environ.get("ENVIRONMENT") or settings.app_env or "").lower()
    allowed_envs = {"dev", "local", "test", "development"}
    if env not in allowed_envs:
        print(f"Error: approve_employee.py can only run in dev, local, or test environments (current: '{env}'). Refusing execution.")
        sys.exit(1)

    session = SessionLocal()
    try:
        user = session.scalar(select(User).where(User.email == email))
        if not user:
            print(f"Error: User with email '{email}' not found.")
            sys.exit(1)

        if user.role != "centre_employee":
            print(f"Error: User '{email}' has role '{user.role}', not 'centre_employee'.")
            sys.exit(1)

        profile = session.scalar(select(EmployeeProfile).where(EmployeeProfile.user_id == user.id))
        if not profile:
            print(f"Error: EmployeeProfile for user '{email}' not found.")
            sys.exit(1)

        old_status = profile.approval_status
        if old_status == "APPROVED":
            print(f"Employee '{email}' is already APPROVED.")
            return

        profile.approval_status = "APPROVED"
        session.add(profile)
        session.commit()

        print(f"SUCCESS: Employee '{email}' approval status updated:")
        print(f"  User ID: {user.id}")
        print(f"  Full Name: {profile.full_name}")
        print(f"  Centre ID: {profile.centre_id}")
        print(f"  Approval Status: {old_status} -> APPROVED")
    finally:
        session.close()


if __name__ == "__main__":
    main()
