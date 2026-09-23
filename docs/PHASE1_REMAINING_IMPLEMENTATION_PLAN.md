# Akshaya Service Assistance System
## Remaining Phase 1 Implementation Plan

> **Purpose:** Complete the approved core Citizen-to-Akshaya-Centre assisted-service workflow before beginning Phase 2.

## Current Baseline

The repository already contains the Phase 1 foundation, including:

- FastAPI backend, SQLAlchemy and Alembic
- PostgreSQL-oriented relational architecture
- Authentication and role-based authorization
- Citizen, Centre Employee, Centre Administrator and System Administrator roles
- Centre and employee management
- Service catalogue and centre-supported services
- Request creation, draft handling, submission and centre selection
- Employee queue, acceptance, assignment and capacity handling
- Request history
- Existing role-aware frontend and automated tests

Before implementing any item below, inspect the current repository and reuse existing models, states, endpoints and services. Do not duplicate already implemented functionality.

## Approved Primary Request States

Use only these primary states:

`DRAFT`, `SUBMITTED`, `WAITING_FOR_CENTRE`, `ACCEPTED`, `UNDER_REVIEW`, `CORRECTION_REQUIRED`, `INTERACTION_REQUIRED`, `INTERACTION_SCHEDULED`, `READY_FOR_PROCESSING`, `PROCESSING`, `PAYMENT_PENDING`, `COMPLETED`, `CLOSED`, `CANCELLED`, `UNABLE_TO_PROCEED`.

Do not create primary states such as `ESCALATED`, `REASSIGNED`, `MISSED` or `REFUNDED`. Represent those concepts using dedicated records, flags, metadata and request history.

## Workstream R1 — Document Requirements and Secure Uploads

Implement or complete:

- Service-specific required-document definitions
- Citizen upload of required documents
- Private and persistent file storage
- File type, size and basic completeness checks
- Document metadata and ownership
- Secure document retrieval and deletion rules
- Request-only versus reusable documents
- Access control for citizens, assigned employees and administrators
- Alembic migration and backend tests where schema changes are needed

## Workstream R2 — Deterministic Document Pre-Validation

Implement deterministic, non-AI checks for:

- Allowed file type and size
- Missing required document slots
- Duplicate uploads
- Basic readability indicators
- Simple format consistency
- Unreadable, missing, uploaded and replacement-required document states

Pre-validation must not replace employee review. Do not implement advanced OCR or autonomous document decisions in Phase 1.

## Workstream R3 — Document Review and Correction Cycle

Implement:

- Employee review of authorized request documents
- Approve/reject/request-correction actions
- Required correction reason
- Citizen replacement upload
- Review and correction history
- Revalidation after replacement
- Backend authorization and IDOR tests

Use `UNDER_REVIEW` and `CORRECTION_REQUIRED` where appropriate.

## Workstream R4 — Interaction Requirements and Scheduling

Implement:

- Available-now interaction requests
- Scheduled interaction requests
- Date/time and interaction metadata
- Citizen and employee interaction views
- Interaction completion and history
- Validation for required interactions
- Handling of missed interactions without inventing a new primary request state

Use `INTERACTION_REQUIRED` and `INTERACTION_SCHEDULED` where appropriate.

## Workstream R5 — Request-Specific Communication

Implement:

- One communication thread per service request
- Citizen and authorized employee messages
- Message timestamps and history
- Ownership, assignment and centre-scope checks
- Safe empty, loading and error states
- Cross-request and cross-user access tests

Messaging must never expose another request's conversation.

## Workstream R6 — Readiness and Processing Flow

Implement controlled business actions for:

- Checking document readiness
- Checking unresolved corrections
- Checking required interactions
- Marking a request ready
- Starting processing
- Recording processing history
- Marking unable to proceed with a required reason where authorized

Do not allow generic client-side status mutation.

## Workstream R7 — Consolidated Payment Workflow

Implement:

- Transparent fee calculation and fee snapshotting
- Government/application fee, authorized service charge and permitted charges
- `PAYMENT_PENDING` handling
- Mock/sandbox payment for Phase 1
- Duplicate-payment protection
- Payment timestamps and history
- Refund evidence where applicable
- Completion guards for payment-required requests

Do not claim production banking or card settlement integration if only a mock gateway exists.

## Workstream R8 — Notifications

Implement or complete notifications for:

- Request submission
- Employee acceptance
- Document correction
- Interaction scheduling and reminders
- Payment required/confirmed
- Processing and completion
- Cancellation and unable-to-proceed
- Support-ticket updates

Notification failure must not incorrectly change the underlying request state. Enforce recipient authorization.

## Workstream R9 — Cancellation, Escalation and Reassignment

Implement:

- Citizen cancellation of only their own request in approved cancellable states
- Required reason for unable-to-proceed actions
- 24-hour escalation detection for requests not accepted by a centre/employee
- Administrative escalation visibility and resolution records
- Atomic reassignment to eligible active employees/centres
- Capacity enforcement
- Centre-service support validation when changing centre
- Immediate revocation of the previous employee's access
- Suspended employee handling
- Assignment, escalation, history and audit records

Do not require a scheduler unless already supported. A deterministic backend/admin-triggered stale-request detection mechanism is acceptable for Phase 1.

## Workstream R10 — Support Tickets

Implement:

- Citizen ticket creation
- Subject, category, description and timestamps
- Optional link to a service request
- Ownership validation for linked requests
- Citizen ticket listing and detail view
- Authorized administrator/staff access
- Replies and status updates
- Ticket history
- Cross-user and cross-centre access tests

Support-ticket actions must not silently mutate the linked request state.

## Workstream R11 — Completed Output and Secure Delivery

Implement:

- Completion precondition checks
- Secure private storage for completed outputs
- Separate output storage references/keys
- Digital download where applicable
- Collection instructions where physical collection is required
- Citizen ownership checks
- Authorized staff access checks
- Controlled `COMPLETED` to `CLOSED` action where approved
- Completion and output history

Never expose raw filesystem paths or permit generic status updates.

## Workstream R12 — Audit Logging and Privacy Hardening

Implement or complete server-side audit logging for:

- Critical request transitions
- Assignment and reassignment
- Employee status changes
- Document review decisions
- Cancellation and unable-to-proceed actions
- Escalation resolution
- Payment/refund actions
- Completion and output changes
- Service, centre and role configuration changes

Audit metadata must not contain passwords, tokens, raw documents, payment secrets, banking/card data, unnecessary message contents or filesystem paths. Add negative authorization tests for requests, documents, messages, notifications, tickets and completed outputs.

## Workstream R13 — Role-Complete Frontend

Complete real API-backed interfaces for:

### Citizen

- Request details and timeline
- Documents and corrections
- Interactions
- Messaging
- Payment
- Notifications
- Cancellation
- Support tickets
- Completed output or collection instructions
- Request closure

### Centre Employee

- Queue and request workspace
- Document review
- Corrections
- Interactions
- Messaging
- Readiness and processing
- Unable-to-proceed action
- Completion workflow

### Centre Administrator

- Centre dashboard
- Employee/capacity overview
- Escalation queue
- Reassignment workflow
- Suspended employee handling
- Centre-level support/request monitoring

### System Administrator

- Approved system configuration and administration
- Service and centre management
- User/staff administration
- Audit-log visibility where authorized

Preserve role-aware routing. Frontend hiding is only a usability feature; backend authorization remains authoritative. Internal navigation must use React Router without full-page reloads or new tabs.

## Workstream R14 — Final Integration, Regression and Demonstration

Add and verify automated scenarios for:

1. Happy path: citizen request through secure completion and closure
2. Document correction and replacement
3. Required and scheduled interaction
4. Payment-required request
5. Citizen cancellation
6. 24-hour escalation and administrative reassignment
7. Capacity enforcement
8. Suspended/reassigned employee access revocation
9. Support ticket and response
10. Secure completed-output delivery
11. Cross-user, cross-centre and cross-role IDOR protection
12. Notification authorization and failure handling

## Engineering Rules

- Inspect existing code before creating models or migrations.
- Use Alembic for schema changes.
- Keep migrations linear and reversible where project policy requires it.
- Preserve existing work and avoid unrelated refactors.
- Keep backend authorization authoritative.
- Use transactions for critical multi-record operations.
- Do not invent government-portal integrations, production payment settlement or Phase 2 AI features.
- Add tests with every workstream.
- Update progress documentation only after implementation and tests pass.

## Verification Gates

Backend:

- `alembic upgrade head`
- formatting and linting
- type checking where configured
- complete `pytest` suite

Frontend:

- TypeScript build/type-check
- lint
- unit/integration tests
- production build

The final demonstration must show the complete approved Citizen → Akshaya Centre assisted-service lifecycle, including correction, interaction, payment, completion, support, exception handling, auditability and secure role-based access.

Create or update `docs/PHASE1_100_PERCENT_READINESS.md` only after all gates genuinely pass. If any gate fails, report `NOT YET ACHIEVED` and document the blockers.
