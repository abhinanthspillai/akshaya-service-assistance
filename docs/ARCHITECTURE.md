# ARCHITECTURE

## System architecture
Client-server architecture:

React + TypeScript
    -> HTTPS REST API
FastAPI + Pydantic
    -> service layer / authorization / workflow rules
SQLAlchemy 2.x
    -> PostgreSQL

Persistent uploaded files are stored outside PostgreSQL in secure persistent file/object storage; PostgreSQL stores metadata and references.

## Backend modules
- core: configuration, database, logging, security
- auth: authentication and identity
- users/profiles
- centres
- services/catalogue
- requests
- assignments
- documents/reviews/corrections
- interactions
- payments
- messaging/notifications
- escalation/support
- history/audit
- completed outputs

## Layering
API route -> application/service layer -> repository/data access -> SQLAlchemy -> PostgreSQL.

Routes validate transport input and map responses. Business rules and state transitions belong in services/domain logic. Authorization must be enforced on the backend.

## Frontend architecture
React application with:
- route-level role guards for UX only
- backend remains authoritative
- feature-oriented modules
- typed API client
- reusable form and state components
- no direct database access
- no secrets in frontend code

## Authentication flow
1. Citizen or provisioned staff submits credentials.
2. Backend retrieves active user by normalized email.
3. Argon2 verifies password.
4. Backend issues signed expiring JWT bearer access token.
5. Protected requests send Authorization: Bearer <token>.
6. Backend decodes token, reloads user, checks active state and resource authorization.

## Authorization model
Authorization = authenticated identity + role permission + object/resource scope.

Role alone is never sufficient for centre-scoped or request-scoped data.

## Error model
All APIs return a stable JSON error shape:
`{"error":{"code":"MACHINE_CODE","message":"human readable","details":{...}}}`

Validation -> 422.
Missing/invalid authentication -> 401.
Authenticated but forbidden -> 403.
Missing resource -> 404.
Conflict/state violation -> 409.
Rate limit -> 429.
Unexpected server error -> 500 with no sensitive details.

## Stable architecture decisions
Agents must not change:
- React/TypeScript frontend
- FastAPI/Python backend
- PostgreSQL relational persistence
- SQLAlchemy/Alembic
- backend-authoritative workflow/authorization
- REST business-action endpoints
- service-request-centric workflow
- role model
- approved request states
- secure persistent file storage separated from relational metadata
without Level 3 human approval.
