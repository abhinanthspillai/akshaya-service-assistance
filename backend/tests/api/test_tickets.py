from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

def test_create_and_get_ticket(
    client: TestClient,
    normal_user_headers: dict,
) -> None:
    data = {
        "subject": "Help with registration",
        "description": "I cannot find the documents needed",
    }
    r = client.post("/api/v1/tickets/", headers=normal_user_headers, json=data)
    assert r.status_code == 200
    ticket = r.json()
    assert ticket["subject"] == data["subject"]
    assert ticket["status"] == "OPEN"
    
    ticket_id = ticket["id"]
    
    # Get ticket
    r2 = client.get(f"/api/v1/tickets/{ticket_id}", headers=normal_user_headers)
    assert r2.status_code == 200
    assert r2.json()["id"] == ticket_id

def test_ticket_messages_and_status(
    client: TestClient,
    normal_user_headers: dict,
    admin_headers: dict,
) -> None:
    # 1. Citizen creates ticket
    data = {
        "subject": "Status check",
        "description": "When will it be done?",
    }
    r = client.post("/api/v1/tickets/", headers=normal_user_headers, json=data)
    ticket_id = r.json()["id"]
    
    # 2. Citizen adds a message
    msg_data = {"body": "Any update on this?"}
    r2 = client.post(f"/api/v1/tickets/{ticket_id}/messages", headers=normal_user_headers, json=msg_data)
    assert r2.status_code == 200
    
    # 3. Admin replies and changes status
    admin_msg = {"body": "We are looking into it."}
    r3 = client.post(f"/api/v1/tickets/{ticket_id}/messages", headers=admin_headers, json=admin_msg)
    assert r3.status_code == 200
    
    r4 = client.post(f"/api/v1/tickets/{ticket_id}/status", headers=admin_headers, json={"status": "IN_PROGRESS"})
    assert r4.status_code == 200
    assert r4.json()["status"] == "IN_PROGRESS"
    
    # 4. Fetch messages
    r5 = client.get(f"/api/v1/tickets/{ticket_id}/messages", headers=normal_user_headers)
    assert r5.status_code == 200
    messages = r5.json()
    assert len(messages) == 2
    assert messages[0]["body"] == "Any update on this?"
    assert messages[1]["body"] == "We are looking into it."
