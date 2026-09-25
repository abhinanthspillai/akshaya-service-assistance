from uuid import UUID, uuid4
import pytest
from sqlalchemy.orm import Session

from app.api.endpoints.requests import ALLOWED_TRANSITIONS, _perform_transition
from app.models.assignment import RequestHistory
from app.models.centre import AkshayaCentre
from app.models.enums import RequestAction
from app.models.notification import Notification
from app.models.request import ServiceRequest
from app.models.service import Service
from app.models.user import User

ALL_TRANSITIONS = []
for from_st, to_list in ALLOWED_TRANSITIONS.items():
    for to_st, roles in to_list:
        ALL_TRANSITIONS.append((from_st, to_st, roles))


@pytest.fixture
def transition_setup(db_session: Session):
    centre = AkshayaCentre(
        id=uuid4(),
        name="Trans Centre",
        code=f"TC_{uuid4().hex[:6]}",
        address_text="Trans Address",
        district="Ernakulam",
        is_active=True,
    )
    db_session.add(centre)

    citizen = User(
        id=uuid4(),
        email=f"cit_{uuid4().hex[:6]}@test.com",
        password_hash="hash",
        role="citizen",
        is_active=True,
    )
    employee = User(
        id=uuid4(),
        email=f"emp_{uuid4().hex[:6]}@test.com",
        password_hash="hash",
        role="centre_employee",
        is_active=True,
    )
    admin = User(
        id=uuid4(),
        email=f"adm_{uuid4().hex[:6]}@test.com",
        password_hash="hash",
        role="centre_administrator",
        is_active=True,
    )
    sysadmin = User(
        id=uuid4(),
        email=f"sys_{uuid4().hex[:6]}@test.com",
        password_hash="hash",
        role="system_administrator",
        is_active=True,
    )
    service = Service(
        id=uuid4(),
        name="Trans Service",
        code=f"TS_{uuid4().hex[:6]}",
        service_type="A",
        base_fee=100,
        is_active=True,
    )
    db_session.add_all([citizen, employee, admin, sysadmin, service])
    db_session.commit()

    users_by_role = {
        "citizen": citizen,
        "centre_employee": employee,
        "centre_administrator": admin,
        "system_administrator": sysadmin,
        "system": employee,  # system can be represented by employee or any actor
    }

    return {
        "centre": centre,
        "citizen": citizen,
        "service": service,
        "users_by_role": users_by_role,
    }


@pytest.mark.parametrize("from_status,to_status,allowed_roles", ALL_TRANSITIONS)
def test_all_transitions_write_exactly_one_history_and_one_notification(
    db_session: Session,
    transition_setup: dict,
    from_status: str,
    to_status: str,
    allowed_roles: list[str],
):
    citizen = transition_setup["citizen"]
    centre = transition_setup["centre"]
    service = transition_setup["service"]
    users_by_role = transition_setup["users_by_role"]

    # 1. Create a request in from_status
    req = ServiceRequest(
        id=uuid4(),
        citizen_id=citizen.id,
        service_id=service.id,
        selected_centre_id=centre.id,
        status=from_status,
        service_type_snapshot="A",
        service_name_snapshot="Trans Service",
        fee_snapshot=100,
    )
    db_session.add(req)
    db_session.commit()

    # 2. Pick appropriate actor
    actor_role = allowed_roles[0]
    actor = users_by_role[actor_role]

    reason_text = "Citizen documents do not meet statutory eligibility" if to_status == "UNABLE_TO_PROCEED" else None
    action = RequestAction.UNABLE_TO_PROCEED if to_status == "UNABLE_TO_PROCEED" else RequestAction.SUBMIT_REQUEST

    # 3. Perform transition through shared helper
    _perform_transition(
        db_session,
        req,
        actor,
        to_status=to_status,
        action=action,
        note=reason_text,
    )
    db_session.commit()

    # 4. Verify request status updated
    db_session.refresh(req)
    assert req.status == to_status

    # 5. Assert exactly ONE RequestHistory row written
    history_rows = (
        db_session.query(RequestHistory)
        .filter_by(request_id=req.id)
        .all()
    )
    assert len(history_rows) == 1
    assert history_rows[0].from_status == from_status
    assert history_rows[0].to_status == to_status
    if reason_text:
        assert history_rows[0].note == reason_text

    # 6. Assert exactly ONE citizen notification written
    notifications = (
        db_session.query(Notification)
        .filter_by(request_id=req.id, user_id=citizen.id)
        .all()
    )
    assert len(notifications) == 1
    assert notifications[0].user_id == citizen.id

    # 7. The unable-to-proceed notification must include the reason
    if to_status == "UNABLE_TO_PROCEED":
        assert reason_text in notifications[0].body
