from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.profile import CitizenProfile
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

    user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role="citizen",
        is_active=True,
    )
    session.add(user)
    session.flush()

    profile = CitizenProfile(user_id=user.id, full_name=user_in.full_name, phone=user_in.phone)
    session.add(profile)
    session.commit()
    session.refresh(user)

    return user


@router.post("/login", response_model=Token)
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], session: SessionDep) -> Token:
    user = session.scalar(select(User).where(User.email == form_data.username))
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Inactive account")

    access_token = create_access_token(subject=str(user.id))
    return Token(access_token=access_token, token_type="bearer", expires_in=3600)


@router.get("/me", response_model=UserAuthMe)
def get_auth_me(current_user: CurrentUser, session: SessionDep) -> UserAuthMe:
    response = UserAuthMe.model_validate(current_user)
    # Get profile details
    if current_user.role == "citizen":
        profile = session.scalar(
            select(CitizenProfile).where(CitizenProfile.user_id == current_user.id)
        )
        if profile:
            response.full_name = profile.full_name
            response.phone = profile.phone

    return response
