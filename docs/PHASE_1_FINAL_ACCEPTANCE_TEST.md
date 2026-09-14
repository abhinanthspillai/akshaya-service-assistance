# Phase 1 Final Acceptance Test Matrix

## A. Authentication

| Step | Expected Behavior | Actual Behavior | Result | Defect Found |
|---|---|---|---|---|
| Citizen registration | Account created and logged in automatically. | Works as expected. | **PASS** | None |
| Citizen login | Receives JWT token, navigates to `/citizen/dashboard`. | Works as expected. | **PASS** | None |
| Employee login | Receives JWT token, navigates to `/employee/queue`. | Works as expected. | **PASS** | None |
| Centre Admin login | Receives JWT token, navigates to `/admin/dashboard`. | Works as expected. | **PASS** | None |
| Sys Admin login | Receives JWT token, navigates to `/sysadmin/dashboard`. | Works as expected. | **PASS** | None |
| Invalid credentials | Returns 401 Unauthorized, displays error message. | Works as expected. | **PASS** | None |
| Logout | Clears token from localStorage, redirects to `/login`. | Works as expected. | **PASS** | None |
| Protected routes | Unauthorized roles are redirected/blocked. | Works as expected. | **PASS** | None |
| Token handling | Token is sent in `Authorization` header. | Works as expected. | **PASS** | None |

## B. Citizen Workflow

| Step | Expected Behavior | Actual Behavior | Result | Defect Found |
|---|---|---|---|---|
| Browse/select service | Catalogue displays services, selection creates draft. | Works as expected. | **PASS** | None |
| View requirements | Requirements are populated correctly. | Works as expected. | **PASS** | None |
| Upload documents | Citizen can upload correct files. | Works as expected. | **PASS** | None |
| Validation | Missing required documents block submission. | Works as expected. | **PASS** | None |
| Centre routing | Submission updates status to `WAITING_FOR_CENTRE`. | Works as expected. | **PASS** | None |
| Citizen closes request | Request transitions `COMPLETED` -> `CLOSED`. | Works as expected. | **PASS** | None |

## C. Cancellation Rules

| Step | Expected Behavior | Actual Behavior | Result | Defect Found |
|---|---|---|---|---|
| Cancel allowed states | Allowed in DRAFT, SUBMITTED, WAITING, ACCEPTED... | Works as expected. | **PASS** | None |
| Cancel denied states | Blocked in PROCESSING, COMPLETED, CLOSED, etc. | Works as expected. | **PASS** | None |
| Only owner cancels | Backend blocks other citizens. | Works as expected. | **PASS** | None |

## D. Employee Workflow

| Step | Expected Behavior | Actual Behavior | Result | Defect Found |
|---|---|---|---|---|
| See centre queue | Can view unassigned `WAITING_FOR_CENTRE` requests. | Works as expected. | **PASS** | None |
| Accept eligible requests | Capacity enforced, status changes to `ACCEPTED`. | Works as expected. | **PASS** | None |
| Unable to proceed | Allows transition with required reason. | Works as expected. | **PASS** | None |

## E. Reassignment & Escalation

| Step | Expected Behavior | Actual Behavior | Result | Defect Found |
|---|---|---|---|---|
| Reassign | Old assignment deactivated, new one created. | Works as expected. | **PASS** | None |
| Escalations | Stale requests are detected automatically by cron/manual trigger. | Works as expected. | **PASS** | None |

## F. Support Tickets & Output

| Step | Expected Behavior | Actual Behavior | Result | Defect Found |
|---|---|---|---|---|
| Create ticket | Links to ServiceRequest optionally. | Works as expected. | **PASS** | None |
| Output Delivery | `collection_instructions` displayed when `COMPLETED`. | Works as expected. | **PASS** | None |

## G. Security, RBAC & State Machine

| Step | Expected Behavior | Actual Behavior | Result | Defect Found |
|---|---|---|---|---|
| Cross-tenant data | Centre Admin cannot view other centre's requests. | Works as expected. | **PASS** | None |
| State transitions | Cannot jump from `DRAFT` to `COMPLETED` directly. | Works as expected. | **PASS** | None |
| File security | Document URLs are checked on backend for ownership. | Works as expected. | **PASS** | None |
