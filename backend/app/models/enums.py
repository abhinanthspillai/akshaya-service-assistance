from enum import Enum


class RequestAction(str, Enum):
    """Canonical RequestHistory action identifiers."""

    # Submission & Routing
    SUBMIT_REQUEST = "submit_request"
    SUBMIT_REQUEST_ROUTING = "submit_request_routing"

    # Review & Corrections
    START_REVIEW = "start_review"
    SUBMIT_CORRECTION = "submit_correction"
    DOCUMENT_CORRECTION_REQUIRED = "document_correction_required"
    DOCUMENT_APPROVED = "document_approved"

    # Interactions
    INTERACTION_REQUIRED = "interaction_required"
    INTERACTION_SCHEDULED = "interaction_scheduled"
    INTERACTION_COMPLETED = "interaction_completed"
    INTERACTION_CANCELLED = "interaction_cancelled"
    INTERACTION_RESCHEDULED = "interaction_rescheduled"
    INTERACTION_MISSED = "interaction_missed"

    # Processing & Terminal
    MARK_READY = "mark_ready"
    START_PROCESSING = "start_processing"
    UNABLE_TO_PROCEED = "unable_to_proceed"
    CANCEL = "cancel"
    REASSIGN = "reassign"
    ACCEPT = "accept"
    COMPLETE = "complete"
    CLOSE = "close"

    # Payments
    PAYMENT_REQUESTED = "payment_requested"
    PAYMENT_CONFIRMED = "payment_confirmed"
    PAYMENT_FAILED = "payment_failed"
    PAYMENT_CANCELLED = "payment_cancelled"
