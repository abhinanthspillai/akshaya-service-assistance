# API_SPEC

Base path: `/api/v1`
Content type: JSON except multipart document upload endpoints.
Error shape is defined in ARCHITECTURE.md.

## Authentication

### POST /auth/register
Public. Citizen self-registration only.
Request: email, password, full_name, optional phone.
Rules: email normalized; password policy enforced; role is never client-selectable.
Response 201: user summary.
Errors: 409 email exists, 422 invalid input, 429 rate limit.

### POST /auth/login
Public.
Request: email, password.
Response 200: access_token, token_type="bearer", expires_in.
Errors: 401 invalid credentials or inactive account, 429 rate limit.

### GET /auth/me
Authenticated.
Response 200: id, email, role, active, profile summary.
Errors: 401 invalid/expired token.

## Centres

### GET /centres
Authenticated citizen/staff.
Query: district?, service_id?, active=true by default.
Returns paginated centre summaries.

### GET /centres/{centre_id}
Authenticated.
Returns centre details and supported services allowed for caller.

### POST /centres
System Administrator.
Creates centre. 201.

### PATCH /centres/{centre_id}
System Administrator.
Updates allowed mutable centre fields.

## Staff account administration

### POST /centres/{centre_id}/employees
Centre Administrator for same centre or System Administrator.
Creates Centre Employee account/profile. Role cannot be caller-selected.

### POST /centres/{centre_id}/administrators
System Administrator only.
Creates Centre Administrator.

### PATCH /users/{user_id}/status
Authorized administrator.
Activate/deactivate according to scope.

## Services

### GET /services
Authenticated. Query type?, active?.
Returns paginated catalogue.

### GET /services/{service_id}
Authenticated.
Includes document and interaction requirements plus eligible/supported-centre summary.

### POST /services
System Administrator.
Creates service.

### PATCH /services/{service_id}
System Administrator.
Updates catalogue configuration for future/new requests; historical requests retain snapshots.

### PUT /services/{service_id}/document-requirements
System Administrator.
Replaces/updates requirement configuration transactionally.

### PUT /services/{service_id}/interaction-requirements
System Administrator.

### PUT /centres/{centre_id}/supported-services/{service_id}
Centre Administrator for centre or System Administrator.
Enable/update support and optional centre fee override.

### DELETE /centres/{centre_id}/supported-services/{service_id}
Authorized centre/system admin.
Deactivates support for new requests; historical requests remain intact.

## Service requests — Batch 1 + first vertical slice

### POST /requests
Citizen.
Request: service_id.
Creates DRAFT request and snapshots service type/name/current fee. 201.

### GET /requests
Citizen sees own requests.
Employee sees only permitted centre/assigned work according to current slice.
Centre Administrator sees centre-scoped requests.
System Administrator may inspect all for support/audit.
Paginated filters: status, service_id, created_from/to.

### GET /requests/{request_id}
Authenticated plus object authorization.
Returns role-filtered representation.

### POST /requests/{request_id}/select-centre
Citizen owner while request is DRAFT.
Request: centre_id.
Validates centre is active and currently supports service.

### POST /requests/{request_id}/submit
Citizen owner.
Preconditions: DRAFT, centre selected where required, all mandatory pre-submission validations for implemented slice satisfied.
Atomic transition to SUBMITTED then WAITING_FOR_CENTRE when routing succeeds.
409 on invalid state/precondition.

## Later business-action endpoint pattern
Use actions, not arbitrary status PATCH:
- POST /requests/{id}/accept
- POST /requests/{id}/start-review
- POST /requests/{id}/request-correction
- POST /requests/{id}/submit-correction
- POST /requests/{id}/require-interaction
- POST /requests/{id}/schedule-interaction
- POST /requests/{id}/mark-ready
- POST /requests/{id}/start-processing
- POST /requests/{id}/request-payment
- POST /requests/{id}/complete
- POST /requests/{id}/close
- POST /requests/{id}/cancel
- POST /requests/{id}/unable-to-proceed
- POST /requests/{id}/reassign

Every action validates current state, caller role/scope, required evidence and concurrency version/transaction assumptions.

## Documents (later slice)
Implemented Phase 1 request-document endpoints:

- GET /requests/{request_id}/documents
- POST /requests/{request_id}/documents
- GET /requests/{request_id}/documents/{document_id}/download

Upload is multipart form data with `requirement_id` and `file`.

Backend validates Citizen ownership, request state, requirement/service relationship, MIME type, configured/default max size, non-empty file content, generated private storage key and metadata persistence. Replacement uploads create a new document version and mark prior current versions as replaced rather than deleting their evidence.

Download is served only through the authorized backend endpoint. Citizen owners, active assigned employees, same-centre administrators and system administrators may access according to role scope. Responses expose metadata only and never expose unrestricted storage paths.

## Payments (later slice)
Payment intent/mock initiation only after allowed workflow point.
Original payment records are immutable; refunds are separate records.

## Rate limits baseline
At minimum: register/login, document upload and support/contact endpoints. Exact production limits may be environment configurable.
