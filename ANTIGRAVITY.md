# ANTIGRAVITY.md — Autonomous Implementation Operating Manual

## Purpose
Antigravity is an implementation agent for the Akshaya Service Assistance MCA project. It may implement approved work autonomously only within the boundaries defined by this repository. Repository specifications are authoritative; agent preference is not.

## Mandatory reading order
Before editing code, read:
1. `AGENTS.md`
2. the active task or milestone controller under `tasks/`
3. `docs/PROJECT_SPEC.md`
4. `docs/DECISIONS.md`
5. `docs/ARCHITECTURE.md`
6. `docs/TECH_STACK.md`
7. `docs/DATABASE.md`
8. `docs/API_SPEC.md`
9. `docs/SECURITY.md`
10. `docs/TEST_STRATEGY.md`
11. `docs/CHANGE_POLICY.md`
12. `docs/GITHUB_WORKFLOW.md`
13. `docs/IMPLEMENTATION_PLAN.md`
14. any task-specific files referenced by the active task

Inspect the existing repository before creating or replacing any component.

## Frozen product boundaries
The approved stack is React + TypeScript, FastAPI, Python, Pydantic v2, SQLAlchemy 2.x, Alembic, Psycopg 3, PostgreSQL, Argon2 via pwdlib, signed expiring JWT bearer access tokens, Pytest, Git/GitHub, and private persistent file storage.

The application has exactly four roles: Citizen, Centre Employee, Centre Administrator, and System Administrator.

Do not introduce Redis, MongoDB, Firebase, vector databases, runtime AI frameworks, microservices, brokers, Kubernetes, alternative authentication models, new roles, new request states, or changed cardinalities unless an approved task explicitly requires it and the change is not Level 3.

## Backend authority
The backend is authoritative for authentication, authorization, role checks, object-level access, workflow transitions, assignment, employee capacity, payment readiness, document access, and business rules. Frontend validation is supplementary only.

Use explicit business-action endpoints for request transitions. Do not implement unrestricted status mutation.

## Database rules
Use SQLAlchemy 2.x and Alembic for schema changes. Preserve approved entities, relationships, and cardinalities. Use UTC-aware timestamps. Never hard-code database credentials or alter production schema outside migrations.

## Security rules
Apply least privilege and object-level authorization. Never log or commit passwords, JWTs, secret keys, database passwords, private document contents, or unnecessary personal data. Keep private files private and validate file metadata when file features are implemented.

## Implementation behavior
For every task:
- inspect existing code first;
- reuse conformant patterns;
- make the smallest coherent change;
- do not implement future tasks early;
- keep contracts aligned with repository specifications;
- add the smallest sufficient tests;
- do not weaken tests or authorization to obtain green results;
- distinguish code failures from local-environment failures;
- record environment limitations accurately instead of bypassing them.

## Validation baseline
Backend work normally requires:

```bash
ruff format --check .
ruff check .
mypy app tests
pytest
```

Schema/database work additionally requires:

```bash
alembic upgrade head
```

Frontend work must run the repository-defined install, lint, typecheck, test, and production-build commands.

Before every commit run:

```bash
git diff --check
git status
git diff --stat
```

## Change classification
Follow `docs/CHANGE_POLICY.md`.

Level 1 routine work may proceed autonomously. Level 2 compatible internal changes may proceed only when clearly required by the active approved task and must be documented. Level 3 changes require human approval before implementation.

Level 3 includes role changes, request-state changes, schema-cardinality changes, authentication-model changes, technical-stack changes, weakened authorization, major scope changes, or runtime AI introduction.

When uncertain, choose the higher level and stop.

## Normal Git mode
Unless an approved milestone controller explicitly activates Autonomous Milestone Mode, follow one task/issue -> one branch -> tests -> push -> PR -> CI -> review -> merge. Never push implementation directly to `main` and never locally squash/merge into `main`.

## Autonomous Milestone Mode
Autonomous Milestone Mode is activated only when the user explicitly instructs Antigravity to execute `tasks/000_MILESTONE_50_60_AUTONOMOUS.md`.

In this mode:
- use one dedicated milestone branch;
- execute only the task sequence listed by the controller;
- implement tasks strictly in order;
- create one clearly named commit per task;
- run the task's validation before moving to the next task;
- update `docs/AGENT_PROGRESS.md` after every task;
- never merge or push to `main`;
- never skip a failed required check unless the failure is demonstrably an external/local environment limitation and the controller permits continuing;
- stop immediately for any Level 3 decision, unresolved requirement conflict, destructive migration ambiguity, security regression, or repeated failing validation.

Later tasks may rely on earlier commits on the same milestone branch. The milestone branch exists to enable autonomous cumulative implementation while keeping `main` protected for later review.

## Requirement conflicts
If documents conflict, do not invent a compromise. Prefer explicit newer/frozen decisions only when the repository clearly identifies them. Otherwise stop and report the conflict.

## Final report format
When stopping or completing the milestone, report:
1. branch;
2. completed tasks;
3. current/blocked task;
4. changed files by task;
5. tests and build results;
6. migration results;
7. environment limitations;
8. security or architecture concerns;
9. commit SHAs by task;
10. push result;
11. remaining work;
12. whether any Level 3 decision is required.
