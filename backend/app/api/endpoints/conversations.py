from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select

from app.api.deps import CurrentUser, SessionDep
from app.models.assignment import RequestAssignment
from app.models.message import Conversation, RequestMessage
from app.models.notification import Notification
from app.models.profile import CitizenProfile, EmployeeProfile
from app.models.request import ServiceRequest
from app.schemas.message import (
    ConversationResponse,
    RequestMessageCreate,
    RequestMessageResponse,
    UnreadCountResponse,
)

router = APIRouter()

TERMINAL_STATUSES = {"COMPLETED", "CLOSED", "CANCELLED", "UNABLE_TO_PROCEED"}
UNACCEPTED_STATUSES = {"DRAFT", "SUBMITTED", "WAITING_FOR_CENTRE"}


def _get_user_display_name(session: SessionDep, user_id: UUID) -> str:
    citizen = session.get(CitizenProfile, user_id)
    if citizen and citizen.full_name:
        return citizen.full_name
    employee = session.get(EmployeeProfile, user_id)
    if employee and employee.full_name:
        return employee.full_name
    return "User"


def _verify_conversation_participant(
    current_user: CurrentUser, conversation: Conversation, session: SessionDep
) -> None:
    if current_user.role == "citizen":
        if conversation.citizen_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized for this conversation")
    elif current_user.role == "centre_employee":
        if conversation.staff_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized for this conversation")
        # Also confirm active assignment on the request
        active_assignment = session.scalar(
            select(RequestAssignment).where(
                RequestAssignment.request_id == conversation.request_id,
                RequestAssignment.employee_id == current_user.id,
                RequestAssignment.is_active.is_(True),
            )
        )
        if not active_assignment:
            raise HTTPException(status_code=403, detail="No active assignment for this request")
    else:
        # Admin roles are not direct chat participants unless they are the assigned employee/citizen
        raise HTTPException(status_code=403, detail="Not authorized for chat")


def _get_or_create_conversation_for_request(
    session: SessionDep, service_request: ServiceRequest
) -> Conversation:
    if service_request.status in UNACCEPTED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Chat is not available before the request is accepted by a centre employee",
        )

    conversation = session.scalar(
        select(Conversation).where(Conversation.request_id == service_request.id)
    )
    if conversation:
        return conversation

    # Find the current active assigned employee
    assignment = session.scalar(
        select(RequestAssignment).where(
            RequestAssignment.request_id == service_request.id,
            RequestAssignment.is_active.is_(True),
        )
    )
    if not assignment:
        raise HTTPException(
            status_code=400,
            detail="Cannot start chat without an active staff assignment",
        )

    conversation = Conversation(
        request_id=service_request.id,
        citizen_id=service_request.citizen_id,
        staff_id=assignment.employee_id,
    )
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    return conversation


@router.get("/", response_model=list[ConversationResponse])
def list_my_conversations(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """List all active conversations for the authenticated citizen or staff member."""
    if current_user.role not in {"citizen", "centre_employee"}:
        return []

    # Filter conversations where the current user is a direct participant
    if current_user.role == "citizen":
        query = select(Conversation).where(Conversation.citizen_id == current_user.id)
    else:
        # Centre employee: must be current staff_id and have active assignment
        query = (
            select(Conversation)
            .join(
                RequestAssignment,
                (RequestAssignment.request_id == Conversation.request_id)
                & (RequestAssignment.employee_id == current_user.id)
                & (RequestAssignment.is_active.is_(True)),
            )
            .where(Conversation.staff_id == current_user.id)
        )

    conversations = session.scalars(query.order_by(Conversation.updated_at.desc())).all()
    results = []

    for conv in conversations:
        req = session.get(ServiceRequest, conv.request_id)
        if not req:
            continue

        # Other party info
        if current_user.role == "citizen":
            other_id = conv.staff_id
            other_role = "Staff"
        else:
            other_id = conv.citizen_id
            other_role = "Citizen"

        other_name = _get_user_display_name(session, other_id)

        # Last message
        last_msg = session.scalar(
            select(RequestMessage)
            .where(
                or_(
                    RequestMessage.conversation_id == conv.id,
                    RequestMessage.request_id == conv.request_id,
                )
            )
            .order_by(RequestMessage.created_at.desc())
            .limit(1)
        )

        last_msg_resp = None
        if last_msg:
            sender_name = _get_user_display_name(session, last_msg.sender_id)
            last_msg_resp = RequestMessageResponse(
                id=last_msg.id,
                request_id=last_msg.request_id,
                conversation_id=conv.id,
                sender_id=last_msg.sender_id,
                sender_name=sender_name,
                body=last_msg.body,
                is_system=last_msg.is_system,
                read_at=last_msg.read_at,
                created_at=last_msg.created_at,
            )

        # Unread count (messages sent by someone else and not marked read)
        unread_count = (
            session.scalar(
                select(func.count(RequestMessage.id)).where(
                    or_(
                        RequestMessage.conversation_id == conv.id,
                        RequestMessage.request_id == conv.request_id,
                    ),
                    RequestMessage.sender_id != current_user.id,
                    RequestMessage.read_at.is_(None),
                    RequestMessage.is_system.is_(False),
                )
            )
            or 0
        )

        results.append(
            ConversationResponse(
                id=conv.id,
                request_id=conv.request_id,
                service_name=req.service_name_snapshot,
                request_status=req.status,
                is_terminal=req.status in TERMINAL_STATUSES,
                other_party_name=other_name,
                other_party_role=other_role,
                last_message=last_msg_resp,
                unread_count=unread_count,
                updated_at=conv.updated_at,
            )
        )

    return results


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_total_unread_count(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Get the total count of unread chat messages for the current user."""
    if current_user.role not in {"citizen", "centre_employee"}:
        return UnreadCountResponse(unread_count=0)

    if current_user.role == "citizen":
        subquery = (
            select(Conversation.id)
            .where(Conversation.citizen_id == current_user.id)
            .scalar_subquery()
        )
    else:
        subquery = (
            select(Conversation.id)
            .join(
                RequestAssignment,
                (RequestAssignment.request_id == Conversation.request_id)
                & (RequestAssignment.employee_id == current_user.id)
                & (RequestAssignment.is_active.is_(True)),
            )
            .where(Conversation.staff_id == current_user.id)
            .scalar_subquery()
        )

    total_unread = (
        session.scalar(
            select(func.count(RequestMessage.id)).where(
                RequestMessage.conversation_id.in_(subquery),
                RequestMessage.sender_id != current_user.id,
                RequestMessage.read_at.is_(None),
                RequestMessage.is_system.is_(False),
            )
        )
        or 0
    )

    return UnreadCountResponse(unread_count=total_unread)


@router.get("/request/{request_id}", response_model=ConversationResponse)
def get_conversation_by_request(
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Get or initialize conversation for a specific request."""
    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")

    conversation = _get_or_create_conversation_for_request(session, service_request)
    _verify_conversation_participant(current_user, conversation, session)

    if current_user.role == "citizen":
        other_id = conversation.staff_id
        other_role = "Staff"
    else:
        other_id = conversation.citizen_id
        other_role = "Citizen"

    other_name = _get_user_display_name(session, other_id)

    last_msg = session.scalar(
        select(RequestMessage)
        .where(
            or_(
                RequestMessage.conversation_id == conversation.id,
                RequestMessage.request_id == conversation.request_id,
            )
        )
        .order_by(RequestMessage.created_at.desc())
        .limit(1)
    )

    last_msg_resp = None
    if last_msg:
        sender_name = _get_user_display_name(session, last_msg.sender_id)
        last_msg_resp = RequestMessageResponse(
            id=last_msg.id,
            request_id=last_msg.request_id,
            conversation_id=conversation.id,
            sender_id=last_msg.sender_id,
            sender_name=sender_name,
            body=last_msg.body,
            is_system=last_msg.is_system,
            read_at=last_msg.read_at,
            created_at=last_msg.created_at,
        )

    unread_count = (
        session.scalar(
            select(func.count(RequestMessage.id)).where(
                or_(
                    RequestMessage.conversation_id == conversation.id,
                    RequestMessage.request_id == conversation.request_id,
                ),
                RequestMessage.sender_id != current_user.id,
                RequestMessage.read_at.is_(None),
                RequestMessage.is_system.is_(False),
            )
        )
        or 0
    )

    return ConversationResponse(
        id=conversation.id,
        request_id=conversation.request_id,
        service_name=service_request.service_name_snapshot,
        request_status=service_request.status,
        is_terminal=service_request.status in TERMINAL_STATUSES,
        other_party_name=other_name,
        other_party_role=other_role,
        last_message=last_msg_resp,
        unread_count=unread_count,
        updated_at=conversation.updated_at,
    )


@router.get("/{conversation_id}/messages", response_model=list[RequestMessageResponse])
def get_conversation_messages(
    conversation_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> Any:
    """Get paginated messages for a conversation, ordered oldest to newest."""
    conversation = session.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    _verify_conversation_participant(current_user, conversation, session)

    messages = session.scalars(
        select(RequestMessage)
        .where(
            or_(
                RequestMessage.conversation_id == conversation.id,
                RequestMessage.request_id == conversation.request_id,
            )
        )
        .order_by(RequestMessage.created_at.asc())
        .offset(skip)
        .limit(limit)
    ).all()

    # Enrich sender names
    results = []
    user_names: dict[UUID, str] = {}
    for msg in messages:
        if msg.sender_id not in user_names:
            user_names[msg.sender_id] = _get_user_display_name(session, msg.sender_id)
        results.append(
            RequestMessageResponse(
                id=msg.id,
                request_id=msg.request_id,
                conversation_id=conversation.id,
                sender_id=msg.sender_id,
                sender_name=user_names[msg.sender_id],
                body=msg.body,
                is_system=msg.is_system,
                read_at=msg.read_at,
                created_at=msg.created_at,
            )
        )

    return results


@router.post(
    "/{conversation_id}/messages",
    response_model=RequestMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def send_conversation_message(
    *,
    conversation_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
    body: RequestMessageCreate,
) -> Any:
    """Send a text message in the conversation thread."""
    conversation = session.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    _verify_conversation_participant(current_user, conversation, session)

    req = session.get(ServiceRequest, conversation.request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Reject if request is in final/terminal state
    if req.status in TERMINAL_STATUSES:
        raise HTTPException(
            status_code=409,
            detail=f"This conversation is read-only because the request is in '{req.status}' state",
        )

    # Reject if request is not accepted
    if req.status in UNACCEPTED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Cannot send messages on unaccepted requests",
        )

    content = body.body.strip()
    if not content:
        raise HTTPException(status_code=422, detail="Message cannot be empty")

    now = datetime.now(tz=UTC)
    message = RequestMessage(
        request_id=conversation.request_id,
        conversation_id=conversation.id,
        sender_id=current_user.id,
        body=content,
        is_system=False,
        created_at=now,
    )
    session.add(message)

    conversation.updated_at = now
    session.add(conversation)

    # Identify recipient
    recipient_id = (
        conversation.staff_id if current_user.role == "citizen" else conversation.citizen_id
    )

    # In-app notification with collapsing: collapse repeated messages in the same thread
    # Check if an unread chat notification already exists for this request
    existing_unread_notif = session.scalar(
        select(Notification).where(
            Notification.user_id == recipient_id,
            Notification.request_id == conversation.request_id,
            Notification.event_type == "chat_message",
            Notification.is_read.is_(False),
        )
    )

    if not existing_unread_notif:
        sender_display_name = _get_user_display_name(session, current_user.id)
        notif = Notification(
            user_id=recipient_id,
            request_id=conversation.request_id,
            event_type="chat_message",
            title=f"New message on request #{str(conversation.request_id)[:8]}",
            body=f"{sender_display_name}: {content[:100]}",
            is_read=False,
            created_at=now,
        )
        session.add(notif)
    else:
        # Update existing unread notification timestamp and body preview
        sender_display_name = _get_user_display_name(session, current_user.id)
        existing_unread_notif.body = f"{sender_display_name}: {content[:100]}"
        existing_unread_notif.created_at = now
        session.add(existing_unread_notif)

    session.commit()
    session.refresh(message)

    sender_name = _get_user_display_name(session, current_user.id)
    return RequestMessageResponse(
        id=message.id,
        request_id=message.request_id,
        conversation_id=conversation.id,
        sender_id=message.sender_id,
        sender_name=sender_name,
        body=message.body,
        is_system=message.is_system,
        read_at=message.read_at,
        created_at=message.created_at,
    )


@router.post("/{conversation_id}/read", status_code=status.HTTP_200_OK)
def mark_conversation_as_read(
    conversation_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Mark all unread incoming messages in this conversation as read."""
    conversation = session.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    _verify_conversation_participant(current_user, conversation, session)

    now = datetime.now(tz=UTC)

    # Mark all messages sent by the other party as read
    from sqlalchemy import update

    stmt = (
        update(RequestMessage)
        .where(
            or_(
                RequestMessage.conversation_id == conversation.id,
                RequestMessage.request_id == conversation.request_id,
            ),
            RequestMessage.sender_id != current_user.id,
            RequestMessage.read_at.is_(None),
        )
        .values(read_at=now)
    )
    session.execute(stmt)

    # Also mark any related unread chat notification as read
    notif_stmt = (
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.request_id == conversation.request_id,
            Notification.event_type == "chat_message",
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    session.execute(notif_stmt)

    session.commit()
    return {"detail": "Conversation marked as read"}
