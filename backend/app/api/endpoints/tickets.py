from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.deps import CurrentUser, CurrentUserCitizen, SessionDep
from app.models.ticket import SupportTicket, TicketMessage
from app.schemas.ticket import SupportTicketCreate, SupportTicketResponse, SupportTicketUpdate, TicketMessageCreate, TicketMessageResponse
from app.models.request import ServiceRequest

router = APIRouter()

@router.post("/", response_model=SupportTicketResponse)
def create_ticket(
    *,
    session: SessionDep,
    current_user: CurrentUserCitizen,
    ticket_in: SupportTicketCreate,
) -> Any:
    if ticket_in.request_id:
        request = session.get(ServiceRequest, ticket_in.request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Linked request not found")
        if request.citizen_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to link this request")
            
    ticket = SupportTicket(
        citizen_id=current_user.id,
        request_id=ticket_in.request_id,
        subject=ticket_in.subject,
        description=ticket_in.description,
        status="OPEN"
    )
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket

@router.get("/", response_model=list[SupportTicketResponse])
def list_tickets(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    if current_user.role == "citizen":
        tickets = session.scalars(
            select(SupportTicket).where(SupportTicket.citizen_id == current_user.id)
        ).all()
    else:
        # Admins can see all tickets for now
        tickets = session.scalars(select(SupportTicket)).all()
    return list(tickets)

@router.get("/{ticket_id}", response_model=SupportTicketResponse)
def get_ticket(
    ticket_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    ticket = session.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if current_user.role == "citizen" and ticket.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return ticket

@router.post("/{ticket_id}/status", response_model=SupportTicketResponse)
def update_ticket_status(
    *,
    ticket_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
    update_in: SupportTicketUpdate,
) -> Any:
    if current_user.role not in {"centre_administrator", "system_administrator"}:
        raise HTTPException(status_code=403, detail="Not authorized to change ticket status")
        
    ticket = session.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    allowed_statuses = {"OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"}
    if update_in.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    ticket.status = update_in.status
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket

@router.get("/{ticket_id}/messages", response_model=list[TicketMessageResponse])
def list_ticket_messages(
    ticket_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    ticket = session.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if current_user.role == "citizen" and ticket.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    messages = session.scalars(
        select(TicketMessage).where(TicketMessage.ticket_id == ticket_id).order_by(TicketMessage.created_at)
    ).all()
    return list(messages)

@router.post("/{ticket_id}/messages", response_model=TicketMessageResponse)
def add_ticket_message(
    *,
    ticket_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
    message_in: TicketMessageCreate,
) -> Any:
    ticket = session.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if current_user.role == "citizen" and ticket.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    message = TicketMessage(
        ticket_id=ticket_id,
        sender_id=current_user.id,
        body=message_in.body
    )
    session.add(message)
    session.commit()
    session.refresh(message)
    return message
