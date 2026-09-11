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
- Runtime AI is not part of Phase 1 core.

Any later change to these that materially alters security, data model, workflow, roles or architecture is Level 3.
