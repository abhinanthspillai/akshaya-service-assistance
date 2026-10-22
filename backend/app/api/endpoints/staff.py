from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, CurrentUserSysAdmin, SessionDep
from app.core.audit import log_audit
from app.core.security import get_password_hash
from app.models.centre import AkshayaCentre
from app.models.profile import CentreAdministrator, EmployeeProfile
from app.models.user import User
from app.schemas.staff import (
    AccountRejectRequest,
    AccountRequestResponse,
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
        approval_status="APPROVED",
    )
    session.add(profile)
    log_audit(
        session,
        actor_id=current_user.id,
        action="create_employee",
        target_resource_type="User",
        target_resource_id=user.id,
        details={"email": user.email, "centre_id": str(centre_id)},
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
        details={"email": user.email, "centre_id": str(centre_id)},
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
        details={"email": target_user.email, "is_active": status_in.is_active},
    )
    session.commit()
    session.refresh(target_user)
    return target_user


@router.get("/account-requests", response_model=list[AccountRequestResponse])
def list_account_requests(
    *,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    results: list[AccountRequestResponse] = []

    if current_user.role == "system_administrator":
        # 1. Staff requests (all centres)
        emp_reqs = session.execute(
            select(EmployeeProfile, User, AkshayaCentre)
            .join(User, EmployeeProfile.user_id == User.id)
            .join(AkshayaCentre, EmployeeProfile.centre_id == AkshayaCentre.id)
            .where(EmployeeProfile.approval_status == "PENDING_APPROVAL")
            .order_by(EmployeeProfile.created_at.asc())
        ).all()
        for emp, user, centre in emp_reqs:
            results.append(
                AccountRequestResponse(
                    id=emp.user_id,
                    user_id=user.id,
                    full_name=emp.full_name,
                    email=user.email,
                    role="centre_employee",
                    centre_id=centre.id,
                    centre_name=centre.name,
                    centre_code=centre.code,
                    approval_status=emp.approval_status,
                    created_at=emp.created_at,
                )
            )

        # 2. Manager requests (System Admin only)
        mgr_reqs = session.execute(
            select(CentreAdministrator, User, AkshayaCentre)
            .join(User, CentreAdministrator.user_id == User.id)
            .join(AkshayaCentre, CentreAdministrator.centre_id == AkshayaCentre.id)
            .where(CentreAdministrator.approval_status == "PENDING_APPROVAL")
            .order_by(CentreAdministrator.created_at.asc())
        ).all()
        for mgr, user, centre in mgr_reqs:
            results.append(
                AccountRequestResponse(
                    id=mgr.user_id,
                    user_id=user.id,
                    full_name=mgr.full_name,
                    email=user.email,
                    role="centre_administrator",
                    centre_id=centre.id,
                    centre_name=centre.name,
                    centre_code=centre.code,
                    approval_status=mgr.approval_status,
                    created_at=mgr.created_at,
                )
            )

    elif current_user.role == "centre_administrator":
        admin_prof = session.get(CentreAdministrator, current_user.id)
        if not admin_prof or admin_prof.approval_status != "APPROVED":
            raise HTTPException(status_code=403, detail="Not an active centre administrator")

        # Staff requests for THIS centre only (Managers never see or approve manager requests)
        emp_reqs = session.execute(
            select(EmployeeProfile, User, AkshayaCentre)
            .join(User, EmployeeProfile.user_id == User.id)
            .join(AkshayaCentre, EmployeeProfile.centre_id == AkshayaCentre.id)
            .where(
                EmployeeProfile.approval_status == "PENDING_APPROVAL",
                EmployeeProfile.centre_id == admin_prof.centre_id,
            )
            .order_by(EmployeeProfile.created_at.asc())
        ).all()
        for emp, user, centre in emp_reqs:
            results.append(
                AccountRequestResponse(
                    id=emp.user_id,
                    user_id=user.id,
                    full_name=emp.full_name,
                    email=user.email,
                    role="centre_employee",
                    centre_id=centre.id,
                    centre_name=centre.name,
                    centre_code=centre.code,
                    approval_status=emp.approval_status,
                    created_at=emp.created_at,
                )
            )
    else:
        raise HTTPException(status_code=403, detail="Not authorized to view account requests")

    return results


@router.post("/account-requests/{target_user_id}/approve", status_code=200)
def approve_account_request(
    *,
    session: SessionDep,
    target_user_id: UUID,
    current_user: CurrentUser,
) -> Any:
    target_user = session.get(User, target_user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.role == "centre_employee":
        emp_profile = session.get(EmployeeProfile, target_user_id)
        if not emp_profile:
            raise HTTPException(status_code=404, detail="Employee profile not found")
        if emp_profile.approval_status != "PENDING_APPROVAL":
            raise HTTPException(
                status_code=409, detail=f"Request already processed ({emp_profile.approval_status})"
            )

        # Check authorization
        if current_user.role == "system_administrator":
            pass
        elif current_user.role == "centre_administrator":
            admin_prof = session.get(CentreAdministrator, current_user.id)
            if not admin_prof or admin_prof.centre_id != emp_profile.centre_id:
                raise HTTPException(status_code=403, detail="Not authorized for this centre")
        else:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        emp_profile.approval_status = "APPROVED"
        session.add(emp_profile)
        log_audit(
            session,
            actor_id=current_user.id,
            action="approve_employee_account",
            target_resource_type="User",
            target_resource_id=target_user_id,
            details={"email": target_user.email, "centre_id": str(emp_profile.centre_id)},
        )

    elif target_user.role == "centre_administrator":
        # Only System Admin can approve a Centre Administrator
        if current_user.role != "system_administrator":
            raise HTTPException(
                status_code=403, detail="Only System Admin can approve Centre Manager accounts"
            )

        admin_profile = session.get(CentreAdministrator, target_user_id)
        if not admin_profile:
            raise HTTPException(status_code=404, detail="Centre administrator profile not found")
        if admin_profile.approval_status != "PENDING_APPROVAL":
            raise HTTPException(
                status_code=409,
                detail=f"Request already processed ({admin_profile.approval_status})",
            )

        # Verify no other manager was approved in the meantime
        other_active = session.scalar(
            select(CentreAdministrator).where(
                CentreAdministrator.centre_id == admin_profile.centre_id,
                CentreAdministrator.user_id != target_user_id,
                CentreAdministrator.approval_status == "APPROVED",
            )
        )
        if other_active:
            raise HTTPException(
                status_code=409, detail="A manager has already been approved for this centre"
            )

        admin_profile.approval_status = "APPROVED"
        session.add(admin_profile)
        log_audit(
            session,
            actor_id=current_user.id,
            action="approve_centre_admin_account",
            target_resource_type="User",
            target_resource_id=target_user_id,
            details={"email": target_user.email, "centre_id": str(admin_profile.centre_id)},
        )
    else:
        raise HTTPException(status_code=400, detail="User is not a staff or manager account")

    session.commit()
    return {"message": "Account approved successfully"}


@router.post("/account-requests/{target_user_id}/reject", status_code=200)
def reject_account_request(
    *,
    session: SessionDep,
    target_user_id: UUID,
    reject_in: AccountRejectRequest | None = None,
    current_user: CurrentUser,
) -> Any:
    target_user = session.get(User, target_user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    reason = reject_in.reason if reject_in else None

    if target_user.role == "centre_employee":
        emp_profile = session.get(EmployeeProfile, target_user_id)
        if not emp_profile:
            raise HTTPException(status_code=404, detail="Employee profile not found")
        if emp_profile.approval_status != "PENDING_APPROVAL":
            raise HTTPException(
                status_code=409, detail=f"Request already processed ({emp_profile.approval_status})"
            )

        if current_user.role == "system_administrator":
            pass
        elif current_user.role == "centre_administrator":
            admin_prof = session.get(CentreAdministrator, current_user.id)
            if not admin_prof or admin_prof.centre_id != emp_profile.centre_id:
                raise HTTPException(status_code=403, detail="Not authorized for this centre")
        else:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        emp_profile.approval_status = "REJECTED"
        session.add(emp_profile)
        log_audit(
            session,
            actor_id=current_user.id,
            action="reject_employee_account",
            target_resource_type="User",
            target_resource_id=target_user_id,
            details={"email": target_user.email, "reason": reason},
        )

    elif target_user.role == "centre_administrator":
        if current_user.role != "system_administrator":
            raise HTTPException(
                status_code=403, detail="Only System Admin can reject Centre Manager accounts"
            )

        admin_profile = session.get(CentreAdministrator, target_user_id)
        if not admin_profile:
            raise HTTPException(status_code=404, detail="Centre administrator profile not found")
        if admin_profile.approval_status != "PENDING_APPROVAL":
            raise HTTPException(
                status_code=409,
                detail=f"Request already processed ({admin_profile.approval_status})",
            )

        admin_profile.approval_status = "REJECTED"
        session.add(admin_profile)
        log_audit(
            session,
            actor_id=current_user.id,
            action="reject_centre_admin_account",
            target_resource_type="User",
            target_resource_id=target_user_id,
            details={"email": target_user.email, "reason": reason},
        )
    else:
        raise HTTPException(status_code=400, detail="User is not a staff or manager account")

    session.commit()
    return {"message": "Account request rejected successfully"}
