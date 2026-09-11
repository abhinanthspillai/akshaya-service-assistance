# TECH_STACK

| Area | Selected technology | Purpose / constraint |
|---|---|---|
| Frontend | React + TypeScript | Web UI, typed client |
| Backend | Python + FastAPI | REST API and business logic |
| Validation | Pydantic v2 | Request/response validation |
| ORM | SQLAlchemy 2.x | Relational mapping |
| Migrations | Alembic | All schema evolution |
| DB driver | Psycopg 3 | PostgreSQL connectivity |
| Database | PostgreSQL | Transactional relational store |
| Passwords | pwdlib Argon2 | Password hashing |
| Tokens | signed expiring JWT bearer tokens | API authentication |
| Backend tests | Pytest | Unit/integration/API tests |
| Source control | Git | Version control |
| Hosting/CI source | GitHub | Source of truth, issues, PRs, CI |

## Deliberately not required in Phase 1 foundation
- Redis/cache
- vector database
- runtime agent framework
- microservices
- message broker
- Kubernetes

They may be introduced only when an approved requirement demonstrates a real need.
