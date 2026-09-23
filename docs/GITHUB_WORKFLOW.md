# GITHUB_WORKFLOW

## Branch model
Protected `main` for production-ready code.
Working branch `develop` for all ongoing implementation work.
No additional per-task branches are used unless explicitly required.

## Lifecycle
Issue -> branch -> implementation -> local validation -> PR -> CI -> AI review -> fixes -> human approval -> squash merge.

## Commit convention
Conventional-style:
- feat:
- fix:
- test:
- refactor:
- docs:
- chore:

## PR template requirements
- linked task/issue
- summary
- spec references
- schema/API changes
- security impact
- tests run
- screenshots for UI changes
- Level 2/3 change disclosure

## CI required checks
Backend:
- format/lint
- type check when configured
- pytest
- migration upgrade on clean PostgreSQL

Frontend:
- install with lockfile
- lint
- typecheck
- unit tests when present
- production build

Security:
- dependency vulnerability scan suitable for ecosystem
- secret scan

E2E:
Required once the first end-to-end workflow exists; may run on merge/staging if runtime cost is high.
