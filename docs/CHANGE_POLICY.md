# CHANGE_POLICY

## Level 1 — Routine
Agent may implement autonomously.
Examples:
- refactor with unchanged behavior
- fix lint/type errors
- add missing tests
- rename private helper
- improve error text without changing machine contract
- optimize a query without changing semantics

## Level 2 — Significant
Agent may proceed only when documented in PR/task reasoning and tests demonstrate compatibility.
Examples:
- new internal helper/module
- new non-breaking index
- dependency version upgrade within existing technology choice
- frontend component restructuring
- additional observability
- non-breaking API response field addition approved by spec compatibility rules

## Level 3 — Architectural / product
Human approval required before implementation.
Examples:
- adding/removing role
- changing service Type A/B/C meaning
- adding/removing/renaming primary request state
- changing allowed state transitions
- changing relational entities/cardinality in a way not already specified
- changing frontend/backend/database technology
- changing auth/token model
- weakening authorization
- changing Phase 1 scope
- introducing runtime AI, vector DB, microservices, broker, cache as architectural dependency
- changing endpoint semantics incompatibly

When uncertain between levels, choose the higher level.
