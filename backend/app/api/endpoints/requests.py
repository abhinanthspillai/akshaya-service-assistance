from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import (
    CurrentUser,
    CurrentUserCitizen,
    SessionDep,
)
from app.models.centre import AkshayaCentre
from app.models.request import ServiceRequest
from app.models.service import CentreSupportedService, Service
from app.schemas.request import SelectCentreRequest, ServiceRequestCreate, ServiceRequestResponse

router = APIRouter()


@router.post("/", response_model=ServiceRequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    *,
    session: SessionDep,
    current_user: CurrentUserCitizen,
    request_in: ServiceRequestCreate,
) -> Any:
    service = session.get(Service, request_in.service_id)
    if not service or not service.is_active:
        raise HTTPException(status_code=404, detail="Service not found or inactive")

    service_request = ServiceRequest(
        citizen_id=current_user.id,
        service_id=service.id,
        status="DRAFT",
        service_type_snapshot=service.service_type,
        service_name_snapshot=service.name,
        fee_snapshot=service.base_fee,
    )
    session.add(service_request)
    session.commit()
    session.refresh(service_request)
    return service_request


@router.get("/", response_model=list[ServiceRequestResponse])
def list_requests(
    session: SessionDep,
    current_user: CurrentUser,
    req_status: str | None = Query(None, alias="status"),
    service_id: UUID | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
) -> Any:
    stmt = select(ServiceRequest)

    if current_user.role == "citizen":
        stmt = stmt.where(ServiceRequest.citizen_id == current_user.id)
    elif current_user.role == "centre_employee":
        from app.models.profile import EmployeeProfile

        employee = session.get(EmployeeProfile, current_user.id)
        if not employee:
            raise HTTPException(status_code=403, detail="Employee profile not found")
        stmt = stmt.where(ServiceRequest.selected_centre_id == employee.centre_id)
    elif current_user.role == "centre_administrator":
        from app.models.profile import CentreAdministrator

        admin = session.get(CentreAdministrator, current_user.id)
        if not admin:
            raise HTTPException(status_code=403, detail="Admin profile not found")
        stmt = stmt.where(ServiceRequest.selected_centre_id == admin.centre_id)
    # system_administrator: sees all, no filter

    if req_status:
        stmt = stmt.where(ServiceRequest.status == req_status)
    if service_id:
        stmt = stmt.where(ServiceRequest.service_id == service_id)

    stmt = stmt.order_by(ServiceRequest.created_at.desc()).offset(skip).limit(limit)
    return session.scalars(stmt).all()


@router.get("/{request_id}", response_model=ServiceRequestResponse)
def get_request(
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")

    _verify_request_access(current_user, service_request, session)
    return service_request


@router.post("/{request_id}/select-centre", response_model=ServiceRequestResponse)
def select_centre(
    *,
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUserCitizen,
    body: SelectCentreRequest,
) -> Any:
    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    if service_request.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if service_request.status != "DRAFT":
        raise HTTPException(status_code=409, detail="Request must be in DRAFT state")

    centre = session.get(AkshayaCentre, body.centre_id)
    if not centre or not centre.is_active:
        raise HTTPException(status_code=404, detail="Centre not found or inactive")

    supported = session.scalar(
        select(CentreSupportedService).where(
            CentreSupportedService.centre_id == body.centre_id,
            CentreSupportedService.service_id == service_request.service_id,
            CentreSupportedService.is_active == True,  # noqa: E712
        )
    )
    if not supported:
        raise HTTPException(status_code=409, detail="Centre does not support this service")

    service_request.selected_centre_id = body.centre_id
    if supported.centre_fee_override is not None:
        service_request.fee_snapshot = supported.centre_fee_override
    session.add(service_request)
    session.commit()
    session.refresh(service_request)
    return service_request


@router.post("/{request_id}/submit", response_model=ServiceRequestResponse)
def submit_request(
    *,
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUserCitizen,
) -> Any:
    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    if service_request.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if service_request.status != "DRAFT":
        raise HTTPException(status_code=409, detail="Request must be in DRAFT state")
    if not service_request.selected_centre_id:
        raise HTTPException(status_code=409, detail="Centre must be selected before submitting")

    now = datetime.now(tz=UTC)
    service_request.status = "SUBMITTED"
    service_request.submitted_at = now
    session.add(service_request)
    session.flush()

    # Atomic transition to WAITING_FOR_CENTRE after routing succeeds
    service_request.status = "WAITING_FOR_CENTRE"
    session.add(service_request)
    session.commit()
    session.refresh(service_request)
    return service_request


def _verify_request_access(user: Any, service_request: ServiceRequest, session: Any) -> None:
    if user.role == "citizen" and service_request.citizen_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if user.role == "centre_employee":
        from app.models.profile import EmployeeProfile

        employee = session.get(EmployeeProfile, user.id)
        if not employee or employee.centre_id != service_request.selected_centre_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    if user.role == "centre_administrator":
        from app.models.profile import CentreAdministrator

        admin = session.get(CentreAdministrator, user.id)
        if not admin or admin.centre_id != service_request.selected_centre_id:
            raise HTTPException(status_code=403, detail="Not authorized")
