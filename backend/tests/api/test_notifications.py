import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.notification import Notification



def test_list_notifications_citizen(
    client: TestClient, db_session: Session, normal_user_headers: dict[str, str], normal_user_id: str
):
    from uuid import uuid4, UUID
    n1 = Notification(
        id=uuid4(),
        user_id=UUID(normal_user_id),
        event_type="test_event_1",
        title="Test Notification 1",
        is_read=False
    )
    n2 = Notification(
        id=uuid4(),
        user_id=UUID(normal_user_id),
        event_type="test_event_2",
        title="Test Notification 2",
        is_read=True
    )
    db_session.add(n1)
    db_session.add(n2)
    db_session.commit()

    r = client.get("/api/v1/notifications/", headers=normal_user_headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 2
    titles = [item["title"] for item in data]
    assert "Test Notification 1" in titles
    assert "Test Notification 2" in titles

    r = client.get("/api/v1/notifications/?unread_only=true", headers=normal_user_headers)
    assert r.status_code == 200
    data = r.json()
    titles = [item["title"] for item in data]
    assert "Test Notification 1" in titles
    assert "Test Notification 2" not in titles

def test_mark_notification_read(
    client: TestClient, db_session: Session, normal_user_headers: dict[str, str], normal_user_id: str
):
    from uuid import uuid4, UUID
    n = Notification(
        id=uuid4(),
        user_id=UUID(normal_user_id),
        event_type="test_event_read",
        title="Test Mark Read",
        is_read=False
    )
    db_session.add(n)
    db_session.commit()
    db_session.refresh(n)

    r = client.post(f"/api/v1/notifications/{n.id}/read", headers=normal_user_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["is_read"] is True

def test_cannot_read_others_notification(
    client: TestClient, db_session: Session, admin_headers: dict[str, str], normal_user_id: str
):
    from uuid import uuid4, UUID
    n = Notification(
        id=uuid4(),
        user_id=UUID(normal_user_id),
        event_type="test_event_others",
        title="Others Notification",
        is_read=False
    )
    db_session.add(n)
    db_session.commit()
    db_session.refresh(n)

    r = client.post(f"/api/v1/notifications/{n.id}/read", headers=admin_headers)
    assert r.status_code == 403 or r.status_code == 404
