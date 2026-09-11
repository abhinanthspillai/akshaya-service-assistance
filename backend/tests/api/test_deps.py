import uuid
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.api.deps import (
    RoleChecker,
    get_current_active_centre_admin,
    get_current_active_employee,
    verify_admin_centre_access,
    verify_employee_centre_access,
)
from app.models.profile import CentreAdministrator, EmployeeProfile
from app.models.user import User


def test_role_checker_allows_valid_role() -> None:
    checker = RoleChecker(["citizen", "system_administrator"])
    user = User(email="test@example.com", password_hash="hash", role="citizen", is_active=True)

    result = checker(user)
    assert result == user


def test_role_checker_denies_invalid_role() -> None:
    checker = RoleChecker(["centre_employee"])
    user = User(email="test@example.com", password_hash="hash", role="citizen", is_active=True)

    with pytest.raises(HTTPException) as exc:
        checker(user)

    assert exc.value.status_code == 403
    assert exc.value.detail == "Not enough permissions"


def test_active_employee_allows_valid() -> None:
    session = MagicMock()
    user = User(id="00000000-0000-0000-0000-000000000001", role="centre_employee")
    employee = EmployeeProfile(user_id=user.id, is_available=True)
    session.get.return_value = employee

    result = get_current_active_employee(session, user)
    assert result == employee


def test_active_employee_denies_unavailable() -> None:
    session = MagicMock()
    user = User(id="00000000-0000-0000-0000-000000000001", role="centre_employee")
    employee = EmployeeProfile(user_id=user.id, is_available=False)
    session.get.return_value = employee

    with pytest.raises(HTTPException) as exc:
        get_current_active_employee(session, user)

    assert exc.value.status_code == 403


def test_active_centre_admin_denies_missing() -> None:
    session = MagicMock()
    user = User(id="00000000-0000-0000-0000-000000000001", role="centre_administrator")
    session.get.return_value = None

    with pytest.raises(HTTPException) as exc:
        get_current_active_centre_admin(session, user)

    assert exc.value.status_code == 403


def test_verify_employee_centre_access_allows() -> None:
    cid = uuid.uuid4()
    employee = EmployeeProfile(user_id=uuid.uuid4(), centre_id=cid)
    assert verify_employee_centre_access(cid, employee) == employee


def test_verify_employee_centre_access_denies() -> None:
    cid = uuid.uuid4()
    employee = EmployeeProfile(user_id=uuid.uuid4(), centre_id=uuid.uuid4())
    with pytest.raises(HTTPException) as exc:
        verify_employee_centre_access(cid, employee)
    assert exc.value.status_code == 403


def test_verify_admin_centre_access_denies() -> None:
    cid = uuid.uuid4()
    admin = CentreAdministrator(user_id=uuid.uuid4(), centre_id=uuid.uuid4())
    with pytest.raises(HTTPException) as exc:
        verify_admin_centre_access(cid, admin)
    assert exc.value.status_code == 403
