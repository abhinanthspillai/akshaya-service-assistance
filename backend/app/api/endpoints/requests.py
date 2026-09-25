from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path, PurePath
from typing import Annotated, Any, cast
from uuid import UUID, uuid4

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select

from app.api.deps import (
    CurrentUser,
    CurrentUserCitizen,
    CurrentUserEmployee,
    SessionDep,
)
from app.core.config import get_settings
from app.models.assignment import RequestAssignment, RequestHistory
from app.models.enums import RequestAction
from app.models.centre import AkshayaCentre
from app.models.document import DOCUMENT_REVIEW_DECISIONS, RequestDocument, RequestDocumentReview
from app.models.interaction import RequestInteraction
from app.models.message import RequestMessage
from app.models.notification import Notification
from app.models.output import CompletedOutput
from app.models.payment import RequestPayment
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
from app.schemas.message import RequestMessageCreate, RequestMessageResponse
from app.schemas.output import CompletedOutputCreate, CompletedOutputResponse
from app.schemas.payment import RequestPaymentResponse
from app.schemas.request import (
    DashboardResponse,
    PaginatedRequests,
    ReassignRequest,
    RequestPreValidationItem,
    RequestPreValidationResponse,
    SelectCentreRequest,
    ServiceRequestCreate,
    ServiceRequestResponse,
    UnableToProceedRequest,
)

router = APIRouter()

ALLOWED_TRANSITIONS = {
    "DRAFT": [("SUBMITTED", ["citizen"]), ("CANCELLED", ["citizen"])],
    "SUBMITTED": [("WAITING_FOR_CENTRE", ["citizen", "system"]), ("CANCELLED", ["citizen"])],
    "WAITING_FOR_CENTRE": [("ACCEPTED", ["centre_employee"]), ("CANCELLED", ["citizen"])],
    "ACCEPTED": [("UNDER_REVIEW", ["centre_employee"]), ("UNABLE_TO_PROCEED", ["centre_employee", "centre_administrator", "system_administrator"]), ("CANCELLED", ["citizen"])],
    "UNDER_REVIEW": [
        ("CORRECTION_REQUIRED", ["centre_employee"]),
        ("INTERACTION_REQUIRED", ["centre_employee"]),
        ("READY_FOR_PROCESSING", ["centre_employee"]),
        ("UNABLE_TO_PROCEED", ["centre_employee", "centre_administrator", "system_administrator"]),
        ("CANCELLED", ["citizen"]),
    ],
    "CORRECTION_REQUIRED": [
        ("UNDER_REVIEW", ["citizen", "centre_employee", "system"]),
        ("INTERACTION_REQUIRED", ["centre_employee"]),
        ("UNABLE_TO_PROCEED", ["centre_employee", "centre_administrator", "system_administrator"]),
        ("CANCELLED", ["citizen"]),
    ],
    "INTERACTION_REQUIRED": [
        ("INTERACTION_SCHEDULED", ["citizen", "centre_employee"]),
        ("UNABLE_TO_PROCEED", ["centre_employee", "centre_administrator", "system_administrator"]),
        ("CANCELLED", ["citizen"]),
    ],
    "INTERACTION_SCHEDULED": [
        ("UNDER_REVIEW", ["centre_employee", "system"]),
        ("INTERACTION_REQUIRED", ["centre_employee", "system"]),
        ("UNABLE_TO_PROCEED", ["centre_employee", "centre_administrator", "system_administrator"]),
        ("CANCELLED", ["citizen"]),
    ],
    "READY_FOR_PROCESSING": [
        ("PROCESSING", ["centre_employee"]),
        ("UNABLE_TO_PROCEED", ["centre_employee", "centre_administrator", "system_administrator"]),
    ],
    "PROCESSING": [
        ("PAYMENT_PENDING", ["centre_employee"]),
        ("COMPLETED", ["centre_employee", "centre_administrator", "system_administrator"]),
        ("UNABLE_TO_PROCEED", ["centre_employee", "centre_administrator", "system_administrator"]),
    ],
    "PAYMENT_PENDING": [
        ("PROCESSING", ["citizen", "centre_employee", "system"]),
        ("PAYMENT_PENDING", ["citizen", "centre_employee", "system"]),
        ("COMPLETED", ["centre_employee", "centre_administrator", "system_administrator"]),
    ],
    "COMPLETED": [("CLOSED", ["citizen", "system"])],
    "CLOSED": [],
    "CANCELLED": [],
    "UNABLE_TO_PROCEED": [],
}

def _perform_transition(
    session,
    service_request,
    current_user,
    to_status: str,
    action: str | RequestAction,
    note: str | None = None,
    notification_title: str | None = None,
    notification_body: str | None = None,
    notification_event: str | None = None,
) -> None:
    from fastapi import HTTPException

    from app.models.assignment import RequestHistory
    
    # Lock the row for update to prevent concurrent transitions
    session.refresh(service_request, with_for_update=True)
    
    if to_status not in [t[0] for t in ALLOWED_TRANSITIONS.get(service_request.status, [])]:
        raise HTTPException(status_code=409, detail=f"Cannot transition from {service_request.status} to {to_status}")
    
    allowed_roles = next((t[1] for t in ALLOWED_TRANSITIONS.get(service_request.status, []) if t[0] == to_status), [])
    if current_user.role not in allowed_roles and "system" not in allowed_roles:
        raise HTTPException(status_code=403, detail=f"Role {current_user.role} not allowed to transition {service_request.status} -> {to_status}")

    action_val = action.value if isinstance(action, RequestAction) else str(action)
    history = RequestHistory(
        request_id=service_request.id,
        actor_id=current_user.id,
        action=action_val,
        from_status=service_request.status,
        to_status=to_status,
        note=note,
    )
    session.add(history)
    service_request.status = to_status
    session.add(service_request)

    if not notification_event:
        notification_event = f"status_{to_status.lower()}"
    if not notification_title:
        notification_title = f"Request {to_status.replace('_', ' ').title()}"
    if not notification_body:
        if to_status == "UNABLE_TO_PROCEED":
            notification_body = f"Your request could not proceed. Reason: {note or 'Not specified'}"
        elif note:
            notification_body = f"Your request status changed to {to_status}. Note: {note}"
        else:
            notification_body = f"Your request status changed to {to_status}."

    _safe_add_notification(
        session,
        user_id=service_request.citizen_id,
        request_id=service_request.id,
        event_type=notification_event,
        title=notification_title,
        body=notification_body,
    )

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


@router.get("/", response_model=PaginatedRequests)
def list_requests(
    session: SessionDep,
    current_user: CurrentUser,
    req_status: str | None = Query(None, alias="status"),
    service_id: UUID | None = None,
    q: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100, alias="limit"),
    size: int | None = Query(None, ge=1, le=100),
) -> Any:
    page_size = size if size is not None else limit
    stmt = select(ServiceRequest)

    if current_user.role == "citizen":
        stmt = stmt.where(ServiceRequest.citizen_id == current_user.id)
        stmt = stmt.where(ServiceRequest.is_archived_by_citizen.is_(False))
    elif current_user.role == "centre_employee":
        from app.models.profile import EmployeeProfile

        employee = session.get(EmployeeProfile, current_user.id)
        if not employee:
            raise HTTPException(status_code=403, detail="Employee profile not found")
        if employee.approval_status != "APPROVED":
            raise HTTPException(status_code=403, detail="Account pending approval by centre")
        stmt = stmt.where(ServiceRequest.selected_centre_id == employee.centre_id)
    elif current_user.role == "centre_administrator":
        from app.models.profile import CentreAdministrator

        admin = session.get(CentreAdministrator, current_user.id)
        if not admin:
            raise HTTPException(status_code=403, detail="Admin profile not found")
        stmt = stmt.where(ServiceRequest.selected_centre_id == admin.centre_id)
    # system_administrator: sees all, no filter

    # Compute status counts for caller's scope before filters
    counts_rows = session.execute(
        select(ServiceRequest.status, func.count(ServiceRequest.id))
        .where(*stmt._where_criteria)
        .group_by(ServiceRequest.status)
    ).all()
    status_counts = {r[0]: r[1] for r in counts_rows}

    if req_status:
        if "," in req_status:
            stmt = stmt.where(ServiceRequest.status.in_(req_status.split(",")))
        else:
            stmt = stmt.where(ServiceRequest.status == req_status)
    if service_id:
        stmt = stmt.where(ServiceRequest.service_id == service_id)

    if q:
        clean_q = q.strip()
        if clean_q.startswith("#"):
            clean_q = clean_q[1:]
        if clean_q:
            escaped_q = clean_q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            search_pattern = f"%{escaped_q}%"
            from sqlalchemy import String, cast

            from app.models.profile import CitizenProfile

            stmt = stmt.outerjoin(CitizenProfile, ServiceRequest.citizen_id == CitizenProfile.user_id)
            stmt = stmt.where(
                (CitizenProfile.full_name.ilike(search_pattern, escape="\\"))
                | (CitizenProfile.phone.ilike(search_pattern, escape="\\"))
                | (ServiceRequest.service_name_snapshot.ilike(search_pattern, escape="\\"))
                | (cast(ServiceRequest.id, String).ilike(f"{escaped_q}%", escape="\\"))
            )

    # Get total count
    total = session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    
    import math
    pages = math.ceil(total / page_size) if total > 0 else 1
    
    skip = (page - 1) * page_size
    stmt = stmt.order_by(ServiceRequest.created_at.desc()).offset(skip).limit(page_size)
    items = session.scalars(stmt).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": pages,
        "status_counts": status_counts,
    }


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard_data(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    if current_user.role != "centre_employee":
        raise HTTPException(status_code=403, detail="Dashboard is only for centre employees")

    from app.models.profile import EmployeeProfile
    employee = session.get(EmployeeProfile, current_user.id)
    if not employee:
        raise HTTPException(status_code=403, detail="Employee profile not found")

    centre_id = employee.centre_id
    
    from datetime import datetime, timedelta

    from sqlalchemy import func
    
    # 1. Status counts
    counts = session.execute(
        select(ServiceRequest.status, func.count(ServiceRequest.id))
        .where(ServiceRequest.selected_centre_id == centre_id)
        .group_by(ServiceRequest.status)
    ).all()
    status_counts = {row[0]: row[1] for row in counts}
    
    # 2. Completed today
    now = datetime.now(UTC)
    # Actually, Asia/Kolkata boundaries. For simplicity, just use last 24h or so, but let's do a naive UTC day for now or timedelta(hours=5, minutes=30)
    # The requirement says Asia/Kolkata day boundaries.
    kolkata_offset = timedelta(hours=5, minutes=30)
    kolkata_now = now + kolkata_offset
    start_of_day_kolkata = datetime(kolkata_now.year, kolkata_now.month, kolkata_now.day, tzinfo=UTC) - kolkata_offset
    
    completed_today = session.scalar(
        select(func.count(ServiceRequest.id))
        .where(
            ServiceRequest.selected_centre_id == centre_id,
            ServiceRequest.status == "COMPLETED",
            ServiceRequest.completed_at >= start_of_day_kolkata
        )
    ) or 0
    
    # 3. Rejected last 30 days
    thirty_days_ago = now - timedelta(days=30)
    rejected_last_30_days = session.scalar(
        select(func.count(ServiceRequest.id))
        .where(
            ServiceRequest.selected_centre_id == centre_id,
            ServiceRequest.status == "UNABLE_TO_PROCEED",
            ServiceRequest.updated_at >= thirty_days_ago
        )
    ) or 0
    
    # 4. Needs attention (WAITING_FOR_CENTRE, ACCEPTED, UNDER_REVIEW, READY_FOR_PROCESSING, PROCESSING)
    attention_statuses = ["WAITING_FOR_CENTRE", "ACCEPTED", "UNDER_REVIEW", "READY_FOR_PROCESSING", "PROCESSING"]
    needs_attention = session.scalars(
        select(ServiceRequest)
        .where(
            ServiceRequest.selected_centre_id == centre_id,
            ServiceRequest.status.in_(attention_statuses)
        )
        .order_by(ServiceRequest.updated_at.asc())
        .limit(10)
    ).all()
    
    # 5. Recent activity
    recent_history = session.execute(
        select(RequestHistory, ServiceRequest.service_name_snapshot, ServiceRequest.citizen_id)
        .join(ServiceRequest, RequestHistory.request_id == ServiceRequest.id)
        .where(ServiceRequest.selected_centre_id == centre_id)
        .order_by(RequestHistory.created_at.desc())
        .limit(20)
    ).all()
    
    recent_activity = [
        {
            "id": h.RequestHistory.id,
            "request_id": h.RequestHistory.request_id,
            "action": h.RequestHistory.action,
            "note": h.RequestHistory.note,
            "created_at": h.RequestHistory.created_at,
            "actor_id": h.RequestHistory.actor_id,
            "request_service_name": h.service_name_snapshot,
            "request_citizen_id": h.citizen_id,
        }
        for h in recent_history
    ]

    return {
        "status_counts": status_counts,
        "completed_today": completed_today,
        "rejected_last_30_days": rejected_last_30_days,
        "needs_attention": needs_attention,
        "recent_activity": recent_activity,
    }


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
    service_request.submitted_at = now
    _perform_transition(session, service_request, current_user, "SUBMITTED", RequestAction.SUBMIT_REQUEST)
    session.flush()

    # Atomic transition to WAITING_FOR_CENTRE after routing succeeds
    _perform_transition(
        session, service_request, current_user, "WAITING_FOR_CENTRE", RequestAction.SUBMIT_REQUEST_ROUTING,
        notification_event="request_submitted",
        notification_title="Request submitted",
        notification_body="Your request has been submitted to the selected centre."
    )
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

    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    _verify_active_assignment(current_user, service_request, session)
    if service_request.status != "ACCEPTED":
        raise HTTPException(status_code=409, detail="Request must be in ACCEPTED state")

    _perform_transition(session, service_request, current_user, "UNDER_REVIEW", RequestAction.START_REVIEW)
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

    try:
        data = await file.read()
    finally:
        await file.close()

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
        session.flush()
        pending_reupload = session.scalar(
            select(func.count()).select_from(RequestDocument).where(
                RequestDocument.request_id == request_id,
                RequestDocument.is_current.is_(True),
                RequestDocument.status == "REUPLOAD_REQUIRED",
            )
        ) or 0
        if pending_reupload == 0:
            _perform_transition(session, service_request, current_user, "UNDER_REVIEW", RequestAction.SUBMIT_CORRECTION, note="All replacements uploaded.")

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

    now = datetime.now(tz=UTC)
    if body.decision == "APPROVED":
        document.status = "VERIFIED"
        document.verified_at = now
        document.verified_by_id = current_user.id
    elif body.decision == "REPLACEMENT_REQUESTED":
        document.status = "REUPLOAD_REQUIRED"
        document.employee_remarks = body.reason
    elif body.decision == "REJECTED":
        document.status = "REJECTED"
        document.employee_remarks = body.reason
    session.add(document)

    if body.decision != "APPROVED":
        _perform_transition(
            session, service_request, current_user, "CORRECTION_REQUIRED", RequestAction.DOCUMENT_CORRECTION_REQUIRED,
            note=body.reason,
            notification_event="correction_required",
            notification_title="Correction required",
            notification_body=body.reason
        )
    else:
        from app.models.assignment import RequestHistory
        history = RequestHistory(
            request_id=request_id,
            actor_id=current_user.id,
            action=RequestAction.DOCUMENT_APPROVED.value,
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
    _perform_transition(
        session, service_request, current_user, "INTERACTION_REQUIRED", RequestAction.INTERACTION_REQUIRED,
        note=body.reason,
        notification_event="interaction_required",
        notification_title="Interaction required",
        notification_body=body.reason
    )
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
    if current_user.role == "centre_employee":
        from app.models.profile import EmployeeProfile

        emp = session.get(EmployeeProfile, current_user.id)
        if not emp or emp.approval_status != "APPROVED":
            raise HTTPException(status_code=403, detail="Account pending approval by centre")

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
    _perform_transition(
        session, service_request, current_user, "INTERACTION_SCHEDULED", RequestAction.INTERACTION_SCHEDULED,
        notification_event="interaction_scheduled",
        notification_title="Interaction scheduled",
        notification_body="Your centre interaction has been scheduled."
    )
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
    outcome_action = RequestAction(f"interaction_{body.outcome.lower()}")
    _perform_transition(session, service_request, current_user, next_status, outcome_action, note=body.note)
    session.commit()
    session.refresh(interaction)
    return interaction


@router.get("/{request_id}/messages", response_model=list[RequestMessageResponse])
def list_request_messages(
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    _verify_message_access(current_user, service_request, session)
    messages = session.scalars(
        select(RequestMessage)
        .where(RequestMessage.request_id == request_id)
        .order_by(RequestMessage.created_at.asc())
    ).all()
    return messages


@router.post(
    "/{request_id}/messages",
    response_model=RequestMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_request_message(
    *,
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
    body: RequestMessageCreate,
) -> Any:
    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    _verify_message_access(current_user, service_request, session)
    message = RequestMessage(
        request_id=request_id,
        sender_id=current_user.id,
        body=body.body,
    )
    session.add(message)
    session.commit()
    session.refresh(message)
    return message


@router.post("/{request_id}/mark-ready", response_model=ServiceRequestResponse)
def mark_request_ready(
    *,
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUserEmployee,
) -> Any:

    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    _verify_active_assignment(current_user, service_request, session)
    if service_request.status != "UNDER_REVIEW":
        raise HTTPException(status_code=409, detail="Request must be in UNDER_REVIEW state")
    _verify_ready_for_processing_preconditions(session, service_request)

    _perform_transition(session, service_request, current_user, "READY_FOR_PROCESSING", RequestAction.MARK_READY)
    session.commit()
    session.refresh(service_request)
    return service_request


@router.post("/{request_id}/start-processing", response_model=ServiceRequestResponse)
def start_request_processing(
    *,
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUserEmployee,
) -> Any:

    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    _verify_active_assignment(current_user, service_request, session)
    if service_request.status != "READY_FOR_PROCESSING":
        raise HTTPException(status_code=409, detail="Request must be READY_FOR_PROCESSING")

    _perform_transition(session, service_request, current_user, "PROCESSING", RequestAction.START_PROCESSING)
    session.commit()
    session.refresh(service_request)
    return service_request


@router.post("/{request_id}/unable-to-proceed", response_model=ServiceRequestResponse)
def mark_unable_to_proceed(
    *,
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUserEmployee,
    body: UnableToProceedRequest,
) -> Any:

    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    _verify_active_assignment(current_user, service_request, session)
    if service_request.status not in {
        "UNDER_REVIEW",
        "INTERACTION_REQUIRED",
        "INTERACTION_SCHEDULED",
        "READY_FOR_PROCESSING",
        "PROCESSING",
    }:
        raise HTTPException(status_code=409, detail="Request cannot be marked unable to proceed")
    if not body.reason.strip():
        raise HTTPException(status_code=422, detail="Reason is required")

    _perform_transition(
        session, service_request, current_user, "UNABLE_TO_PROCEED", RequestAction.UNABLE_TO_PROCEED,
        note=body.reason,
        notification_event="request_unable_to_proceed",
        notification_title="Request Unable to Proceed",
        notification_body=f"Your request could not proceed. Reason: {body.reason}"
    )
    session.commit()
    session.refresh(service_request)
    return service_request


@router.post("/{request_id}/cancel", response_model=ServiceRequestResponse)
def cancel_request(
    *,
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUserCitizen,
) -> Any:
    from datetime import datetime


    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    if service_request.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    allowed_cancel_states = {
        "DRAFT", "SUBMITTED", "WAITING_FOR_CENTRE", "ACCEPTED",
        "UNDER_REVIEW", "CORRECTION_REQUIRED", "INTERACTION_REQUIRED", "INTERACTION_SCHEDULED"
    }
    if service_request.status not in allowed_cancel_states:
        raise HTTPException(status_code=400, detail=f"Cannot cancel request in state: {service_request.status}")

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
        _safe_add_notification(
            session,
            user_id=existing.employee_id,
            request_id=request_id,
            event_type="request_cancelled",
            title="Request cancelled",
            body=f"Request {request_id} was cancelled by the citizen.",
        )

    service_request.cancelled_at = now
    _perform_transition(session, service_request, current_user, "CANCELLED", RequestAction.CANCEL, note="Cancelled by citizen")
    session.commit()
    session.refresh(service_request)
    return service_request


@router.post("/{request_id}/reassign", response_model=ServiceRequestResponse)
def reassign_request(
    *,
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
    body: ReassignRequest,
) -> Any:
    from datetime import datetime

    from sqlalchemy import func

    from app.models.assignment import RequestHistory
    from app.models.profile import CentreAdministrator, EmployeeProfile

    if current_user.role not in {"centre_administrator", "system_administrator"}:
        raise HTTPException(status_code=403, detail="Not authorized")

    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")

    if current_user.role == "centre_administrator":
        admin = session.get(CentreAdministrator, current_user.id)
        if not admin or admin.centre_id != service_request.selected_centre_id:
            raise HTTPException(status_code=403, detail="Not authorized")

    if service_request.status in {"DRAFT", "SUBMITTED", "WAITING_FOR_CENTRE", "COMPLETED", "CLOSED", "CANCELLED", "UNABLE_TO_PROCEED"}:
        raise HTTPException(status_code=409, detail="Request cannot be reassigned in its current state")

    target_employee = session.get(EmployeeProfile, body.employee_id)
    if not target_employee or not target_employee.is_available:
        raise HTTPException(status_code=400, detail="Target employee not available")

    if body.centre_id and body.centre_id != service_request.selected_centre_id:
        if current_user.role != "system_administrator":
            raise HTTPException(status_code=403, detail="Only system admin can change centre during reassignment")
        supported = session.scalar(
            select(CentreSupportedService).where(
                CentreSupportedService.centre_id == body.centre_id,
                CentreSupportedService.service_id == service_request.service_id,
                CentreSupportedService.is_active.is_(True),
            )
        )
        if not supported:
            raise HTTPException(status_code=409, detail="Target centre does not support this service")
        service_request.selected_centre_id = body.centre_id
        if supported.centre_fee_override is not None:
            service_request.fee_snapshot = supported.centre_fee_override
    elif target_employee.centre_id != service_request.selected_centre_id:
        raise HTTPException(status_code=409, detail="Target employee does not belong to the request's centre")

    active_count = session.scalar(
        select(func.count())
        .select_from(RequestAssignment)
        .where(
            RequestAssignment.employee_id == body.employee_id,
            RequestAssignment.is_active.is_(True),
        )
    ) or 0
    if active_count >= target_employee.max_active_requests:
        raise HTTPException(status_code=409, detail="Target employee is at maximum capacity")

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

    new_assignment = RequestAssignment(
        request_id=request_id,
        employee_id=body.employee_id,
        is_active=True,
        assigned_at=now,
    )
    session.add(new_assignment)

    history = RequestHistory(
        request_id=request_id,
        actor_id=current_user.id,
        action=RequestAction.REASSIGN.value,
        from_status=service_request.status,
        to_status=service_request.status,
        note=f"Reassigned to {body.employee_id}",
    )
    session.add(history)

    _safe_add_notification(
        session,
        user_id=body.employee_id,
        request_id=request_id,
        event_type="request_assigned",
        title="Request reassigned",
        body=f"Request {request_id} was reassigned to you.",
    )

    session.add(service_request)
    session.commit()
    session.refresh(service_request)
    return service_request


@router.get("/{request_id}/payments", response_model=list[RequestPaymentResponse])
def list_request_payments(
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
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
    return session.scalars(
        select(RequestPayment)
        .where(RequestPayment.request_id == request_id)
        .order_by(RequestPayment.requested_at.asc())
    ).all()


@router.post("/{request_id}/request-payment", response_model=RequestPaymentResponse)
def request_payment(
    *,
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUserEmployee,
) -> Any:

    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    _verify_active_assignment(current_user, service_request, session)
    if service_request.status != "PROCESSING":
        raise HTTPException(status_code=409, detail="Request must be PROCESSING")
    if not service_request.fee_snapshot or service_request.fee_snapshot <= 0:
        raise HTTPException(status_code=409, detail="No payment is required for this request")

    existing = session.scalar(
        select(RequestPayment).where(
            RequestPayment.request_id == request_id,
            RequestPayment.status == "PENDING",
        )
    )
    if existing:
        return existing

    payment = RequestPayment(
        request_id=request_id,
        amount=service_request.fee_snapshot,
        currency="INR",
        status="PENDING",
        provider="mock",
        provider_reference="mock-" + uuid4().hex,
        components_json='{"mode":"development_mock"}',
    )
    session.add(payment)
    _perform_transition(
        session, service_request, current_user, "PAYMENT_PENDING", RequestAction.PAYMENT_REQUESTED,
        note="Development mock payment requested",
        notification_event="payment_pending",
        notification_title="Payment pending",
        notification_body="A development mock payment is ready for this request."
    )
    session.commit()
    session.refresh(payment)
    return payment


@router.post(
    "/{request_id}/payments/{payment_id}/confirm",
    response_model=RequestPaymentResponse,
)
def confirm_payment(
    request_id: UUID,
    payment_id: UUID,
    session: SessionDep,
    current_user: CurrentUserCitizen,
) -> Any:
    return _complete_mock_payment(
        request_id=request_id,
        payment_id=payment_id,
        session=session,
        current_user=current_user,
        outcome="CONFIRMED",
    )


@router.post("/{request_id}/payments/{payment_id}/fail", response_model=RequestPaymentResponse)
def fail_payment(
    request_id: UUID,
    payment_id: UUID,
    session: SessionDep,
    current_user: CurrentUserCitizen,
) -> Any:
    return _complete_mock_payment(
        request_id=request_id,
        payment_id=payment_id,
        session=session,
        current_user=current_user,
        outcome="FAILED",
    )


@router.post("/{request_id}/payments/{payment_id}/cancel", response_model=RequestPaymentResponse)
def cancel_payment(
    request_id: UUID,
    payment_id: UUID,
    session: SessionDep,
    current_user: CurrentUserCitizen,
) -> Any:
    return _complete_mock_payment(
        request_id=request_id,
        payment_id=payment_id,
        session=session,
        current_user=current_user,
        outcome="CANCELLED",
    )


@router.post("/{request_id}/accept", response_model=ServiceRequestResponse)
def accept_request(
    *,
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUserEmployee,
) -> Any:
    from datetime import datetime

    from sqlalchemy import func

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

    _perform_transition(
        session, service_request, current_user, "ACCEPTED", RequestAction.ACCEPT,
        notification_event="request_accepted",
        notification_title="Request accepted",
        notification_body="A centre employee accepted your request."
    )
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
        if not employee or employee.approval_status != "APPROVED":
            raise HTTPException(status_code=403, detail="Account pending approval by centre")
        if employee.centre_id != service_request.selected_centre_id:
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
        _verify_active_assignment(user, service_request, session)
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
    from datetime import UTC, datetime

    from app.models.profile import EmployeeProfile

    # 1. Centre-scoping check: Ensure employee's centre matches request's centre
    if user.role == "centre_employee":
        emp = session.get(EmployeeProfile, user.id)
        if not emp or emp.approval_status != "APPROVED":
            raise HTTPException(status_code=403, detail="Account pending approval by centre")
        if emp.centre_id != service_request.selected_centre_id:
            # Centre mismatch (e.g. employee's centre changed or request reassigned to another centre)
            # Revoke any active assignments for this employee on this request
            assignment = session.scalar(
                select(RequestAssignment).where(
                    RequestAssignment.request_id == service_request.id,
                    RequestAssignment.employee_id == user.id,
                    RequestAssignment.is_active.is_(True),
                ).with_for_update()
            )
            if assignment:
                assignment.is_active = False
                assignment.revoked_at = datetime.now(tz=UTC)
                session.add(assignment)
                session.commit()
            raise HTTPException(status_code=403, detail="Not authorized for this centre")

    assignment = session.scalar(
        select(RequestAssignment).where(
            RequestAssignment.request_id == service_request.id,
            RequestAssignment.employee_id == user.id,
            RequestAssignment.is_active.is_(True),
        )
    )
    if not assignment:
        raise HTTPException(status_code=403, detail="Not authorized")


def _verify_message_access(user: Any, service_request: ServiceRequest, session: Any) -> None:
    if user.role == "citizen":
        if service_request.citizen_id != user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        return
    if user.role == "centre_employee":
        _verify_active_assignment(user, service_request, session)
        return
    raise HTTPException(status_code=403, detail="Not authorized")


def _verify_ready_for_processing_preconditions(
    session: Any, service_request: ServiceRequest
) -> None:
    requirements = session.scalars(
        select(ServiceDocumentRequirement).where(
            ServiceDocumentRequirement.service_id == service_request.service_id,
            ServiceDocumentRequirement.is_active.is_(True),
            ServiceDocumentRequirement.requirement_type == "REQUIRED",
        )
    ).all()
    for requirement in requirements:
        document = session.scalar(
            select(RequestDocument).where(
                RequestDocument.request_id == service_request.id,
                RequestDocument.requirement_id == requirement.id,
                RequestDocument.is_current.is_(True),
            )
        )
        if not document:
            raise HTTPException(status_code=409, detail="Required documents are incomplete")
        approved_review = session.scalar(
            select(RequestDocumentReview).where(
                RequestDocumentReview.request_id == service_request.id,
                RequestDocumentReview.document_id == document.id,
                RequestDocumentReview.decision == "APPROVED",
            )
        )
        if not approved_review:
            raise HTTPException(status_code=409, detail="Required documents are not approved")

    blocking_interaction = session.scalar(
        select(RequestInteraction).where(
            RequestInteraction.request_id == service_request.id,
            RequestInteraction.status.in_(["REQUESTED", "SCHEDULED", "MISSED"]),
        )
    )
    if blocking_interaction:
        raise HTTPException(status_code=409, detail="Required interactions are unresolved")


def _complete_mock_payment(
    *,
    request_id: UUID,
    payment_id: UUID,
    session: Any,
    current_user: Any,
    outcome: str,
) -> RequestPayment:
    from datetime import datetime


    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    if service_request.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    payment = cast(
        RequestPayment | None,
        session.scalar(
            select(RequestPayment).where(
                RequestPayment.id == payment_id,
                RequestPayment.request_id == request_id,
            )
        ),
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.status == outcome:
        return payment
    if payment.status != "PENDING":
        raise HTTPException(status_code=409, detail="Payment is already finalized")

    now = datetime.now(tz=UTC)
    payment.status = outcome
    if outcome == "CONFIRMED":
        payment.confirmed_at = now
        next_status = "PROCESSING"
    elif outcome == "FAILED":
        payment.failed_at = now
        next_status = "PAYMENT_PENDING"
    else:
        payment.cancelled_at = now
        next_status = "PROCESSING"
    session.add(payment)

    notification_kwargs = {}
    if outcome == "CONFIRMED":
        notification_kwargs = {
            "notification_event": "payment_confirmed",
            "notification_title": "Payment confirmed",
            "notification_body": "Development mock payment was confirmed.",
        }
    payment_action = RequestAction(f"payment_{outcome.lower()}")
    _perform_transition(
        session, service_request, current_user, next_status, payment_action,
        note="Development mock payment " + outcome.lower(),
        **notification_kwargs
    )
    session.commit()
    session.refresh(payment)
    return payment


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
            if requirement.requirement_type == "REQUIRED":
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


def _safe_add_notification(
    session: Any,
    *,
    user_id: UUID,
    request_id: UUID,
    event_type: str,
    title: str,
    body: str | None = None,
) -> None:
    try:
        session.add(
            Notification(
                user_id=user_id,
                request_id=request_id,
                event_type=event_type,
                title=title,
                body=body,
                is_read=False,
            )
        )
    except Exception:
        return


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


@router.post("/{request_id}/complete", response_model=CompletedOutputResponse)
def complete_request(
    *,
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
    body: CompletedOutputCreate,
) -> Any:
    from datetime import datetime


    if current_user.role not in {"centre_employee", "centre_administrator", "system_administrator"}:
        raise HTTPException(status_code=403, detail="Not authorized")

    if current_user.role == "centre_employee":
        from app.models.profile import EmployeeProfile

        emp = session.get(EmployeeProfile, current_user.id)
        if not emp or emp.approval_status != "APPROVED":
            raise HTTPException(status_code=403, detail="Account pending approval by centre")

    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")

    _verify_active_assignment(current_user, service_request, session)

    if service_request.status not in {"PROCESSING", "PAYMENT_PENDING"}:
        raise HTTPException(status_code=409, detail="Request cannot be completed from its current state")
        
    # If payment is pending, it must be confirmed first
    if service_request.status == "PAYMENT_PENDING":
        has_pending = session.scalar(
            select(func.count()).select_from(RequestPayment).where(
                RequestPayment.request_id == request_id,
                RequestPayment.status == "PENDING"
            )
        )
        if has_pending > 0:
            raise HTTPException(status_code=409, detail="Cannot complete request with pending payments")

    existing_output = session.scalar(
        select(CompletedOutput).where(CompletedOutput.request_id == request_id)
    )
    if existing_output:
        raise HTTPException(status_code=409, detail="Request is already completed")

    now = datetime.now(tz=UTC)
    
    output = CompletedOutput(
        request_id=request_id,
        created_by_id=current_user.id,
        collection_instructions=body.collection_instructions,
    )
    session.add(output)

    service_request.completed_at = now
    _perform_transition(
        session, service_request, current_user, "COMPLETED", RequestAction.COMPLETE,
        note="Request completed",
        notification_event="request_completed",
        notification_title="Request completed",
        notification_body=f"Your request {request_id} has been completed."
    )

    session.commit()
    session.refresh(output)
    return output

@router.post("/{request_id}/close", response_model=ServiceRequestResponse)
def close_request(
    *,
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUserCitizen,
) -> Any:
    from datetime import datetime


    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    if service_request.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if service_request.status != "COMPLETED":
        raise HTTPException(status_code=409, detail="Only completed requests can be closed")

    now = datetime.now(tz=UTC)
    
    _perform_transition(
        session, service_request, current_user, "CLOSED", RequestAction.CLOSE, note="Request closed by citizen"
    )
    session.commit()
    session.refresh(service_request)
    return service_request

@router.get("/{request_id}/output", response_model=CompletedOutputResponse)
def get_request_output(
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
        
    _verify_active_assignment(current_user, service_request, session)
    
    output = session.scalar(
        select(CompletedOutput).where(CompletedOutput.request_id == request_id)
    )
    if not output:
        raise HTTPException(status_code=404, detail="Output not found")
        
    return output


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_request(
    request_id: UUID,
    session: SessionDep,
    current_user: CurrentUserCitizen,
) -> None:
    service_request = session.get(ServiceRequest, request_id)
    if not service_request:
        raise HTTPException(status_code=404, detail="Request not found")
    if service_request.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if service_request.status == "DRAFT":
        session.delete(service_request)
        session.commit()
    elif service_request.status in ["COMPLETED", "CANCELLED"]:
        service_request.is_archived_by_citizen = True
        session.add(service_request)
        session.commit()
    else:
        raise HTTPException(
            status_code=400, 
            detail="Only DRAFT, COMPLETED, or CANCELLED requests can be deleted/archived"
        )

