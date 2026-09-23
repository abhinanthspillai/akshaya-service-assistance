from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, CurrentUserSysAdmin, SessionDep
from app.core.audit import log_audit
from app.models.centre import AkshayaCentre
from app.models.profile import CentreAdministrator
from app.models.service import CentreSupportedService, Service
from app.models.user import User
from app.schemas.centre import AkshayaCentreCreate, AkshayaCentreResponse, AkshayaCentreUpdate
from app.schemas.service import (
    CentreSupportedServiceCreate,
    CentreSupportedServiceResponse,
    CentreSupportedServiceUpdate,
)

router = APIRouter()


@router.get("/", response_model=list[AkshayaCentreResponse])
def get_centres(
    session: SessionDep,
    current_user: CurrentUser,
    district: str | None = None,
    active: bool = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
) -> Any:
    stmt = select(AkshayaCentre)
    if district:
        stmt = stmt.where(AkshayaCentre.district == district)
    if active:
        stmt = stmt.where(AkshayaCentre.is_active)

    stmt = stmt.offset(skip).limit(limit)
    centres = session.scalars(stmt).all()
    return centres


@router.get("/{centre_id}", response_model=AkshayaCentreResponse)
def get_centre(
    centre_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    centre = session.get(AkshayaCentre, centre_id)
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")
    # TODO: Include supported services summary in the future slice
    return centre


@router.post("/", response_model=AkshayaCentreResponse, status_code=status.HTTP_201_CREATED)
def create_centre(
    *,
    session: SessionDep,
    current_user: CurrentUserSysAdmin,
    centre_in: AkshayaCentreCreate,
) -> Any:
    existing = session.scalar(select(AkshayaCentre).where(AkshayaCentre.code == centre_in.code))
    if existing:
        raise HTTPException(status_code=409, detail="Centre code already exists")

    centre = AkshayaCentre(**centre_in.model_dump())
    session.add(centre)
    log_audit(
        session,
        actor_id=current_user.id,
        action="create_centre",
        target_resource_type="AkshayaCentre",
        target_resource_id=str(centre.id),
        details={"code": centre.code, "name": centre.name}
    )
    session.commit()
    session.refresh(centre)
    return centre


@router.patch("/{centre_id}", response_model=AkshayaCentreResponse)
def update_centre(
    *,
    session: SessionDep,
    current_user: CurrentUserSysAdmin,
    centre_id: UUID,
    centre_in: AkshayaCentreUpdate,
) -> Any:
    centre = session.get(AkshayaCentre, centre_id)
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")

    update_data = centre_in.model_dump(exclude_unset=True)

    if "code" in update_data and update_data["code"] != centre.code:
        existing = session.scalar(
            select(AkshayaCentre).where(AkshayaCentre.code == update_data["code"])
        )
        if existing:
            raise HTTPException(status_code=409, detail="Centre code already exists")

    for field, value in update_data.items():
        setattr(centre, field, value)

    session.add(centre)
    log_audit(
        session,
        actor_id=current_user.id,
        action="update_centre",
        target_resource_type="AkshayaCentre",
        target_resource_id=str(centre.id),
        details=update_data
    )
    session.commit()
    session.refresh(centre)
    return centre


def _verify_centre_admin_or_sysadmin(session: SessionDep, user: User, centre_id: UUID) -> None:
    if user.role == "system_administrator":
        return
    if user.role != "centre_administrator":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    admin = session.get(CentreAdministrator, user.id)
    if not admin or admin.centre_id != centre_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this centre")


@router.get("/{centre_id}/services", response_model=list[CentreSupportedServiceResponse])
def get_centre_services(
    centre_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    stmt = select(CentreSupportedService).where(CentreSupportedService.centre_id == centre_id)
    return session.scalars(stmt).all()


@router.post(
    "/{centre_id}/services",
    response_model=CentreSupportedServiceResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_centre_service(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    centre_id: UUID,
    service_in: CentreSupportedServiceCreate,
) -> Any:
    _verify_centre_admin_or_sysadmin(session, current_user, centre_id)

    centre = session.get(AkshayaCentre, centre_id)
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")

    service = session.get(Service, service_in.service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    existing = session.scalar(
        select(CentreSupportedService).where(
            CentreSupportedService.centre_id == centre_id,
            CentreSupportedService.service_id == service_in.service_id,
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Service already supported by centre")

    supported_service = CentreSupportedService(centre_id=centre_id, **service_in.model_dump())
    session.add(supported_service)
    log_audit(
        session,
        actor_id=current_user.id,
        action="add_centre_service",
        target_resource_type="CentreSupportedService",
        target_resource_id=f"{centre_id}:{service_in.service_id}",
        details={"service_id": str(service_in.service_id)}
    )
    session.commit()
    session.refresh(supported_service)
    return supported_service


@router.patch("/{centre_id}/services/{service_id}", response_model=CentreSupportedServiceResponse)
def update_centre_service(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    centre_id: UUID,
    service_id: UUID,
    service_in: CentreSupportedServiceUpdate,
) -> Any:
    _verify_centre_admin_or_sysadmin(session, current_user, centre_id)

    supported_service = session.get(CentreSupportedService, (centre_id, service_id))
    if not supported_service:
        raise HTTPException(status_code=404, detail="Supported service not found")

    update_data = service_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supported_service, field, value)

    session.add(supported_service)
    log_audit(
        session,
        actor_id=current_user.id,
        action="update_centre_service",
        target_resource_type="CentreSupportedService",
        target_resource_id=f"{centre_id}:{service_id}",
        details=update_data
    )
    session.commit()
    session.refresh(supported_service)
    return supported_service


@router.delete(
    "/{centre_id}/services/{service_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
def remove_centre_service(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    centre_id: UUID,
    service_id: UUID,
) -> None:
    _verify_centre_admin_or_sysadmin(session, current_user, centre_id)

    supported_service = session.get(CentreSupportedService, (centre_id, service_id))
    if not supported_service:
        raise HTTPException(status_code=404, detail="Supported service not found")

    session.delete(supported_service)
    log_audit(
        session,
        actor_id=current_user.id,
        action="remove_centre_service",
        target_resource_type="CentreSupportedService",
        target_resource_id=f"{centre_id}:{service_id}",
        details={"service_id": str(service_id)}
    )
    session.commit()
    return None
