# Phase 1 Completion Progress

## Status Legend

- NOT STARTED
- IN PROGRESS
- BLOCKED
- COMPLETE

## Workstreams

| Workstream | Status | Verification |
|---|---|---|
| R1 - Document Requirements and Secure Uploads | COMPLETE | `pytest tests/api/test_request_documents.py tests/api/test_requests.py tests/api/test_e2e_regression.py`; `ruff check app tests`; `ruff format --check app tests`; `mypy app tests`; `alembic upgrade head`; `npm run typecheck`; `npm test -- --run`; `npm run build` |
| R2 - Deterministic System Pre-Validation | COMPLETE | `pytest tests/api/test_request_documents.py tests/api/test_requests.py tests/api/test_e2e_regression.py`; `ruff check app tests`; `ruff format --check app tests`; `mypy app tests`; `npm run typecheck`; `npm test -- --run`; `npm run build` |
| R3 - Document Review and Correction Cycle | COMPLETE | `pytest tests/api/test_request_documents.py tests/api/test_requests.py tests/api/test_e2e_regression.py`; `ruff check app tests`; `ruff format --check app tests`; `mypy app tests`; `alembic upgrade head`; `npm run typecheck`; `npm test -- --run`; `npm run build` |
| R4 - Interaction Requirements and Scheduling | COMPLETE | `pytest tests/api/test_request_documents.py tests/api/test_requests.py tests/api/test_e2e_regression.py`; `ruff check app tests`; `ruff format --check app tests`; `mypy app tests`; `alembic upgrade head`; `npm run typecheck`; `npm test -- --run`; `npm run build` |
| R5 - Request-Specific Communication | COMPLETE | `pytest tests/api/test_request_documents.py tests/api/test_requests.py tests/api/test_e2e_regression.py`; `ruff check app tests`; `ruff format --check app tests`; `mypy app tests`; `alembic upgrade head`; `npm run typecheck`; `npm test -- --run`; `npm run build` |
| R6 - Readiness and Processing Flow | NOT STARTED | Pending |
| R7 - Consolidated Payment Workflow | NOT STARTED | Pending |
| R8 - Notification System | NOT STARTED | Pending |
| R9 - Cancellation, Escalation and Reassignment | NOT STARTED | Pending |
| R10 - Support Tickets | NOT STARTED | Pending |
| R11 - Completed Output and Secure Delivery | NOT STARTED | Pending |
| R12 - Audit Logging and Privacy Hardening | NOT STARTED | Pending |
| R13 - Role-Complete Frontend | NOT STARTED | Pending |
| R14 - Final Integration, Regression and Demonstration | NOT STARTED | Pending |

## R1 Notes

- Added request-document metadata persistence with private generated storage keys.
- Added Citizen upload/replacement, document listing and authorized download endpoints.
- Added file validation for configured MIME types, known extension/MIME pairs, empty files and max size.
- Preserved replacement history by versioning request documents.
- Enforced Citizen ownership and active employee assignment access for document operations.
- Added citizen request-detail UI for document requirement upload and replacement.

## R2 Notes

- Added `POST /requests/{request_id}/pre-validate` for deterministic request document checks.
- Enforced mandatory document pre-validation during request submission.
- Added duplicate-content warning based on uploaded document hashes.
- Kept validation language limited to file/checklist rules and avoided any authenticity, OCR or AI claims.
- Added citizen request-detail UI for document check feedback.

## R3 Notes

- Added request document review evidence in migration 0008.
- Added active-assignment-only start-review and document-review business actions.
- Implemented `ACCEPTED -> UNDER_REVIEW` and non-approval review transition to `CORRECTION_REQUIRED`.
- Made correction reasons visible to the Citizen owner.
- Replacement upload from `CORRECTION_REQUIRED` returns the request to `UNDER_REVIEW` while preserving prior review evidence.
- Added employee request workspace controls for document review and correction requests.

## R4 Notes

- Added request interaction records in migration 0009.
- Added active-assignment business actions for requiring interactions and recording outcomes.
- Added Citizen/Employee scheduling support with `INTERACTION_REQUIRED -> INTERACTION_SCHEDULED`.
- Represented missed/completed outcomes on interaction records instead of inventing primary request states.
- Added Citizen request-detail scheduling UI and Employee workspace interaction controls.

## R5 Notes

- Added request messages in migration 0010.
- Added request-scoped list/send endpoints for Citizen owners and current active assigned Employees.
- Added authorization tests for cross-Citizen denial and employee access only after assignment.
- Added Citizen and Employee request workspace message panels.
