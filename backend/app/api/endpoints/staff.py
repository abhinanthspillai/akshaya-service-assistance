from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, CurrentUserSysAdmin, SessionDep
from app.core.security import get_password_hash
from app.core.audit import log_audit
from app.models.centre import AkshayaCentre
from app.models.profile import CentreAdministrator, EmployeeProfile
from app.models.user import User
from app.schemas.staff import (
    CentreAdminResponse,
    EmployeeResponse,
    StaffCreate,
    StaffStatusUpdate,
    UserStaffResponse,
)

router = APIRouter()


def _ensure_centre_exists(session: SessionDep, centre_id: UUID) -> None:
    centre = session.get(AkshayaCentre, centre_id)
    if not centre or not centre.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Centre not found or inactive",
        )


@router.post("/centres/{centre_id}/employees", response_model=EmployeeResponse, status_code=201)
def create_employee(
    *,
    session: SessionDep,
    centre_id: UUID,
    employee_in: StaffCreate,
    current_user: CurrentUser,
) -> Any:
    if current_user.role == "system_administrator":
        pass
    elif current_user.role == "centre_administrator":
        admin_profile = session.get(CentreAdministrator, current_user.id)
        if not admin_profile or admin_profile.centre_id != centre_id:
            raise HTTPException(status_code=403, detail="Not authorized to manage this centre")
    else:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    _ensure_centre_exists(session, centre_id)

    if session.scalar(select(User).where(User.email == employee_in.email)):
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=employee_in.email,
        password_hash=get_password_hash(employee_in.password),
        role="centre_employee",
    )
    session.add(user)
    session.flush()

    profile = EmployeeProfile(
        user_id=user.id,
        centre_id=centre_id,
        full_name=employee_in.full_name,
    )
    session.add(profile)
    log_audit(
        session,
        actor_id=current_user.id,
        action="create_employee",
        target_resource_type="User",
        target_resource_id=user.id,
        details={"email": user.email, "centre_id": str(centre_id)}
    )
    session.commit()
    session.refresh(user)
    session.refresh(profile)

    return {"user": user, "profile": profile}


@router.post(
    "/centres/{centre_id}/administrators", response_model=CentreAdminResponse, status_code=201
)
def create_centre_admin(
    *,
    session: SessionDep,
    centre_id: UUID,
    admin_in: StaffCreate,
    current_user: CurrentUserSysAdmin,
) -> Any:
    _ensure_centre_exists(session, centre_id)

    if session.scalar(select(User).where(User.email == admin_in.email)):
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=admin_in.email,
        password_hash=get_password_hash(admin_in.password),
        role="centre_administrator",
    )
    session.add(user)
    session.flush()

    profile = CentreAdministrator(
        user_id=user.id,
        centre_id=centre_id,
        full_name=admin_in.full_name,
    )
    session.add(profile)
    log_audit(
        session,
        actor_id=current_user.id,
        action="create_centre_admin",
        target_resource_type="User",
        target_resource_id=user.id,
        details={"email": user.email, "centre_id": str(centre_id)}
    )
    session.commit()
    session.refresh(user)
    session.refresh(profile)

    return {"user": user, "profile": profile}


@router.patch("/users/{user_id}/status", response_model=UserStaffResponse)
def update_user_status(
    *,
    session: SessionDep,
    user_id: UUID,
    status_in: StaffStatusUpdate,
    current_user: CurrentUser,
) -> Any:
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user.role == "system_administrator":
        pass
    elif current_user.role == "centre_administrator":
        if target_user.role != "centre_employee":
            raise HTTPException(status_code=403, detail="Can only manage centre employees")
        admin_profile = session.get(CentreAdministrator, current_user.id)
        employee_profile = session.get(EmployeeProfile, target_user.id)
        if (
            not admin_profile
            or not employee_profile
            or admin_profile.centre_id != employee_profile.centre_id
        ):
            raise HTTPException(status_code=403, detail="Not authorized to manage this employee")
    else:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    target_user.is_active = status_in.is_active
    session.add(target_user)
    log_audit(
        session,
        actor_id=current_user.id,
        action="update_user_status",
        target_resource_type="User",
        target_resource_id=target_user.id,
        details={"email": target_user.email, "is_active": status_in.is_active}
    )
    session.commit()
    session.refresh(target_user)
    return target_user
