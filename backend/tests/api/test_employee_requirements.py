import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

def test_ticket_access(client: TestClient, db_session: Session, normal_user_token_headers: dict, setup_seed_data: dict, create_employee_token):
    # Setup two centres and two employees
    emp_a_headers = create_employee_token(setup_seed_data["centre_id"], "APPROVED")
    emp_b_headers = create_employee_token(setup_seed_data["alt_centre_id"], "APPROVED")
    
    citizen_headers = normal_user_token_headers
    
    # Create request at centre A
    res = client.post("/requests/", headers=citizen_headers, json={
        "service_id": setup_seed_data["service_id"],
        "selected_centre_id": setup_seed_data["centre_id"],
        "fields_data": {}
    })
    req_a_id = res.json()["id"]
    
    # Create ticket for request A
    res = client.post("/tickets/", headers=citizen_headers, json={
        "subject": "Help with req A",
        "description": "Please help",
        "request_id": req_a_id
    })
    ticket_a_id = res.json()["id"]
    
    # Create ticket with NO request
    res = client.post("/tickets/", headers=citizen_headers, json={
        "subject": "General help",
        "description": "Please help",
        "request_id": None
    })
    ticket_no_req_id = res.json()["id"]
    
    # Emp A should see ticket A
    res = client.get("/tickets/", headers=emp_a_headers)
    assert any(t["id"] == ticket_a_id for t in res.json()), "Emp A missing their centre's ticket"
    assert not any(t["id"] == ticket_no_req_id for t in res.json()), "Emp A sees ticket with no request"
    
    # Emp B should NOT see ticket A
    res = client.get("/tickets/", headers=emp_b_headers)
    assert not any(t["id"] == ticket_a_id for t in res.json()), "Emp B sees another centre's ticket"
    
    # Emp B gets 403 trying to access ticket A
    res = client.get(f"/tickets/{ticket_a_id}", headers=emp_b_headers)
    assert res.status_code == 403, "Emp B should get 403 for ticket A"
    
    # Emp A gets 403 trying to access ticket with no request
    res = client.get(f"/tickets/{ticket_no_req_id}", headers=emp_a_headers)
    assert res.status_code == 403, "Emp A should get 403 for no-request ticket"
    
    # Emp A cannot change ticket status
    res = client.put(f"/tickets/{ticket_a_id}/status", headers=emp_a_headers, json={"status": "RESOLVED"})
    assert res.status_code == 403, "Emp A should get 403 when trying to change status"


def test_capacity_and_race(client: TestClient, db_session: Session, normal_user_token_headers: dict, setup_seed_data: dict, create_employee_token):
    emp_a_headers = create_employee_token(setup_seed_data["centre_id"], "APPROVED")
    emp_b_headers = create_employee_token(setup_seed_data["centre_id"], "APPROVED")
    
    # Create multiple requests
    req_ids = []
    for _ in range(12):
        res = client.post("/requests/", headers=normal_user_token_headers, json={
            "service_id": setup_seed_data["service_id"],
            "selected_centre_id": setup_seed_data["centre_id"],
            "fields_data": {}
        })
        req_ids.append(res.json()["id"])
        
    # Accept up to max capacity (assume max_active_requests = 10)
    for i in range(10):
        res = client.post(f"/requests/{req_ids[i]}/accept", headers=emp_a_headers)
        assert res.status_code == 200
        
    # Accepting 11th should fail with 409
    res = client.post(f"/requests/{req_ids[10]}/accept", headers=emp_a_headers)
    assert res.status_code == 409
    assert "capacity" in res.json()["detail"].lower() or "limit" in res.json()["detail"].lower()
    
    # Race: Emp B accepts 11th request successfully
    res = client.post(f"/requests/{req_ids[10]}/accept", headers=emp_b_headers)
    assert res.status_code == 200
    
    # Race: Emp A tries to accept the same 11th request, should fail (assigned to B)
    # Actually wait, if A tries to accept it now, it should fail. (We couldn't do true async race, but this simulates it).
    res = client.post(f"/requests/{req_ids[10]}/accept", headers=emp_a_headers)
    assert res.status_code == 409
    assert "already assigned" in res.json()["detail"].lower() or "limit" in res.json()["detail"].lower()


def test_scoping_and_notifications(client: TestClient, db_session: Session, normal_user_token_headers: dict, setup_seed_data: dict, create_employee_token):
    emp_a_headers = create_employee_token(setup_seed_data["centre_id"], "APPROVED")
    emp_b_headers = create_employee_token(setup_seed_data["alt_centre_id"], "APPROVED")
    
    # Citizen submits request to Centre A
    res = client.post("/requests/", headers=normal_user_token_headers, json={
        "service_id": setup_seed_data["service_id"],
        "selected_centre_id": setup_seed_data["centre_id"],
        "fields_data": {}
    })
    req_a_id = res.json()["id"]
    
    # Emp A should see a notification
    res = client.get("/notifications/", headers=emp_a_headers)
    assert any("submitted" in n["title"].lower() or "new request" in n["title"].lower() for n in res.json())
    
    # Emp B should NOT see the notification
    res = client.get("/notifications/", headers=emp_b_headers)
    assert not any("submitted" in n["title"].lower() or "new request" in n["title"].lower() for n in res.json())
    
    # Emp A sees the request
    res = client.get("/requests/", headers=emp_a_headers)
    assert any(r["id"] == req_a_id for r in res.json().get("items", res.json()))
    
    # Emp B does not see the request
    res = client.get("/requests/", headers=emp_b_headers)
    assert not any(r["id"] == req_a_id for r in res.json().get("items", res.json()))
    
