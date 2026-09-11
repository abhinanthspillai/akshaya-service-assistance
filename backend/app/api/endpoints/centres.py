from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, CurrentUserSysAdmin, SessionDep
from app.models.centre import AkshayaCentre
from app.schemas.centre import AkshayaCentreCreate, AkshayaCentreResponse, AkshayaCentreUpdate

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
    session.commit()
    session.refresh(centre)
    return centre
