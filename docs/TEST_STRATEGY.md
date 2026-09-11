# TEST_STRATEGY

## Test layers
- Unit: domain/service rules and pure validation.
- Integration: SQLAlchemy + PostgreSQL, migrations, repositories.
- API: FastAPI endpoints with authentication/authorization.
- Frontend unit/component: critical forms/states.
- E2E: high-value role workflows in browser.
- Security: authz/BOLA, upload validation, state transition abuse.
- Regression: every fixed defect gets a test.

## Mandatory foundation tests
- /health 200
- DB connectivity in integration environment
- Alembic upgrade from empty DB succeeds
- unique email enforced
- password stored only as Argon2 hash
- valid citizen registration succeeds
- public registration cannot choose privileged role
- valid login returns token
- invalid credentials -> 401
- inactive user -> 401
- expired/malformed token -> 401
- /auth/me returns correct user
- wrong role -> 403

## Service/catalogue tests
- inactive services excluded by default
- Type A/B/C constraint enforced
- requirements returned in order
- unsupported file type configuration rejected where applicable
- historical request snapshots unaffected by later catalogue edits

## Request tests
- creation -> DRAFT
- only owner can mutate citizen request
- invalid service -> 404/422 as appropriate
- unsupported centre cannot be selected
- valid centre selection works
- submit only from DRAFT
- duplicate submit is safe and does not duplicate requests/events
- unauthorized resource access -> 403/404 according to anti-enumeration policy
- transition endpoint rejects illegal state with 409

## Later workflow tests
- capacity-aware acceptance
- atomic acceptance race: only one valid assignee outcome
- reassignment revokes prior access
- correction loop
- interaction required/scheduled
- missed-interaction threshold
- payment gating
- completion preconditions
- notification failure does not roll back authoritative state
- escalation after configured timeout
- external dependency failure never yields false completion

## CI gates
A PR cannot merge when required tests, lint/type checks, build or migration validation fails.
