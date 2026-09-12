from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, CurrentUserSysAdmin, SessionDep
from app.models.centre import AkshayaCentre
from app.models.service import (
    CentreSupportedService,
    Service,
    ServiceDocumentRequirement,
    ServiceInteractionRequirement,
    ServiceRequirementAllowedFileType,
)
from app.schemas.centre import AkshayaCentreResponse
from app.schemas.service import (
    ServiceCreate,
    ServiceDetailResponse,
    ServiceDocumentRequirementCreate,
    ServiceInteractionRequirementCreate,
    ServiceResponse,
    ServiceUpdate,
)

router = APIRouter()


@router.get("/", response_model=list[ServiceResponse])
def get_services(
    session: SessionDep,
    current_user: CurrentUser,
    service_type: str | None = None,
    active: bool = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
) -> Any:
    stmt = select(Service)
    if service_type:
        stmt = stmt.where(Service.service_type == service_type)
    if active:
        stmt = stmt.where(Service.is_active)

    stmt = stmt.offset(skip).limit(limit)
    services = session.scalars(stmt).all()
    return services


@router.get("/{service_id}", response_model=ServiceDetailResponse)
def get_service(
    service_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    stmt = (
        select(Service)
        .where(Service.id == service_id)
        .options(
            selectinload(Service.document_requirements).selectinload(
                ServiceDocumentRequirement.allowed_file_types
            ),
            selectinload(Service.interaction_requirements),
        )
    )
    service = session.scalar(stmt)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.post("/", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
def create_service(
    *,
    session: SessionDep,
    service_in: ServiceCreate,
    current_user: CurrentUserSysAdmin,
) -> Any:
    if session.scalar(select(Service).where(Service.code == service_in.code)):
        raise HTTPException(status_code=409, detail="Service code already exists")

    service = Service(**service_in.model_dump())
    session.add(service)
    session.commit()
    session.refresh(service)
    return service


@router.patch("/{service_id}", response_model=ServiceResponse)
def update_service(
    *,
    session: SessionDep,
    service_id: UUID,
    service_in: ServiceUpdate,
    current_user: CurrentUserSysAdmin,
) -> Any:
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    update_data = service_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)

    session.add(service)
    session.commit()
    session.refresh(service)
    return service


@router.put(
    "/{service_id}/document-requirements", response_model=list[ServiceDocumentRequirementCreate]
)
def update_document_requirements(
    *,
    session: SessionDep,
    service_id: UUID,
    requirements_in: list[ServiceDocumentRequirementCreate],
    current_user: CurrentUserSysAdmin,
) -> Any:
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Delete existing requirements
    session.query(ServiceDocumentRequirement).filter(
        ServiceDocumentRequirement.service_id == service_id
    ).delete()

    for req_in in requirements_in:
        req_data = req_in.model_dump(exclude={"allowed_file_types"})
        req = ServiceDocumentRequirement(service_id=service_id, **req_data)
        session.add(req)
        session.flush()

        for ft in req_in.allowed_file_types:
            session.add(
                ServiceRequirementAllowedFileType(requirement_id=req.id, mime_type=ft.mime_type)
            )

    session.commit()
    return requirements_in


@router.put(
    "/{service_id}/interaction-requirements",
    response_model=list[ServiceInteractionRequirementCreate],
)
def update_interaction_requirements(
    *,
    session: SessionDep,
    service_id: UUID,
    requirements_in: list[ServiceInteractionRequirementCreate],
    current_user: CurrentUserSysAdmin,
) -> Any:
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Delete existing interaction requirements
    session.query(ServiceInteractionRequirement).filter(
        ServiceInteractionRequirement.service_id == service_id
    ).delete()

    for req_in in requirements_in:
        req = ServiceInteractionRequirement(service_id=service_id, **req_in.model_dump())
        session.add(req)

    session.commit()
    return requirements_in


@router.get("/{service_id}/centres", response_model=list[AkshayaCentreResponse])
def get_service_centres(
    service_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    service = session.get(Service, service_id)
    if not service or not service.is_active:
        raise HTTPException(status_code=404, detail="Service not found")

    stmt = (
        select(AkshayaCentre)
        .join(CentreSupportedService, CentreSupportedService.centre_id == AkshayaCentre.id)
        .where(CentreSupportedService.service_id == service_id)
        .where(AkshayaCentre.is_active)
        .where(CentreSupportedService.is_active)
    )
    centres = session.scalars(stmt).all()
    return centres
