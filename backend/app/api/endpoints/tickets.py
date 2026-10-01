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
    elif current_user.role == "centre_employee":
        from app.models.profile import EmployeeProfile
        employee = session.get(EmployeeProfile, current_user.id)
        if not employee or employee.approval_status != "APPROVED":
            return []
        tickets = session.scalars(
            select(SupportTicket)
            .join(ServiceRequest, SupportTicket.request_id == ServiceRequest.id)
            .where(ServiceRequest.selected_centre_id == employee.centre_id)
        ).all()
    elif current_user.role == "centre_administrator":
        from app.models.profile import CentreAdministrator
        admin = session.get(CentreAdministrator, current_user.id)
        if not admin:
            return []
        tickets = session.scalars(
            select(SupportTicket)
            .join(ServiceRequest, SupportTicket.request_id == ServiceRequest.id)
            .where(ServiceRequest.selected_centre_id == admin.centre_id)
        ).all()
    else:
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
    elif current_user.role == "centre_employee":
        from app.models.profile import EmployeeProfile
        employee = session.get(EmployeeProfile, current_user.id)
        if not employee or employee.approval_status != "APPROVED":
            raise HTTPException(status_code=403, detail="Not authorized")
        if not ticket.request_id:
            raise HTTPException(status_code=403, detail="Not authorized (ticket not linked to a request)")
        service_request = session.get(ServiceRequest, ticket.request_id)
        if not service_request or service_request.selected_centre_id != employee.centre_id:
            raise HTTPException(status_code=403, detail="Not authorized for this ticket")
    elif current_user.role == "centre_employee":
        from app.models.profile import EmployeeProfile
        employee = session.get(EmployeeProfile, current_user.id)
        if not employee or employee.approval_status != "APPROVED":
            raise HTTPException(status_code=403, detail="Not authorized")
        if not ticket.request_id:
            raise HTTPException(status_code=403, detail="Not authorized (ticket not linked to a request)")
        service_request = session.get(ServiceRequest, ticket.request_id)
        if not service_request or service_request.selected_centre_id != employee.centre_id:
            raise HTTPException(status_code=403, detail="Not authorized for this ticket")
    elif current_user.role == "centre_employee":
        from app.models.profile import EmployeeProfile
        employee = session.get(EmployeeProfile, current_user.id)
        if not employee or employee.approval_status != "APPROVED":
            raise HTTPException(status_code=403, detail="Not authorized")
        if not ticket.request_id:
            raise HTTPException(status_code=403, detail="Not authorized (ticket not linked to a request)")
        service_request = session.get(ServiceRequest, ticket.request_id)
        if not service_request or service_request.selected_centre_id != employee.centre_id:
            raise HTTPException(status_code=403, detail="Not authorized for this ticket")
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
    
    # Notify citizen of ticket update
    from app.api.endpoints.requests import _safe_add_notification
    _safe_add_notification(
        session,
        user_id=ticket.citizen_id,
        request_id=ticket.request_id,
        event_type="ticket_updated",
        title="Support Ticket Updated",
        body=f"Your support ticket '{ticket.subject}' status changed to {ticket.status}.",
    )
    
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
    elif current_user.role == "centre_employee":
        from app.models.profile import EmployeeProfile
        employee = session.get(EmployeeProfile, current_user.id)
        if not employee or employee.approval_status != "APPROVED":
            raise HTTPException(status_code=403, detail="Not authorized")
        if not ticket.request_id:
            raise HTTPException(status_code=403, detail="Not authorized (ticket not linked to a request)")
        service_request = session.get(ServiceRequest, ticket.request_id)
        if not service_request or service_request.selected_centre_id != employee.centre_id:
            raise HTTPException(status_code=403, detail="Not authorized for this ticket")
    elif current_user.role == "centre_employee":
        from app.models.profile import EmployeeProfile
        employee = session.get(EmployeeProfile, current_user.id)
        if not employee or employee.approval_status != "APPROVED":
            raise HTTPException(status_code=403, detail="Not authorized")
        if not ticket.request_id:
            raise HTTPException(status_code=403, detail="Not authorized (ticket not linked to a request)")
        service_request = session.get(ServiceRequest, ticket.request_id)
        if not service_request or service_request.selected_centre_id != employee.centre_id:
            raise HTTPException(status_code=403, detail="Not authorized for this ticket")
    elif current_user.role == "centre_employee":
        from app.models.profile import EmployeeProfile
        employee = session.get(EmployeeProfile, current_user.id)
        if not employee or employee.approval_status != "APPROVED":
            raise HTTPException(status_code=403, detail="Not authorized")
        if not ticket.request_id:
            raise HTTPException(status_code=403, detail="Not authorized (ticket not linked to a request)")
        service_request = session.get(ServiceRequest, ticket.request_id)
        if not service_request or service_request.selected_centre_id != employee.centre_id:
            raise HTTPException(status_code=403, detail="Not authorized for this ticket")
        
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
    elif current_user.role == "centre_employee":
        from app.models.profile import EmployeeProfile
        employee = session.get(EmployeeProfile, current_user.id)
        if not employee or employee.approval_status != "APPROVED":
            raise HTTPException(status_code=403, detail="Not authorized")
        if not ticket.request_id:
            raise HTTPException(status_code=403, detail="Not authorized (ticket not linked to a request)")
        service_request = session.get(ServiceRequest, ticket.request_id)
        if not service_request or service_request.selected_centre_id != employee.centre_id:
            raise HTTPException(status_code=403, detail="Not authorized for this ticket")
    elif current_user.role == "centre_employee":
        from app.models.profile import EmployeeProfile
        employee = session.get(EmployeeProfile, current_user.id)
        if not employee or employee.approval_status != "APPROVED":
            raise HTTPException(status_code=403, detail="Not authorized")
        if not ticket.request_id:
            raise HTTPException(status_code=403, detail="Not authorized (ticket not linked to a request)")
        service_request = session.get(ServiceRequest, ticket.request_id)
        if not service_request or service_request.selected_centre_id != employee.centre_id:
            raise HTTPException(status_code=403, detail="Not authorized for this ticket")
    elif current_user.role == "centre_employee":
        from app.models.profile import EmployeeProfile
        employee = session.get(EmployeeProfile, current_user.id)
        if not employee or employee.approval_status != "APPROVED":
            raise HTTPException(status_code=403, detail="Not authorized")
        if not ticket.request_id:
            raise HTTPException(status_code=403, detail="Not authorized (ticket not linked to a request)")
        service_request = session.get(ServiceRequest, ticket.request_id)
        if not service_request or service_request.selected_centre_id != employee.centre_id:
            raise HTTPException(status_code=403, detail="Not authorized for this ticket")
        
    message = TicketMessage(
        ticket_id=ticket_id,
        sender_id=current_user.id,
        body=message_in.body
    )
    session.add(message)
    
    # Notify citizen if the message is from an admin or employee
    if current_user.role != "citizen":
        from app.api.endpoints.requests import _safe_add_notification
        _safe_add_notification(
            session,
            user_id=ticket.citizen_id,
            request_id=ticket.request_id,
            event_type="ticket_updated",
            title="New Support Ticket Message",
            body=f"A new message was added to your ticket '{ticket.subject}'.",
        )
    elif current_user.role == "citizen" and ticket.request_id:
        # Notify assigned employees that citizen replied
        from app.api.endpoints.requests import _notify_assigned_employees
        _notify_assigned_employees(
            session, ticket.request_id, "ticket_updated", "Citizen replied",
            f"Citizen added a message to ticket '{ticket.subject}'."
        )

    session.commit()
    session.refresh(message)
    return message
