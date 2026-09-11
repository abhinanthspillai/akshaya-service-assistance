# Autonomous Milestone Controller — Phase 1 50–60%

## Objective
Allow Antigravity to implement the approved Phase 1 50–60% milestone autonomously on a protected milestone branch, while preserving frozen architecture, security rules, task order, traceability, and human control over `main`.

## Activation
This controller is active only when the human explicitly instructs Antigravity to execute this file.

## Starting point
Tasks 001–003 are considered prerequisite foundation work. Before beginning, verify that the latest approved Task 003 work is present in the branch history or in `main`.

Create or use:

`milestone/phase1-50-60`

Never perform autonomous implementation directly on `main`.

## Target milestone
The milestone is complete only when the approved implementation sequence below is implemented and locally validated as far as the environment permits:

1. `tasks/004_batch1_identity_schema.md`
2. `tasks/005_authentication.md`
3. `tasks/006_role_scope_authorization.md`
4. `tasks/007_centres_staff_admin.md`
5. `tasks/008_service_catalogue_schema.md`
6. `tasks/009_service_catalogue_api_ui.md`
7. `tasks/010_centre_support_config.md`
8. `tasks/011_service_request_schema.md`
9. `tasks/012_request_creation_api.md`
10. `tasks/013_request_submission.md`
11. `tasks/014_request_frontend.md`
12. `tasks/015_assignment_schema_service.md`
13. `tasks/016_employee_queue_acceptance.md`
14. `tasks/017_employee_queue_ui.md`
15. `tasks/018_history_timeline.md`
16. `tasks/019_e2e_security_regression.md`
17. `tasks/020_milestone_review.md`

Do not implement Phase 1 work beyond Task 020 under this controller.

## Required milestone outcome
The final branch should demonstrate the approved 50–60% vertical slice:

Citizen registration/login -> role-aware access -> browse approved services and requirements -> create request -> choose centre -> submit -> `WAITING_FOR_CENTRE` -> employee queue -> atomic capacity-aware acceptance -> `ACCEPTED` / initial review visibility -> request history/timeline -> role-aware frontend -> automated regression and browser/E2E coverage.

The milestone does not include the later full document-review/correction workflow, interaction scheduling/processing, payment completion flow, messaging/notifications, escalation automation, support-ticket completion, final-output delivery, or Phase 2 AI unless an earlier approved task explicitly requires a minimal prerequisite.

## Execution loop
For each task, strictly in the order above:

1. Read `AGENTS.md`, `ANTIGRAVITY.md`, the current task file, and all task-relevant authoritative docs.
2. Inspect current code and previous milestone commits.
3. Identify the smallest conformant implementation delta.
4. Classify the change under `docs/CHANGE_POLICY.md`.
5. If Level 3 is required, STOP the whole milestone and report the decision needed.
6. Implement only the current task.
7. Add/update the smallest sufficient tests.
8. Run all task-required backend/frontend/database validation.
9. Self-review the diff for scope creep, security, duplicate architecture, exposed secrets, and future-task leakage.
10. Update `docs/AGENT_PROGRESS.md`.
11. Commit the task separately using a task-specific message.
12. Continue to the next task only if the current task meets its Definition of Done or has only an explicitly documented environment limitation that does not invalidate correctness.

## Commit discipline
Use one primary commit per task where practical. Example messages:

- `feat: implement Task 004 identity schema`
- `feat: implement Task 005 authentication`
- `feat: implement Task 006 scoped authorization`
- `feat: implement Task 007 centre staff administration`

Fix commits are allowed when necessary, but task boundaries must remain clearly traceable.

Do not rewrite published branch history merely to make it look cleaner.

## Database gates
For every schema task:
- migrations must be created through Alembic;
- upgrade path must be tested;
- approved cardinality and constraints must be preserved;
- no future-task tables should be introduced early without explicit requirement;
- destructive/ambiguous migration changes require STOP and human review.

## Authentication/authorization gates
Authentication and authorization work must preserve:
- public Citizen registration only;
- no client-selected privileged role during public registration;
- Administrator-controlled staff provisioning according to approved specifications;
- Argon2 password hashing through the approved library;
- signed expiring JWT access tokens;
- backend-authoritative role and object-level authorization;
- active-user checks on authenticated requests.

Never weaken authorization to unblock UI or tests.

## Frontend/UI gates
For UI tasks:
- follow the approved role navigation and project visual direction already documented in the repository;
- reuse existing components when conformant;
- keep business-critical authorization on the backend;
- do not invent unsupported social login, new roles, unapproved actions, or backend capabilities;
- maintain practical responsive behavior for Citizen flows and desktop-first usability for employee/admin workflows.

If `tasks/UI-001_ANTIGRAVITY_MASTER_UI_IMPLEMENTATION.md` exists and is relevant, treat it as a UI implementation reference subordinate to frozen product/API/security specifications.

## Testing gates
A task cannot be marked complete merely because code compiles.

Run all relevant repository checks. Where applicable these include:

Backend:
```bash
ruff format --check .
ruff check .
mypy app tests
pytest
alembic upgrade head
```

Frontend:
```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Use repository scripts if command names differ.

At Task 019, run the complete security/regression suite and browser/E2E flow required by the task.

## Environment failures
A local environment limitation may be documented without weakening implementation when all of the following are true:
- the failure is demonstrably environmental rather than code-related;
- the corresponding CI/test environment is designed to provide the dependency;
- no test is changed to hide a real failure;
- no secret or insecure fallback is introduced.

If unsure whether a failure is environmental, STOP.

## Progress persistence
After each task update `docs/AGENT_PROGRESS.md` with:
- task number and status;
- commit SHA after commit is created;
- validation summary;
- environment limitations;
- next task;
- blockers or decisions required.

This file is a progress ledger, not a requirements source. If it conflicts with authoritative specifications, the specifications win.

## Stop conditions
Stop autonomous execution immediately if any of these occur:
- a Level 3 change is needed;
- two authoritative documents materially conflict;
- a security requirement cannot be satisfied;
- a migration would destroy or reinterpret approved data unexpectedly;
- tests indicate a real unresolved regression;
- the repository is on `main` and cannot safely switch/create the milestone branch;
- secrets or private data appear committed;
- the next task depends on an unimplemented decision not present in repository specifications;
- Task 020 is complete.

## Prohibited autonomous actions
Do not:
- merge into `main`;
- push directly to `main`;
- delete protected branches;
- rewrite frozen requirements;
- start Task 021 or later Phase 1/Phase 2 work;
- introduce runtime AI;
- invent missing product decisions;
- weaken tests/security to keep the milestone moving.

## Completion report
At the end of Task 020, provide one milestone report containing:
- all completed task numbers;
- commit SHA(s) per task;
- final branch name and HEAD SHA;
- full validation summary;
- E2E scenario result;
- known environment limitations;
- remaining post-60% scope;
- any deviations (expected: none unless explicitly approved);
- confirmation that `main` was not modified or merged autonomously.

Then STOP and wait for human/ChatGPT review before any merge.
