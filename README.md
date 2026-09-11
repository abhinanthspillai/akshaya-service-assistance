# Akshaya MCA Project — Implementation Readiness Package

This repository package converts the approved 10-step engineering baseline into an implementation-ready contract for Claude, Codex, Antigravity and GitHub.

## Governing rule
Approved product, workflow, architecture and database decisions are authoritative. Implementation agents may not silently redesign them.

## Phase 1 goal
Deliver a reliable end-to-end citizen-to-Akshaya-centre service-assistance workflow.

## Frozen core stack
- Frontend: React + TypeScript
- Backend: Python + FastAPI
- ORM/migrations: SQLAlchemy 2.x + Alembic
- Database: PostgreSQL via Psycopg 3
- Validation: Pydantic v2
- Authentication: Argon2 password hashing + signed expiring JWT bearer access token
- Testing: Pytest (backend) plus frontend/unit/E2E tooling introduced only where required
- Source control / CI: Git + GitHub

Read `AGENTS.md` before any implementation.
