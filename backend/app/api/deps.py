from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.profile import CentreAdministrator, EmployeeProfile
from app.models.user import User
from app.schemas.token import TokenPayload

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]


def get_current_user(session: SessionDep, token: TokenDep) -> User:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        token_data = TokenPayload(**payload)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        ) from None
    if not token_data.sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        ) from None

    try:
        user_id = UUID(token_data.sub)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        ) from None

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Inactive user")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: CurrentUser) -> User:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return user


get_current_citizen = RoleChecker(["citizen"])
get_current_employee = RoleChecker(["centre_employee"])
get_current_centre_admin = RoleChecker(["centre_administrator"])
get_current_sys_admin = RoleChecker(["system_administrator"])

CurrentUserCitizen = Annotated[User, Depends(get_current_citizen)]
CurrentUserEmployee = Annotated[User, Depends(get_current_employee)]
CurrentUserCentreAdmin = Annotated[User, Depends(get_current_centre_admin)]
CurrentUserSysAdmin = Annotated[User, Depends(get_current_sys_admin)]


def get_current_active_employee(session: SessionDep, user: CurrentUserEmployee) -> EmployeeProfile:
    employee = session.get(EmployeeProfile, user.id)
    if not employee or not employee.is_available:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee profile not found or unavailable",
        )
    return employee


ActiveEmployeeDep = Annotated[EmployeeProfile, Depends(get_current_active_employee)]


def get_current_active_centre_admin(
    session: SessionDep, user: CurrentUserCentreAdmin
) -> CentreAdministrator:
    admin = session.get(CentreAdministrator, user.id)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Centre administrator profile not found",
        )
    return admin


ActiveCentreAdminDep = Annotated[CentreAdministrator, Depends(get_current_active_centre_admin)]


def verify_employee_centre_access(centre_id: UUID, employee: ActiveEmployeeDep) -> EmployeeProfile:
    if employee.centre_id != centre_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this centre",
        )
    return employee


def verify_admin_centre_access(centre_id: UUID, admin: ActiveCentreAdminDep) -> CentreAdministrator:
    if admin.centre_id != centre_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this centre",
        )
    return admin
