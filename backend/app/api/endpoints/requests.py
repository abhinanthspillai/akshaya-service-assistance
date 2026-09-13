from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path, PurePath
from typing import Annotated, Any
from uuid import UUID, uuid4

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select

from app.api.deps import (
    CurrentUser,
    CurrentUserCitizen,
    CurrentUserEmployee,
    SessionDep,
)
from app.core.config import get_settings
from app.models.centre import AkshayaCentre
from app.models.document import DOCUMENT_REVIEW_DECISIONS, RequestDocument, RequestDocumentReview
from app.models.interaction import RequestInteraction
from app.models.request import ServiceRequest
from app.models.service import (
    CentreSupportedService,
    Service,
    ServiceDocumentRequirement,
    ServiceInteractionRequirement,
)
from app.schemas.document import (
    RequestDocumentResponse,
    RequestDocumentReviewCreate,
    RequestDocumentReviewResponse,
)
from app.schemas.history import RequestHistoryResponse
from app.schemas.interaction import (
    InteractionOutcomeRequest,
    RequestInteractionResponse,
    RequireInteractionRequest,
    ScheduleInteractionRequest,
)
from app.schemas.request import (
    RequestPreValidationItem,
    RequestPreValidationResponse,
    SelectCentreRequest,
    ServiceRequestCreate,
    ServiceRequestResponse,
)

router = APIRouter()

_ALLOWED_EXTENSIONS_BY_MIME = {
    "application/pdf": {".pdf"},
    "image/jpeg": {".jpg", ".jpeg"},
    "image/png": {".png"},
}


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
    validation = _run_request_pre_validation(session, service_request)
    if not validation.is_valid:
        raise HTTPException(
            status_code=409,
            detail="Required document pre-validation failed",
        )

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


@router.post("/{request_id}/pre-validate", response_model=RequestPreValidationResponse)
def pre_validate_request(
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUserCitizen,
) -> RequestPreValidationResponse:
    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    if service_request.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if service_request.status not in {"DRAFT", "CORRECTION_REQUIRED"}:
        raise HTTPException(
            status_code=409,
            detail="Pre-validation is available only while drafting or correcting a request",
        )

    return _run_request_pre_validation(session, service_request)


@router.post("/{request_id}/start-review", response_model=ServiceRequestResponse)
def start_request_review(
    *,
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUserEmployee,
) -> Any:
    from app.models.assignment import RequestHistory

    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    _verify_active_assignment(current_user, service_request, session)
    if service_request.status != "ACCEPTED":
        raise HTTPException(status_code=409, detail="Request must be in ACCEPTED state")

    history = RequestHistory(
        request_id=request_id,
        actor_id=current_user.id,
        action="start_review",
        from_status=service_request.status,
        to_status="UNDER_REVIEW",
    )
    session.add(history)
    service_request.status = "UNDER_REVIEW"
    session.add(service_request)
    session.commit()
    session.refresh(service_request)
    return service_request


@router.get("/{request_id}/documents", response_model=list[RequestDocumentResponse])
def list_request_documents(
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")

    _verify_document_access(current_user, service_request, session)

    documents = session.scalars(
        select(RequestDocument)
        .where(RequestDocument.request_id == request_id)
        .order_by(RequestDocument.requirement_id, RequestDocument.version)
    ).all()
    return documents


@router.post(
    "/{request_id}/documents",
    response_model=RequestDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_request_document(
    *,
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUserCitizen,
    requirement_id: Annotated[UUID, Form()],
    file: Annotated[UploadFile, File()],
) -> Any:
    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    if service_request.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if service_request.status not in {"DRAFT", "CORRECTION_REQUIRED"}:
        raise HTTPException(
            status_code=409,
            detail="Documents can be uploaded only while drafting or correcting a request",
        )

    requirement = session.scalar(
        select(ServiceDocumentRequirement).where(
            ServiceDocumentRequirement.id == requirement_id,
            ServiceDocumentRequirement.service_id == service_request.service_id,
            ServiceDocumentRequirement.is_active.is_(True),
        )
    )
    if not requirement:
        raise HTTPException(status_code=404, detail="Document requirement not found")

    content_type = file.content_type or "application/octet-stream"
    allowed_types = {allowed.mime_type for allowed in requirement.allowed_file_types}
    if allowed_types and content_type not in allowed_types:
        raise HTTPException(status_code=422, detail="Unsupported file type")

    original_filename = PurePath(file.filename or "upload").name[:255] or "upload"
    suffix = Path(original_filename).suffix.lower()
    allowed_extensions = _ALLOWED_EXTENSIONS_BY_MIME.get(content_type)
    if allowed_extensions and suffix not in allowed_extensions:
        raise HTTPException(status_code=422, detail="File extension does not match content type")

    data = await file.read()
    size = len(data)
    max_size = requirement.max_file_size_bytes or get_settings().max_upload_size_bytes
    if size == 0:
        raise HTTPException(status_code=422, detail="Uploaded file must not be empty")
    if size > max_size:
        raise HTTPException(status_code=413, detail="Uploaded file exceeds allowed size")

    now = datetime.now(tz=UTC)
    existing_documents = session.scalars(
        select(RequestDocument).where(
            RequestDocument.request_id == request_id,
            RequestDocument.requirement_id == requirement_id,
            RequestDocument.is_current.is_(True),
        )
    ).all()
    for existing_document in existing_documents:
        existing_document.is_current = False
        existing_document.replaced_at = now
        session.add(existing_document)

    latest_version = (
        session.scalar(
            select(RequestDocument.version)
            .where(
                RequestDocument.request_id == request_id,
                RequestDocument.requirement_id == requirement_id,
            )
            .order_by(RequestDocument.version.desc())
            .limit(1)
        )
        or 0
    )
    storage_key = _write_private_upload(
        request_id=request_id,
        original_filename=original_filename,
        data=data,
    )
    document = RequestDocument(
        request_id=request_id,
        requirement_id=requirement_id,
        uploaded_by_id=current_user.id,
        storage_key=storage_key,
        original_filename=original_filename,
        content_type=content_type,
        size_bytes=size,
        sha256=sha256(data).hexdigest(),
        version=latest_version + 1,
        is_current=True,
        uploaded_at=now,
    )
    session.add(document)

    if service_request.status == "CORRECTION_REQUIRED":
        from app.models.assignment import RequestHistory

        history = RequestHistory(
            request_id=request_id,
            actor_id=current_user.id,
            action="submit_correction",
            from_status=service_request.status,
            to_status="UNDER_REVIEW",
            note=f"Replacement uploaded for {requirement.name}",
        )
        session.add(history)
        service_request.status = "UNDER_REVIEW"
        session.add(service_request)

    session.commit()
    session.refresh(document)
    return document


@router.get("/{request_id}/documents/{document_id}/download")
def download_request_document(
    request_id: UUID,
    document_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> FileResponse:
    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")

    _verify_document_access(current_user, service_request, session)

    document = session.scalar(
        select(RequestDocument).where(
            RequestDocument.id == document_id,
            RequestDocument.request_id == request_id,
        )
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    path = _resolve_storage_path(document.storage_key)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Document file not found")

    return FileResponse(
        path,
        media_type=document.content_type,
        filename=document.original_filename,
    )


@router.get(
    "/{request_id}/document-reviews",
    response_model=list[RequestDocumentReviewResponse],
)
def list_document_reviews(
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    _verify_document_access(current_user, service_request, session)

    reviews = session.scalars(
        select(RequestDocumentReview)
        .where(RequestDocumentReview.request_id == request_id)
        .order_by(RequestDocumentReview.created_at.asc())
    ).all()
    return reviews


@router.post(
    "/{request_id}/documents/{document_id}/review",
    response_model=RequestDocumentReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def review_request_document(
    *,
    request_id: UUID,
    document_id: UUID,
    session: SessionDep,
    current_user: CurrentUserEmployee,
    body: RequestDocumentReviewCreate,
) -> Any:
    from app.models.assignment import RequestHistory

    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    _verify_active_assignment(current_user, service_request, session)
    if service_request.status != "UNDER_REVIEW":
        raise HTTPException(status_code=409, detail="Request must be in UNDER_REVIEW state")

    if body.decision not in DOCUMENT_REVIEW_DECISIONS:
        raise HTTPException(status_code=422, detail="Unsupported review decision")
    if body.decision != "APPROVED" and not body.reason:
        raise HTTPException(status_code=422, detail="A reason is required for this decision")

    document = session.scalar(
        select(RequestDocument).where(
            RequestDocument.id == document_id,
            RequestDocument.request_id == request_id,
            RequestDocument.is_current.is_(True),
        )
    )
    if not document:
        raise HTTPException(status_code=404, detail="Current document not found")

    review = RequestDocumentReview(
        request_id=request_id,
        document_id=document_id,
        requirement_id=document.requirement_id,
        reviewer_id=current_user.id,
        decision=body.decision,
        reason=body.reason,
    )
    session.add(review)

    if body.decision != "APPROVED":
        history = RequestHistory(
            request_id=request_id,
            actor_id=current_user.id,
            action="document_correction_required",
            from_status=service_request.status,
            to_status="CORRECTION_REQUIRED",
            note=body.reason,
        )
        session.add(history)
        service_request.status = "CORRECTION_REQUIRED"
        session.add(service_request)
    else:
        history = RequestHistory(
            request_id=request_id,
            actor_id=current_user.id,
            action="document_approved",
            from_status=service_request.status,
            to_status=service_request.status,
            note=f"Document {document.original_filename} approved",
        )
        session.add(history)

    session.commit()
    session.refresh(review)
    return review


@router.get("/{request_id}/interactions", response_model=list[RequestInteractionResponse])
def list_request_interactions(
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    _verify_document_access(current_user, service_request, session)
    interactions = session.scalars(
        select(RequestInteraction)
        .where(RequestInteraction.request_id == request_id)
        .order_by(RequestInteraction.created_at.asc())
    ).all()
    return interactions


@router.post(
    "/{request_id}/require-interaction",
    response_model=RequestInteractionResponse,
    status_code=status.HTTP_201_CREATED,
)
def require_request_interaction(
    *,
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUserEmployee,
    body: RequireInteractionRequest,
) -> Any:
    from app.models.assignment import RequestHistory

    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    _verify_active_assignment(current_user, service_request, session)
    if service_request.status not in {"UNDER_REVIEW", "CORRECTION_REQUIRED"}:
        raise HTTPException(status_code=409, detail="Request is not ready for interaction request")

    requirement = session.scalar(
        select(ServiceInteractionRequirement).where(
            ServiceInteractionRequirement.id == body.requirement_id,
            ServiceInteractionRequirement.service_id == service_request.service_id,
            ServiceInteractionRequirement.is_active.is_(True),
        )
    )
    if not requirement:
        raise HTTPException(status_code=404, detail="Interaction requirement not found")

    interaction = RequestInteraction(
        request_id=request_id,
        requirement_id=body.requirement_id,
        requested_by_id=current_user.id,
        status="REQUESTED",
        reason=body.reason,
        instructions=body.instructions,
    )
    session.add(interaction)
    history = RequestHistory(
        request_id=request_id,
        actor_id=current_user.id,
        action="interaction_required",
        from_status=service_request.status,
        to_status="INTERACTION_REQUIRED",
        note=body.reason,
    )
    session.add(history)
    service_request.status = "INTERACTION_REQUIRED"
    session.add(service_request)
    session.commit()
    session.refresh(interaction)
    return interaction


@router.post("/{request_id}/schedule-interaction", response_model=RequestInteractionResponse)
def schedule_request_interaction(
    *,
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
    body: ScheduleInteractionRequest,
) -> Any:
    from app.models.assignment import RequestHistory

    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    if current_user.role == "citizen":
        if service_request.citizen_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == "centre_employee":
        _verify_active_assignment(current_user, service_request, session)
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    if service_request.status != "INTERACTION_REQUIRED":
        raise HTTPException(status_code=409, detail="Request must require interaction")

    interaction = session.scalar(
        select(RequestInteraction).where(
            RequestInteraction.id == body.interaction_id,
            RequestInteraction.request_id == request_id,
            RequestInteraction.status.in_(["REQUESTED", "MISSED"]),
        )
    )
    if not interaction:
        raise HTTPException(status_code=404, detail="Schedulable interaction not found")

    interaction.status = "SCHEDULED"
    interaction.scheduled_at = body.scheduled_at
    interaction.scheduled_by_id = current_user.id
    session.add(interaction)
    history = RequestHistory(
        request_id=request_id,
        actor_id=current_user.id,
        action="interaction_scheduled",
        from_status=service_request.status,
        to_status="INTERACTION_SCHEDULED",
    )
    session.add(history)
    service_request.status = "INTERACTION_SCHEDULED"
    session.add(service_request)
    session.commit()
    session.refresh(interaction)
    return interaction


@router.post(
    "/{request_id}/interactions/{interaction_id}/outcome",
    response_model=RequestInteractionResponse,
)
def record_interaction_outcome(
    *,
    request_id: UUID,
    interaction_id: UUID,
    session: SessionDep,
    current_user: CurrentUserEmployee,
    body: InteractionOutcomeRequest,
) -> Any:
    from app.models.assignment import RequestHistory

    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    _verify_active_assignment(current_user, service_request, session)
    if service_request.status != "INTERACTION_SCHEDULED":
        raise HTTPException(status_code=409, detail="Request must have scheduled interaction")
    if body.outcome not in {"COMPLETED", "MISSED"}:
        raise HTTPException(status_code=422, detail="Unsupported interaction outcome")

    interaction = session.scalar(
        select(RequestInteraction).where(
            RequestInteraction.id == interaction_id,
            RequestInteraction.request_id == request_id,
            RequestInteraction.status == "SCHEDULED",
        )
    )
    if not interaction:
        raise HTTPException(status_code=404, detail="Scheduled interaction not found")

    interaction.status = body.outcome
    interaction.outcome_note = body.note
    interaction.outcome_recorded_by_id = current_user.id
    session.add(interaction)

    next_status = "UNDER_REVIEW" if body.outcome == "COMPLETED" else "INTERACTION_REQUIRED"
    history = RequestHistory(
        request_id=request_id,
        actor_id=current_user.id,
        action="interaction_" + body.outcome.lower(),
        from_status=service_request.status,
        to_status=next_status,
        note=body.note,
    )
    session.add(history)
    service_request.status = next_status
    session.add(service_request)
    session.commit()
    session.refresh(interaction)
    return interaction


@router.post("/{request_id}/accept", response_model=ServiceRequestResponse)
def accept_request(
    *,
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUserEmployee,
) -> Any:
    from datetime import datetime

    from sqlalchemy import func

    from app.models.assignment import RequestAssignment, RequestHistory
    from app.models.profile import EmployeeProfile

    employee = session.get(EmployeeProfile, current_user.id)
    if not employee or not employee.is_available:
        raise HTTPException(status_code=403, detail="Employee profile unavailable")

    service_request = session.scalar(
        select(ServiceRequest)
        .where(
            ServiceRequest.id == request_id,
            ServiceRequest.selected_centre_id == employee.centre_id,
        )
        .with_for_update()
    )
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found in your centre")
    if service_request.status != "WAITING_FOR_CENTRE":
        raise HTTPException(status_code=409, detail="Request must be in WAITING_FOR_CENTRE state")

    active_count = (
        session.scalar(
            select(func.count())
            .select_from(RequestAssignment)
            .where(
                RequestAssignment.employee_id == current_user.id,
                RequestAssignment.is_active.is_(True),
            )
        )
        or 0
    )
    if active_count >= employee.max_active_requests:
        raise HTTPException(status_code=409, detail="Employee at maximum capacity")

    now = datetime.now(tz=UTC)
    existing_assignments = session.scalars(
        select(RequestAssignment).where(
            RequestAssignment.request_id == request_id,
            RequestAssignment.is_active.is_(True),
        )
    ).all()
    for existing in existing_assignments:
        existing.is_active = False
        existing.revoked_at = now
        session.add(existing)

    assignment = RequestAssignment(
        request_id=request_id, employee_id=current_user.id, is_active=True, assigned_at=now
    )
    session.add(assignment)

    history = RequestHistory(
        request_id=request_id,
        actor_id=current_user.id,
        action="accept",
        from_status=service_request.status,
        to_status="ACCEPTED",
    )
    session.add(history)

    service_request.status = "ACCEPTED"
    session.add(service_request)
    session.commit()
    session.refresh(service_request)
    return service_request


@router.get("/{request_id}/history", response_model=list[RequestHistoryResponse])
def get_request_history(
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")

    _verify_request_access(current_user, service_request, session)

    from app.models.assignment import RequestHistory

    history = session.scalars(
        select(RequestHistory)
        .where(RequestHistory.request_id == request_id)
        .order_by(RequestHistory.created_at.asc())
    ).all()
    return history


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


def _verify_document_access(user: Any, service_request: ServiceRequest, session: Any) -> None:
    if user.role == "citizen":
        if service_request.citizen_id != user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        return

    if user.role == "centre_employee":
        from app.models.assignment import RequestAssignment

        assignment = session.scalar(
            select(RequestAssignment).where(
                RequestAssignment.request_id == service_request.id,
                RequestAssignment.employee_id == user.id,
                RequestAssignment.is_active.is_(True),
            )
        )
        if not assignment:
            raise HTTPException(status_code=403, detail="Not authorized")
        return

    if user.role == "centre_administrator":
        from app.models.profile import CentreAdministrator

        admin = session.get(CentreAdministrator, user.id)
        if not admin or admin.centre_id != service_request.selected_centre_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        return

    if user.role != "system_administrator":
        raise HTTPException(status_code=403, detail="Not authorized")


def _verify_active_assignment(user: Any, service_request: ServiceRequest, session: Any) -> None:
    from app.models.assignment import RequestAssignment

    assignment = session.scalar(
        select(RequestAssignment).where(
            RequestAssignment.request_id == service_request.id,
            RequestAssignment.employee_id == user.id,
            RequestAssignment.is_active.is_(True),
        )
    )
    if not assignment:
        raise HTTPException(status_code=403, detail="Not authorized")


def _run_request_pre_validation(
    session: Any, service_request: ServiceRequest
) -> RequestPreValidationResponse:
    requirements = session.scalars(
        select(ServiceDocumentRequirement)
        .where(
            ServiceDocumentRequirement.service_id == service_request.service_id,
            ServiceDocumentRequirement.is_active.is_(True),
        )
        .order_by(ServiceDocumentRequirement.sort_order, ServiceDocumentRequirement.name)
    ).all()
    current_documents = session.scalars(
        select(RequestDocument).where(
            RequestDocument.request_id == service_request.id,
            RequestDocument.is_current.is_(True),
        )
    ).all()
    documents_by_requirement = {document.requirement_id: document for document in current_documents}

    items: list[RequestPreValidationItem] = []
    is_valid = True
    warnings = []
    seen_hashes: dict[str, str] = {}
    for requirement in requirements:
        messages: list[str] = []
        document = documents_by_requirement.get(requirement.id)
        allowed_types = {allowed.mime_type for allowed in requirement.allowed_file_types}
        max_size = requirement.max_file_size_bytes or get_settings().max_upload_size_bytes

        if not document:
            if requirement.is_required:
                messages.append("Required document has not been uploaded.")
                is_valid = False
                status_value = "FAIL"
            else:
                status_value = "PASS"
                messages.append("Optional document not uploaded.")
        else:
            status_value = "PASS"
            if document.size_bytes <= 0:
                messages.append("Uploaded file is empty.")
                is_valid = False
                status_value = "FAIL"
            if document.size_bytes > max_size:
                messages.append("Uploaded file exceeds the configured size limit.")
                is_valid = False
                status_value = "FAIL"
            if allowed_types and document.content_type not in allowed_types:
                messages.append("Uploaded file type is not allowed for this requirement.")
                is_valid = False
                status_value = "FAIL"
            if document.sha256 in seen_hashes:
                warning = f"{requirement.name} appears to duplicate {seen_hashes[document.sha256]}."
                messages.append(warning)
                warnings.append(warning)
                if status_value == "PASS":
                    status_value = "WARNING"
            else:
                seen_hashes[document.sha256] = requirement.name
            if not messages:
                messages.append("Document is present and matches configured file rules.")

        items.append(
            RequestPreValidationItem(
                requirement_id=requirement.id,
                requirement_name=requirement.name,
                status=status_value,
                messages=messages,
            )
        )

    return RequestPreValidationResponse(
        request_id=service_request.id,
        is_valid=is_valid,
        items=items,
        warnings=warnings,
    )


def _write_private_upload(*, request_id: UUID, original_filename: str, data: bytes) -> str:
    safe_suffix = Path(original_filename).suffix.lower()
    storage_key = f"request-documents/{request_id}/{uuid4().hex}{safe_suffix}"
    path = _resolve_storage_path(storage_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return storage_key


def _resolve_storage_path(storage_key: str) -> Path:
    root = Path(get_settings().file_storage_path).resolve()
    path = (root / storage_key).resolve()
    if root != path and root not in path.parents:
        raise HTTPException(status_code=500, detail="Invalid storage path")
    return path
