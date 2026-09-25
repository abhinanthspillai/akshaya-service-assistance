from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.centre import AkshayaCentre
from app.models.profile import CentreAdministrator, CitizenProfile, EmployeeProfile
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserAuthMe, UserRead, UserRegister

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

    # Validate role: only 'citizen' and 'centre_employee' are permitted
    if user_in.role not in ("citizen", "centre_employee"):
        raise HTTPException(
            status_code=422,
            detail="Invalid registration role. Only 'citizen' and 'centre_employee' are allowed.",
        )

    if user_in.role == "centre_employee":
        if not user_in.centre_id:
            raise HTTPException(
                status_code=422,
                detail="Centre must be selected for employee registration",
            )
        centre = session.get(AkshayaCentre, user_in.centre_id)
        if not centre or not centre.is_active:
            raise HTTPException(
                status_code=404,
                detail="Selected centre not found or inactive",
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
        profile = EmployeeProfile(
            user_id=user.id,
            centre_id=user_in.centre_id,
            full_name=user_in.full_name,
            approval_status="PENDING_APPROVAL",
        )
        session.add(profile)
    else:
        profile = CitizenProfile(
            user_id=user.id,
            full_name=user_in.full_name,
            phone=user_in.phone,
        )
        session.add(profile)

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

    return response
