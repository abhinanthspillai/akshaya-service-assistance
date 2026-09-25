# DECISIONS

## Approved baseline decisions
- One MCA project split into Phase 1 core and Phase 2 extension.
- Four roles: Citizen, Centre Employee, Centre Administrator, System Administrator.
- Service Type A/B/C classification based on citizen-centre interaction.
- Approved 15-state request vocabulary.
- Client-server architecture.
- React + TypeScript frontend.
- FastAPI + Python backend.
- PostgreSQL relational database.
- SQLAlchemy 2.x + Alembic + Psycopg 3.
- Backend-authoritative business logic and authorization.
- REST-style business-action endpoints.
- Secure persistent file storage separate from relational metadata.
- Batch 1 contains the frozen 11 normalized tables listed in DATABASE.md.
- Phase 1 aims for complete reliable core workflow; Phase 2 extends rather than rebuilds.

## Implementation-completion decisions
These close previously unspecified implementation details without changing the approved domain model:
- Public registration creates Citizen accounts only.
- Centre Employee accounts are provisioned by same-centre Centre Administrator or System Administrator.
- Centre Administrator accounts are provisioned by System Administrator.
- Initial System Administrator is created through secure bootstrap tooling.
- API base path is /api/v1.
- Error responses use one stable machine-readable envelope.
- Request lifecycle changes use explicit action endpoints rather than arbitrary client status PATCH.
- UTC-aware timestamps are mandatory.
- Historical requests snapshot service type/name/applicable fee.
- Any later change to these that materially alters security, data model, workflow, roles or architecture is Level 3.

## Temporary development / evaluation decisions
### Employee Registration Stopgap & Approval Guard
To enable end-to-end evaluation of employee workflows prior to dedicated centre-admin invitation portals:
- `POST /api/v1/auth/register` allows selecting `role="centre_employee"` with a validated `centre_id`.
- Accounts registered this way default to `approval_status="PENDING_APPROVAL"`.
- All employee request processing and queue endpoints strictly guard against pending status, returning `403 Forbidden` (`Account pending approval by centre`).
- Approval can be granted using `backend/approve_employee.py` or by centre/system administrators.
- Admin-provisioned employees via staff administration remain `approval_status="APPROVED"` immediately.
- Frontend renders a dedicated `PendingApproval` barrier screen until approval is active.

