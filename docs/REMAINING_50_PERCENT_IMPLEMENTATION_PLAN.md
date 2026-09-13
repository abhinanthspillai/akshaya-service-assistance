# Akshaya Service Assistance — Remaining 50% Implementation Plan

## Purpose

This document is the execution baseline for completing the remaining Phase 1 implementation of the Akshaya Service Assistance MCA project.

The repository has already achieved the 50–60% milestone. The completed baseline includes backend/frontend foundations, authentication and RBAC, centre/staff management, service catalogue, centre-supported services, citizen request creation/submission, employee queue/acceptance, assignment/capacity enforcement, request history, frontend workflow shell, automated tests, and security regression coverage.

This plan covers the remaining work required to take **Phase 1 to a demonstrable, reliable 100% core workflow**. It must extend the existing implementation rather than redesign or rebuild it.

Phase 2 intelligent/AI features remain outside this plan unless explicitly required for a minimal Phase 1 pre-validation rule already approved in the project specification.

---

## 1. Frozen Rules

All implementation must remain consistent with:

- `docs/PROJECT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/API_SPEC.md`
- `docs/DATABASE.md`
- `docs/SECURITY.md`
- `docs/UI_SPEC.md`
- `docs/TEST_STRATEGY.md`
- `docs/DECISIONS.md`
- existing migrations, models, services, tests and UI patterns

Do not invent new primary request states. The approved states are:

`DRAFT`, `SUBMITTED`, `WAITING_FOR_CENTRE`, `ACCEPTED`, `UNDER_REVIEW`, `CORRECTION_REQUIRED`, `INTERACTION_REQUIRED`, `INTERACTION_SCHEDULED`, `READY_FOR_PROCESSING`, `PROCESSING`, `PAYMENT_PENDING`, `COMPLETED`, `CLOSED`, `CANCELLED`, `UNABLE_TO_PROCEED`.

Backend authorization remains authoritative. Critical state changes must be transactional and must create history/audit evidence where applicable.

---

## 2. Definition of Phase 1 Completion

Phase 1 is complete only when a Citizen can perform the following end-to-end flow using the real application UI and backend:

1. Sign in.
2. Discover a service and its requirements.
3. Create a service request.
4. Upload required documents.
5. Receive deterministic system pre-validation results.
6. Select an eligible Akshaya Centre.
7. Submit the request.
8. Centre Employee accepts the request subject to capacity.
9. Employee reviews documents.
10. Citizen corrects rejected/missing documents when required.
11. Required citizen-centre interactions can be requested and scheduled.
12. Request progresses through review/readiness/processing states.
13. Payment can be recorded through a safe mock/sandbox workflow.
14. Citizen and staff receive in-app notifications for important events.
15. Stalled/unaccepted requests can be escalated and reassigned safely.
16. Citizen can create a support ticket linked to the request.
17. Employee/Admin can complete the request only when mandatory preconditions are satisfied.
18. Completed output or collection instructions are delivered securely.
19. Citizen can close the request after completion where applicable.
20. Request history and audit evidence correctly show the lifecycle.

---

## 3. Remaining Implementation Workstreams

### Workstream R1 — Document Requirements and Secure Uploads

Implement the full request-document workflow.

Required capabilities:

- expose fixed service document requirements to Citizens;
- create request-document records tied to a service request and requirement;
- upload only approved file types and size limits;
- store files outside public static paths;
- use generated storage identifiers rather than user-controlled paths;
- prevent cross-user/cross-centre document access;
- distinguish reusable Citizen documents from request-only documents where supported by the approved schema;
- allow replacement/re-upload without destroying review history;
- expose metadata without exposing unsafe storage paths;
- validate ownership and request state before upload/delete/replace actions.

Acceptance criteria:

- Citizen can satisfy each required document slot;
- invalid type/size/ownership operations fail safely;
- Employee cannot access request documents before authorized assignment/acceptance;
- automated tests cover access control and file validation.

### Workstream R2 — Deterministic System Pre-Validation

Implement Phase 1 rule-based pre-validation only.

Checks may include:

- required file present;
- supported MIME/extension;
- file not empty;
- file size limit;
- duplicate upload warning where deterministically detectable;
- request checklist completeness.

Do not implement unsupported AI/OCR claims as part of Phase 1.

Pre-validation must return actionable Citizen-facing results and must never falsely claim government-document authenticity.

### Workstream R3 — Document Review and Correction Cycle

Implement Employee document review after request acceptance.

Required capabilities:

- transition `ACCEPTED -> UNDER_REVIEW` through an authorized business action;
- per-document review result;
- approve, reject, or request replacement with reason;
- suspicious/mismatched document flag where supported;
- transition to `CORRECTION_REQUIRED` when Citizen action is needed;
- Citizen sees exact correction reason for their own request;
- Citizen uploads corrected document/version;
- corrected request returns to authorized review flow;
- preserve prior review evidence rather than overwriting it.

Acceptance criteria:

- corrections are traceable;
- unauthorized reviewers are rejected;
- request cannot advance while mandatory unresolved document issues remain.

### Workstream R4 — Interaction Requirements and Scheduling

Implement required Citizen–Centre interaction workflow for Type B/Type C services.

Required capabilities:

- Employee can request an interaction when allowed;
- reason/type/instructions are recorded;
- state transition to `INTERACTION_REQUIRED`;
- Citizen can view the requirement;
- authorized scheduling creates an interaction appointment/record;
- state transition to `INTERACTION_SCHEDULED`;
- record attended/completed/missed outcome;
- repeated missed mandatory interactions use the approved baseline threshold of 3 before cancellation becomes allowable;
- history is produced for meaningful lifecycle events.

Do not create a new primary state for “missed”, “rescheduled” or similar events; represent them through interaction records/history.

### Workstream R5 — Request-Specific Communication

Implement request-scoped communication.

Required capabilities:

- Citizen and authorized Centre staff can exchange request-specific messages;
- only participants with current authorization can read/send;
- reassignment immediately revokes prior Employee access;
- message content is not leaked through logs;
- optional call action stores only appropriate request interaction metadata; do not fake telephony infrastructure.

### Workstream R6 — Readiness and Processing Flow

Implement controlled progression after review/interactions.

Required transitions/business actions:

- `UNDER_REVIEW/CORRECTION_REQUIRED/INTERACTION_* -> READY_FOR_PROCESSING` only after mandatory preconditions pass;
- `READY_FOR_PROCESSING -> PROCESSING` by authorized staff;
- processing notes/status metadata without inventing extra primary states;
- external portal/service downtime is recorded as operational metadata/history and must not falsely mark completion;
- `UNABLE_TO_PROCEED` requires authorized reason and audit/history evidence.

### Workstream R7 — Consolidated Payment Workflow

Implement a Phase 1 mock/sandbox-compatible payment workflow.

Required capabilities:

- applicable service/centre fees are snapshotted/locked for the request when required by the approved workflow;
- payment is requested only after required verification/readiness;
- transition to `PAYMENT_PENDING` only when payment is actually required;
- create payment record with amount, components, provider/mock reference, status and timestamps;
- idempotent payment confirmation handling;
- payment success/failure/cancellation behavior;
- refund uses a separate refund record and never mutates away the original payment evidence;
- no real card/bank secrets stored by the application.

The mock flow must be clearly labeled as development/sandbox behavior.

### Workstream R8 — Notification System

Implement in-app notifications for important events.

At minimum notify relevant users for:

- request submitted;
- request accepted;
- correction required;
- interaction required/scheduled;
- payment pending/confirmed;
- reassignment/escalation where user action/awareness is required;
- request completed;
- support-ticket update.

Notification failure must never change the authoritative request state.

Support read/unread behavior and secure user-scoped retrieval.

### Workstream R9 — Cancellation, Escalation and Reassignment

Implement exception handling without corrupting request history.

Required capabilities:

- Citizen cancellation only in allowed states;
- Employee/Admin inability-to-proceed path with reason;
- baseline escalation for requests remaining unaccepted for 24 hours;
- Centre Admin/System Admin escalation visibility;
- safe reassignment to another eligible Employee/Centre where allowed;
- atomic reassignment;
- capacity enforcement on the new assignee;
- previous assignee access revoked immediately;
- suspended Employee requests can be reassigned;
- escalation/reassignment represented through records/flags/history rather than invented request states.

### Workstream R10 — Support Tickets

Implement Citizen support workflow.

Required capabilities:

- create support ticket;
- optionally link it to a service request;
- Citizen can view own tickets;
- authorized Admin/support role can update/respond;
- status and timestamp history;
- no cross-user ticket access;
- request lifecycle remains independent unless an explicit approved business action changes it.

### Workstream R11 — Completed Output and Secure Delivery

Implement request completion and output delivery.

Required capabilities:

- completion only when all mandatory preconditions are satisfied;
- transition `PROCESSING/PAYMENT_PENDING -> COMPLETED` only through approved business rules;
- store completed-output metadata securely;
- support secure downloadable output when digital delivery is applicable;
- otherwise store/display centre collection instructions;
- only Citizen owner and properly authorized staff can access completed output;
- optionally transition `COMPLETED -> CLOSED` through the approved workflow;
- never mark completion merely because an external portal call was attempted.

### Workstream R12 — Audit Logging and Privacy Hardening

Complete security/audit coverage.

Audit at minimum:

- authentication-sensitive administrative actions;
- role/staff changes;
- centre/service configuration changes;
- request assignment/reassignment;
- document review decisions;
- critical request state transitions;
- payment/refund actions;
- completed-output access or changes where required.

Audit logs must not contain passwords, tokens, document bodies or payment secrets.

Re-run least-privilege checks across every new endpoint and UI action.

### Workstream R13 — Role-Complete Frontend

Complete the existing frontend rather than creating a separate UI.

Citizen UI must include:

- request detail page;
- document checklist/upload/correction UI;
- lifecycle timeline;
- interaction schedule UI;
- request messages;
- payment view/mock action;
- notifications;
- support tickets;
- completed-output/download/collection instructions.

Employee UI must include:

- assigned request workspace;
- secure document review;
- correction requests;
- interaction handling;
- processing actions;
- payment readiness/verification actions where appropriate;
- completion action.

Centre Admin/System Admin UI must include relevant:

- escalation/reassignment views;
- staff/capacity oversight;
- configuration and audit views allowed by role.

All UI actions must use backend authorization and must display useful loading, empty, success and validation/error states.

### Workstream R14 — Final Integration, Regression and Demonstration

Add/extend automated coverage for the complete Phase 1 workflow.

Required test categories:

- unit tests for state/business rules;
- API integration tests;
- RBAC/ownership regression tests;
- document security tests;
- assignment/capacity/reassignment transaction tests;
- payment idempotency tests;
- notification-failure independence tests;
- support-ticket authorization tests;
- completion-precondition tests;
- frontend tests for critical flows;
- at least one reliable E2E happy path from Citizen request creation through completion;
- at least one E2E correction path;
- at least one escalation/reassignment path.

All migrations must upgrade cleanly from the current repository baseline.

---

## 4. Recommended Execution Order

Implement in this order because later work depends on earlier workflow evidence:

1. R1 Document requirements/uploads
2. R2 System pre-validation
3. R3 Document review/corrections
4. R4 Interaction scheduling
5. R5 Request communication
6. R6 Readiness/processing
7. R7 Payment workflow
8. R8 Notifications
9. R9 Cancellation/escalation/reassignment
10. R10 Support tickets
11. R11 Completed output/delivery
12. R12 Audit/privacy hardening
13. R13 Role-complete frontend
14. R14 Full integration/regression/demo

Where database structures already exist, reuse them. Create migrations only for genuine schema gaps after comparing existing models and `docs/DATABASE.md`.

---

## 5. Engineering Rules for Autonomous Implementation

For every workstream:

1. Inspect the existing code and current tests before changing anything.
2. Confirm the approved domain rule from repository documentation.
3. Reuse existing architectural patterns.
4. Implement backend domain/service logic first.
5. Add/adjust schemas and API actions.
6. Add migration only when necessary.
7. Add authorization/ownership checks.
8. Add tests before considering the workstream complete.
9. Implement/update the UI against the real API.
10. Run targeted tests, then the full backend/frontend suites.
11. Keep commits small and descriptive.
12. Update progress documentation only after tests pass.

Do not silently weaken tests, bypass authorization, hard-code users/roles, or use fake success responses to make the UI appear complete.

---

## 6. Completion Gates

The project may be called **Phase 1 complete** only when all of the following are true:

- all required Phase 1 capabilities in `PROJECT_SPEC.md` are implemented or explicitly documented as intentionally mocked where permitted;
- database migrations are reproducible;
- backend tests pass;
- frontend lint/type/build/tests pass;
- authorization tests pass;
- E2E Citizen-to-Centre workflow passes;
- correction cycle passes;
- escalation/reassignment passes;
- payment sandbox/mock workflow passes;
- secure completion/output access passes;
- no critical TODO placeholder is left in an implemented Phase 1 flow;
- documentation matches the code;
- the application can be demonstrated from login through request completion without manual database edits.

---

## 7. Explicitly Deferred Beyond This Plan

Do not expand Phase 1 scope with:

- production integration with every Kerala/government external portal;
- autonomous government decisions;
- production card/banking settlement if mock/sandbox proves the approved payment workflow;
- advanced AI/OCR document intelligence beyond deterministic Phase 1 validation;
- advanced analytics/recommendation engines;
- unrelated infrastructure such as vector databases, agent runtimes or caches without an approved requirement.

These belong to later Phase 2 work or future integration work.

---

## 8. Final Deliverable

At the end of this plan the repository must contain a working Phase 1 application that demonstrates the complete Citizen → Akshaya Centre assisted-service lifecycle with secure role-aware access, traceable workflow decisions, reliable exception handling and sufficient automated evidence for MCA project evaluation.
