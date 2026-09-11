# SECURITY

## Authentication
- Argon2 via pwdlib.
- Signed expiring JWT bearer access token.
- No role selection during public registration.
- Token signing secret from environment/secret manager only.
- Invalid, expired or malformed tokens -> 401.
- Active user must be revalidated from DB.

## Account creation
- Citizens may self-register.
- Centre Employees: Centre Administrator for that centre or System Administrator.
- Centre Administrators: System Administrator.
- Initial System Administrator: secure bootstrap command/process; no hard-coded password.

## Authorization
Three layers:
1. authentication
2. role permission
3. resource/object scope

Examples:
- citizen may access only own requests/documents/messages
- employee access is centre/assignment scoped
- reassignment revokes previous employee access
- centre administrator is centre scoped
- system administrator has system administration rights but sensitive actions remain audited

## Secrets
- `.env` excluded from Git
- `.env.example` contains names only, no secrets
- CI secrets in GitHub Secrets/environments
- rotate compromised credentials

## Input/API security
- Pydantic validation
- ORM parameterization
- strict enum/state validation
- bounded pagination and upload sizes
- CORS allowlist by environment
- security headers at deployment/proxy
- login/register rate limiting
- generic authentication failure message

## File security
- never trust client filename/MIME alone
- allowlisted file types per requirement
- size validation
- generated storage keys
- private storage
- authorized download
- prevent path traversal
- do not place raw private uploads under publicly served static paths

## Data protection
- TLS outside local development
- minimize staff visibility before assignment
- never log passwords, JWTs, document bodies, sensitive IDs unnecessarily
- configurable retention
- deletion/retention actions auditable

## Audit
Security-sensitive events must later write audit entries:
login failures at appropriate granularity, account status changes, staff creation, assignment/reassignment, document decisions, state transitions, payment/refund actions, completed-output access.

## High-risk areas
1. broken object-level authorization
2. insecure document storage/download
3. state transition bypass
4. overprivileged centre staff
5. leaked JWT/secret
6. mass assignment of role/status fields
7. concurrency races in acceptance/reassignment/payment
