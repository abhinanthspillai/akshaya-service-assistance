# IMPLEMENTATION_PLAN

Implementation is vertical-slice oriented.

## Stage 0 — Repository and CI foundation
Repo structure, environments, lint/type/test commands, GitHub Actions skeleton.

## Stage 1 — Backend foundation + authentication
FastAPI boot, config, SQLAlchemy, PostgreSQL, Alembic, health, users/profiles, citizen registration, login, JWT, /auth/me, role dependencies.

## Stage 2 — Centre and staff administration
Centres, employee/admin profiles, staff provisioning, scoped authorization.

## Stage 3 — Service catalogue and fixed requirements
Services, Type A/B/C, document requirements, file types, interaction requirements, centre-supported services.

## Stage 4 — Citizen request creation vertical slice
Service browsing -> requirement view -> DRAFT -> centre selection -> submit -> WAITING_FOR_CENTRE, with request snapshots.

## Stage 5 — Employee queue/acceptance
Assignment tables/migrations, queue metadata, capacity, atomic accept, ACCEPTED.

## Stage 6 — Document upload/review/corrections
Secure file storage, metadata, review, correction loop.

## Stage 7 — Interactions and processing
Required interaction, scheduling, readiness, processing.

## Stage 8 — Payment and completion
Mock/sandbox acceptable; PAYMENT_PENDING -> completion rules -> completed outputs.

## Stage 9 — Notifications, messages, support, escalation, audit
Operational resilience and traceability.

## Stage 10 — hardening/E2E/demo
E2E flows, security regressions, review/demo fixtures.

Each stage ends with tests and a PR. Do not implement all database/backend/frontend separately before proving workflows.
