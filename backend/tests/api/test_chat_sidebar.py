from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.assignment import RequestAssignment
from app.models.centre import AkshayaCentre
from app.models.message import Conversation, RequestMessage
from app.models.profile import EmployeeProfile
from app.models.request import ServiceRequest
from app.models.service import Service
from app.models.user import User


def setup_chat_fixtures(db_session: Session, normal_user_id: str, employee_id: str, test_centre_id: str):
    """Helper to set up service, request, and assignment."""
    service = Service(
        id=uuid4(),
        name="Income Certificate",
        code=f"IC_{uuid4().hex[:6]}",
        service_type="A",
        base_fee=50,
        is_active=True,
    )
    db_session.add(service)
    db_session.commit()

    req = ServiceRequest(
        id=uuid4(),
        citizen_id=UUID(normal_user_id),
        service_id=service.id,
        selected_centre_id=UUID(test_centre_id),
        status="ACCEPTED",
        service_type_snapshot="A",
        service_name_snapshot="Income Certificate",
        fee_snapshot=50,
    )
    db_session.add(req)
    db_session.commit()

    assignment = RequestAssignment(
        id=uuid4(),
        request_id=req.id,
        employee_id=UUID(employee_id),
        is_active=True,
    )
    db_session.add(assignment)

    conv = Conversation(
        id=uuid4(),
        request_id=req.id,
        citizen_id=UUID(normal_user_id),
        staff_id=UUID(employee_id),
    )
    db_session.add(conv)
    db_session.commit()

    return service, req, assignment, conv


def test_pre_acceptance_request_cannot_be_chatted_on(
    client: TestClient,
    db_session: Session,
    normal_user_headers: dict[str, str],
    normal_user_id: str,
    test_centre_id: str,
):
    """Before a request is accepted, chat is unavailable."""
    service = Service(
        id=uuid4(),
        name="Caste Certificate",
        code=f"CC_{uuid4().hex[:6]}",
        service_type="A",
        base_fee=50,
        is_active=True,
    )
    db_session.add(service)
    db_session.commit()

    req = ServiceRequest(
        id=uuid4(),
        citizen_id=UUID(normal_user_id),
        service_id=service.id,
        selected_centre_id=UUID(test_centre_id),
        status="WAITING_FOR_CENTRE",
        service_type_snapshot="A",
        service_name_snapshot="Caste Certificate",
        fee_snapshot=50,
    )
    db_session.add(req)
    db_session.commit()

    # Attempting to fetch or create conversation via request
    res = client.get(
        f"/api/v1/conversations/request/{req.id}",
        headers=normal_user_headers,
    )
    assert res.status_code == 400
    assert "not available before the request is accepted" in res.json()["detail"]


def test_non_participant_cannot_read_or_send(
    client: TestClient,
    db_session: Session,
    normal_user_id: str,
    employee_id: str,
    test_centre_id: str,
):
    """A user who is neither the owner citizen nor the assigned staff cannot read or send messages."""
    _, req, _, conv = setup_chat_fixtures(db_session, normal_user_id, employee_id, test_centre_id)

    # Create another citizen
    other_citizen = User(
        id=uuid4(),
        email=f"other_{uuid4().hex[:6]}@example.com",
        password_hash="hash",
        role="citizen",
        is_active=True,
    )
    db_session.add(other_citizen)
    db_session.commit()

    from app.core.security import create_access_token
    token = create_access_token(other_citizen.id)
    headers = {"Authorization": f"Bearer {token}"}

    # Cannot read messages
    res = client.get(
        f"/api/v1/conversations/{conv.id}/messages",
        headers=headers,
    )
    assert res.status_code == 403

    # Cannot send message
    res = client.post(
        f"/api/v1/conversations/{conv.id}/messages",
        headers=headers,
        json={"body": "Hello from intruder"},
    )
    assert res.status_code == 403


def test_citizen_and_staff_can_exchange_messages_and_read_count_updates(
    client: TestClient,
    db_session: Session,
    normal_user_headers: dict[str, str],
    employee_headers: dict[str, str],
    normal_user_id: str,
    employee_id: str,
    test_centre_id: str,
):
    """Citizen sends message, staff sees unread count, marks read, and replies."""
    _, req, _, conv = setup_chat_fixtures(db_session, normal_user_id, employee_id, test_centre_id)

    # Initially unread count for staff is 0
    res = client.get("/api/v1/conversations/unread-count", headers=employee_headers)
    assert res.status_code == 200
    assert res.json()["unread_count"] == 0

    # Citizen sends message
    res = client.post(
        f"/api/v1/conversations/{conv.id}/messages",
        headers=normal_user_headers,
        json={"body": "Hello, I have a question about my documents."},
    )
    assert res.status_code == 201
    msg_data = res.json()
    assert msg_data["body"] == "Hello, I have a question about my documents."
    assert msg_data["read_at"] is None

    # Staff unread count is now 1
    res = client.get("/api/v1/conversations/unread-count", headers=employee_headers)
    assert res.status_code == 200
    assert res.json()["unread_count"] == 1

    # Staff lists conversations
    res = client.get("/api/v1/conversations/", headers=employee_headers)
    assert res.status_code == 200
    conv_list = res.json()
    assert len(conv_list) == 1
    assert conv_list[0]["unread_count"] == 1
    assert conv_list[0]["last_message"]["body"] == "Hello, I have a question about my documents."

    # Staff marks conversation as read
    res = client.post(f"/api/v1/conversations/{conv.id}/read", headers=employee_headers)
    assert res.status_code == 200

    # Staff unread count is now 0
    res = client.get("/api/v1/conversations/unread-count", headers=employee_headers)
    assert res.status_code == 200
    assert res.json()["unread_count"] == 0

    # Staff replies
    res = client.post(
        f"/api/v1/conversations/{conv.id}/messages",
        headers=employee_headers,
        json={"body": "Sure! All documents are clear and verified."},
    )
    assert res.status_code == 201


def test_final_state_thread_is_read_only(
    client: TestClient,
    db_session: Session,
    normal_user_headers: dict[str, str],
    employee_headers: dict[str, str],
    normal_user_id: str,
    employee_id: str,
    test_centre_id: str,
):
    """When a request reaches a final state (COMPLETED, CANCELLED, etc.), chat is read-only."""
    _, req, _, conv = setup_chat_fixtures(db_session, normal_user_id, employee_id, test_centre_id)

    # First add a message while still active
    client.post(
        f"/api/v1/conversations/{conv.id}/messages",
        headers=normal_user_headers,
        json={"body": "Can I still ask questions?"},
    )

    # Transition request to COMPLETED
    req.status = "COMPLETED"
    db_session.add(req)
    db_session.commit()

    # Reading messages still works
    res = client.get(
        f"/api/v1/conversations/{conv.id}/messages",
        headers=normal_user_headers,
    )
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # Sending is blocked with 409 Conflict
    res = client.post(
        f"/api/v1/conversations/{conv.id}/messages",
        headers=normal_user_headers,
        json={"body": "Hello?"},
    )
    assert res.status_code == 409
    assert "read-only" in res.json()["detail"]


def test_reassignment_gives_access_to_new_staff_and_removes_old(
    client: TestClient,
    db_session: Session,
    admin_headers: dict[str, str],
    employee_headers: dict[str, str],
    normal_user_id: str,
    employee_id: str,
    test_centre_id: str,
):
    """Reassignment hands over conversation to the new staff and revokes access for the old staff."""
    _, req, _, conv = setup_chat_fixtures(db_session, normal_user_id, employee_id, test_centre_id)

    # Create new employee in the same centre
    new_emp_user = User(
        id=uuid4(),
        email=f"emp_new_{uuid4().hex[:6]}@example.com",
        password_hash="hash",
        role="centre_employee",
        is_active=True,
    )
    db_session.add(new_emp_user)
    db_session.commit()

    new_emp_profile = EmployeeProfile(
        user_id=new_emp_user.id,
        centre_id=UUID(test_centre_id),
        full_name="Staff Sharma",
        is_available=True,
        max_active_requests=10,
        approval_status="APPROVED",
    )
    db_session.add(new_emp_profile)
    db_session.commit()

    from app.core.security import create_access_token
    new_emp_token = create_access_token(new_emp_user.id)
    new_emp_headers = {"Authorization": f"Bearer {new_emp_token}"}

    # Reassign request via admin endpoint
    res = client.post(
        f"/api/v1/requests/{req.id}/reassign",
        headers=admin_headers,
        json={"employee_id": str(new_emp_user.id)},
    )
    assert res.status_code == 200

    # Old employee no longer has access (403 Forbidden)
    res = client.get(
        f"/api/v1/conversations/{conv.id}/messages",
        headers=employee_headers,
    )
    assert res.status_code == 403

    # New employee has access and sees history + system handover message
    res = client.get(
        f"/api/v1/conversations/{conv.id}/messages",
        headers=new_emp_headers,
    )
    assert res.status_code == 200
    messages = res.json()
    assert any("Chat handed over to" in m["body"] for m in messages)
