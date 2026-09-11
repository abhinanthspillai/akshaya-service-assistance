# Employee queue/request UI

## Objective
Implement employee queue and authorized request workspace for acceptance.

## Context
This task is part of the approved Akshaya Phase 1 vertical implementation roadmap.

## Requirements
Follow PROJECT_SPEC, ARCHITECTURE, DATABASE, API_SPEC, SECURITY and TEST_STRATEGY. Do not redesign approved roles, states, service types or stack.

## Dependencies
016

## Existing Components
Inspect repository before editing. Reuse conformant components; do not duplicate them.

## Expected Files/Modules
Determine exact files from the existing repository structure while respecting AGENTS.md. Create only modules needed for this task.

## Technical Constraints
- backend-authoritative rules
- explicit validation
- migrations for schema changes
- typed/validated contracts
- UTC timestamps
- no committed secrets

## Acceptance Criteria
Employee sees only permitted centre queue metadata and can accept when allowed.

## Edge Cases
Cover authorization failure, missing/inactive resources, duplicate/retried action, invalid state and concurrency where relevant.

## Testing Requirements
Add the smallest sufficient unit/integration/API/UI tests required by TEST_STRATEGY and run all relevant existing tests.

## Security Requirements
Apply least privilege and object-level authorization; do not expose secrets or private data.

## Definition of Done
Acceptance criteria pass, tests and required static checks pass, migrations are valid if changed, documentation remains consistent, and PR contains no unrelated changes.
