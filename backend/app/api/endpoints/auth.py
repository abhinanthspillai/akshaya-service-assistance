from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.core.audit import log_audit
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.centre import AkshayaCentre
from app.models.notification import Notification
from app.models.profile import CentreAdministrator, CitizenProfile, EmployeeProfile
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import ResetPasswordRequest, UserAuthMe, UserRead, UserRegister

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, session: SessionDep) -> User:
    # Check if email exists
    existing_user = session.scalar(select(User).where(User.email == user_in.email))
    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email already registered",
        )

    # Validate role: only 'citizen', 'centre_employee', and 'centre_administrator' are permitted
    if user_in.role not in ("citizen", "centre_employee", "centre_administrator"):
        raise HTTPException(
            status_code=422,
            detail=(
                "Invalid registration role. "
                "Only 'citizen', 'centre_employee', and 'centre_administrator' are allowed."
            ),
        )

    if user_in.role in ("centre_employee", "centre_administrator"):
        if not user_in.centre_id:
            raise HTTPException(
                status_code=422,
                detail="Centre must be selected for staff/manager registration",
            )
        centre = session.get(AkshayaCentre, user_in.centre_id)
        if not centre or not centre.is_active:
            raise HTTPException(
                status_code=404,
                detail="Selected centre not found or inactive",
            )

    if user_in.role == "centre_administrator":
        # Check if the chosen centre already has an active or pending manager
        existing_mgr = session.scalar(
            select(CentreAdministrator).where(
                CentreAdministrator.centre_id == user_in.centre_id,
                CentreAdministrator.approval_status.in_(("APPROVED", "PENDING_APPROVAL")),
            )
        )
        if existing_mgr:
            raise HTTPException(
                status_code=409,
                detail=(
                    "This Akshaya Centre already has an active manager "
                    "or a pending manager request."
                ),
            )

    user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=True,
    )
    session.add(user)
    session.flush()

    if user_in.role == "centre_employee":
        # Always set approval_status to PENDING_APPROVAL on self-registration
        emp_profile = EmployeeProfile(
            user_id=user.id,
            centre_id=user_in.centre_id,
            full_name=user_in.full_name,
            approval_status="PENDING_APPROVAL",
        )
        session.add(emp_profile)

        # In-app notification to Centre Manager(s) of this centre and System Admin(s)
        approver_ids: set[UUID] = set()
        active_managers = session.scalars(
            select(CentreAdministrator.user_id).where(
                CentreAdministrator.centre_id == user_in.centre_id,
                CentreAdministrator.approval_status == "APPROVED",
            )
        ).all()
        approver_ids.update(active_managers)

        sysadmins = session.scalars(
            select(User.id).where(User.role == "system_administrator", User.is_active.is_(True))
        ).all()
        approver_ids.update(sysadmins)

        for approver_id in approver_ids:
            session.add(
                Notification(
                    user_id=approver_id,
                    event_type="staff_request",
                    title="New Staff Registration Request",
                    body=f"{user_in.full_name} has requested Centre Staff access.",
                )
            )

    elif user_in.role == "centre_administrator":
        admin_profile = CentreAdministrator(
            user_id=user.id,
            centre_id=user_in.centre_id,
            full_name=user_in.full_name,
            approval_status="PENDING_APPROVAL",
        )
        session.add(admin_profile)

        # Manager signup request -> shown to System Admin ONLY
        sysadmins = session.scalars(
            select(User.id).where(User.role == "system_administrator", User.is_active.is_(True))
        ).all()
        for approver_id in sysadmins:
            session.add(
                Notification(
                    user_id=approver_id,
                    event_type="manager_request",
                    title="New Centre Manager Registration Request",
                    body=f"{user_in.full_name} has requested Centre Manager access.",
                )
            )
    else:
        citizen_profile = CitizenProfile(
            user_id=user.id,
            full_name=user_in.full_name,
            phone=user_in.phone,
        )
        session.add(citizen_profile)

    session.commit()
    session.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], session: SessionDep) -> Token:
    clean_username = form_data.username.strip().lower()
    user = session.scalar(select(User).where(User.email == clean_username))
    if not user:
        user = session.scalar(select(User).where(User.email == form_data.username.strip()))
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Inactive account")

    # Check approval status for staff and managers
    if user.role == "centre_employee":
        emp_prof = session.scalar(select(EmployeeProfile).where(EmployeeProfile.user_id == user.id))
        if emp_prof:
            if emp_prof.approval_status == "PENDING_APPROVAL":
                raise HTTPException(status_code=403, detail="Your account is awaiting approval")
            elif emp_prof.approval_status == "REJECTED":
                raise HTTPException(status_code=403, detail="Your account request was rejected")
    elif user.role == "centre_administrator":
        admin_prof = session.scalar(
            select(CentreAdministrator).where(CentreAdministrator.user_id == user.id)
        )
        if admin_prof:
            if admin_prof.approval_status == "PENDING_APPROVAL":
                raise HTTPException(status_code=403, detail="Your account is awaiting approval")
            elif admin_prof.approval_status == "REJECTED":
                raise HTTPException(status_code=403, detail="Your account request was rejected")

    access_token = create_access_token(subject=str(user.id))
    return Token(access_token=access_token, token_type="bearer", expires_in=3600)


@router.get("/me", response_model=UserAuthMe)
def get_auth_me(current_user: CurrentUser, session: SessionDep) -> UserAuthMe:
    response = UserAuthMe.model_validate(current_user)
    if current_user.role == "citizen":
        profile = session.scalar(
            select(CitizenProfile).where(CitizenProfile.user_id == current_user.id)
        )
        if profile:
            response.full_name = profile.full_name
            response.phone = profile.phone
            response.address_text = profile.address_text
    elif current_user.role == "centre_employee":
        emp_profile = session.scalar(
            select(EmployeeProfile).where(EmployeeProfile.user_id == current_user.id)
        )
        if emp_profile:
            response.full_name = emp_profile.full_name
            response.centre_id = emp_profile.centre_id
            response.approval_status = emp_profile.approval_status
    elif current_user.role == "centre_administrator":
        admin_profile = session.scalar(
            select(CentreAdministrator).where(CentreAdministrator.user_id == current_user.id)
        )
        if admin_profile:
            response.full_name = admin_profile.full_name
            response.centre_id = admin_profile.centre_id
            response.approval_status = admin_profile.approval_status

    if current_user.profile_photo:
        # Avoid caching issues on frontend by relying on frontend suffix or add it here?
        # The prompt says: Add a cache-busting suffix to the URL on the frontend.
        response.photo_url = f"/api/v1/avatars/{current_user.profile_photo}"

    return response


@router.post("/reset-password")
@router.post("/forgot-password")
def reset_password(payload: ResetPasswordRequest, session: SessionDep) -> dict[str, str]:
    clean_email = payload.email.strip().lower()
    user = session.scalar(select(User).where(User.email == clean_email))
    if not user:
        user = session.scalar(select(User).where(User.email == payload.email.strip()))
    if not user:
        raise HTTPException(
            status_code=404,
            detail="No account registered with this email address.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=400,
            detail="This account is deactivated. Please contact support.",
        )

    user.password_hash = get_password_hash(payload.new_password)
    session.add(user)
    log_audit(
        session,
        actor_id=user.id,
        action="self_service_password_reset",
        target_resource_type="User",
        target_resource_id=str(user.id),
        details={"email": clean_email},
    )
    session.commit()
    return {"message": "Password successfully updated. You can now sign in with your new password."}
