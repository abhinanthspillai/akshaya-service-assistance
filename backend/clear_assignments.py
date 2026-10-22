import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from urllib.parse import urlparse

from sqlalchemy import update

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models.assignment import RequestAssignment


def assert_local_database() -> None:
    settings = get_settings()
    parsed = urlparse(settings.database_url)
    hostname = (parsed.hostname or "").lower()
    if hostname not in ("localhost", "127.0.0.1", "::1"):
        raise RuntimeError(
            f"SAFETY ABORT: clear_assignments.py can ONLY run against localhost / 127.0.0.1. "
            f"Configured database host is '{hostname}'. Aborting immediately."
        )


def main():
    assert_local_database()
    session = SessionLocal()
    try:
        session.execute(update(RequestAssignment).values(is_active=False))
        # Clean up ephemeral e2e test accounts and requests to prevent FK conflicts
        from app.models.assignment import RequestHistory
        from app.models.document import RequestDocument, RequestDocumentReview
        from app.models.interaction import RequestInteraction
        from app.models.message import RequestMessage
        from app.models.notification import Notification
        from app.models.output import CompletedOutput
        from app.models.payment import RequestPayment
        from app.models.request import ServiceRequest
        from app.models.user import User

        test_user_ids = [
            u.id
            for u in session.query(User)
            .filter(
                User.email.like("e2e.%@akshaya.test") | User.email.like("conflict.%@akshaya.test")
            )
            .all()
        ]
        if test_user_ids:
            req_ids = [
                r.id
                for r in session.query(ServiceRequest)
                .filter(ServiceRequest.citizen_id.in_(test_user_ids))
                .all()
            ]
            if req_ids:
                doc_ids = [
                    d.id
                    for d in session.query(RequestDocument)
                    .filter(RequestDocument.request_id.in_(req_ids))
                    .all()
                ]
                session.query(Notification).filter(Notification.request_id.in_(req_ids)).delete(
                    synchronize_session=False
                )
                session.query(RequestMessage).filter(RequestMessage.request_id.in_(req_ids)).delete(
                    synchronize_session=False
                )
                session.query(RequestInteraction).filter(
                    RequestInteraction.request_id.in_(req_ids)
                ).delete(synchronize_session=False)
                if doc_ids:
                    session.query(RequestDocumentReview).filter(
                        RequestDocumentReview.document_id.in_(doc_ids)
                    ).delete(synchronize_session=False)
                session.query(RequestDocument).filter(
                    RequestDocument.request_id.in_(req_ids)
                ).delete(synchronize_session=False)
                session.query(CompletedOutput).filter(
                    CompletedOutput.request_id.in_(req_ids)
                ).delete(synchronize_session=False)
                session.query(RequestPayment).filter(RequestPayment.request_id.in_(req_ids)).delete(
                    synchronize_session=False
                )
                session.query(RequestAssignment).filter(
                    RequestAssignment.request_id.in_(req_ids)
                ).delete(synchronize_session=False)
                session.query(RequestHistory).filter(RequestHistory.request_id.in_(req_ids)).delete(
                    synchronize_session=False
                )
                session.query(ServiceRequest).filter(ServiceRequest.id.in_(req_ids)).delete(
                    synchronize_session=False
                )
            session.query(Notification).filter(Notification.user_id.in_(test_user_ids)).delete(
                synchronize_session=False
            )
            session.query(User).filter(User.id.in_(test_user_ids)).delete(synchronize_session=False)
        session.commit()
        print("Successfully cleared all active request assignments.")
    except Exception as e:
        print(f"Error clearing assignments: {e}")
        session.rollback()
    finally:
        session.close()


if __name__ == "__main__":
    main()
