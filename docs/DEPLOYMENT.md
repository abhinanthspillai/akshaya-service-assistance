# DEPLOYMENT

## Environments
- local development
- CI/test
- staging/demo
- production (later)

## Local
Frontend dev server -> FastAPI localhost -> local PostgreSQL.
Environment variables configure database URL, JWT secret, CORS origins and storage path/provider.

## Staging/demo
- frontend static/web host
- FastAPI application host
- managed or hosted PostgreSQL
- persistent private file storage
- HTTPS
- environment secrets outside repository

## Production principles
- TLS required
- database backups
- migration step before app rollout
- health/readiness endpoints
- structured logs
- rollback plan
- persistent upload storage must not live only on ephemeral container filesystem

No specific cloud vendor is architecturally required by the current baseline.
