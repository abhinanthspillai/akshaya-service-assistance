# DATABASE

## 1. Principles
- PostgreSQL is authoritative persistent relational storage.
- SQLAlchemy 2.x mappings must match migrations.
- Alembic is the only supported schema-change path.
- UUID primary keys are recommended for externally exposed entities.
- UTC-aware timestamps are required.
- Foreign keys and CHECK constraints enforce stable invariants where practical.
- Soft deactivation is preferred for identities/configuration referenced by historical requests.
- Service/request snapshots must preserve historical meaning when catalogue configuration changes.

## 2. Batch 1 — frozen 11-table scope
1. users
2. citizen_profiles
3. akshaya_centres
4. employee_profiles
5. centre_administrators
6. services
7. service_document_requirements
8. service_requirement_allowed_file_types
9. service_interaction_requirements
10. centre_supported_services
11. service_requests

## 3. Physical implementation contract

### users
- id UUID PK
- email VARCHAR(255) NOT NULL UNIQUE (normalized lowercase)
- password_hash VARCHAR(255) NOT NULL
- role VARCHAR(32) NOT NULL CHECK in citizen, centre_employee, centre_administrator, system_administrator
- is_active BOOLEAN NOT NULL DEFAULT true
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
Indexes: unique(email), role, is_active.

### citizen_profiles
- user_id UUID PK/FK -> users.id ON DELETE CASCADE
- full_name VARCHAR(160) NOT NULL
- phone VARCHAR(32) NULL
- address_text TEXT NULL
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
Rule: referenced user must have role citizen (enforced in service logic; optional DB trigger is not required for Batch 1).

### akshaya_centres
- id UUID PK
- name VARCHAR(200) NOT NULL
- code VARCHAR(64) NOT NULL UNIQUE
- address_text TEXT NOT NULL
- locality VARCHAR(120) NULL
- district VARCHAR(120) NOT NULL
- pincode VARCHAR(16) NULL
- latitude NUMERIC(9,6) NULL
- longitude NUMERIC(9,6) NULL
- is_active BOOLEAN NOT NULL DEFAULT true
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
Indexes: district, is_active.

### employee_profiles
- user_id UUID PK/FK -> users.id ON DELETE CASCADE
- centre_id UUID NOT NULL FK -> akshaya_centres.id
- full_name VARCHAR(160) NOT NULL
- max_active_requests INTEGER NOT NULL DEFAULT 10 CHECK > 0
- is_available BOOLEAN NOT NULL DEFAULT true
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
Indexes: centre_id, (centre_id,is_available).

### centre_administrators
- user_id UUID PK/FK -> users.id ON DELETE CASCADE
- centre_id UUID NOT NULL FK -> akshaya_centres.id
- full_name VARCHAR(160) NOT NULL
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
Constraint: UNIQUE(user_id,centre_id); index centre_id.

### services
- id UUID PK
- name VARCHAR(200) NOT NULL
- code VARCHAR(80) NOT NULL UNIQUE
- description TEXT NULL
- service_type VARCHAR(1) NOT NULL CHECK in A,B,C
- is_active BOOLEAN NOT NULL DEFAULT true
- base_fee NUMERIC(12,2) NULL CHECK base_fee >= 0
- retention_days INTEGER NULL CHECK retention_days >= 0
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
Indexes: service_type, is_active.

### service_document_requirements
- id UUID PK
- service_id UUID NOT NULL FK -> services.id ON DELETE CASCADE
- name VARCHAR(200) NOT NULL
- description TEXT NULL
- is_required BOOLEAN NOT NULL DEFAULT true
- is_reusable BOOLEAN NOT NULL DEFAULT false
- max_file_size_bytes BIGINT NULL CHECK > 0
- sort_order INTEGER NOT NULL DEFAULT 0
- is_active BOOLEAN NOT NULL DEFAULT true
Constraint: UNIQUE(service_id,name).

### service_requirement_allowed_file_types
- requirement_id UUID NOT NULL FK -> service_document_requirements.id ON DELETE CASCADE
- mime_type VARCHAR(127) NOT NULL
Primary key: (requirement_id,mime_type).

### service_interaction_requirements
- id UUID PK
- service_id UUID NOT NULL FK -> services.id ON DELETE CASCADE
- name VARCHAR(200) NOT NULL
- description TEXT NULL
- is_mandatory BOOLEAN NOT NULL DEFAULT true
- max_missed_attempts INTEGER NOT NULL DEFAULT 3 CHECK >= 1
- sort_order INTEGER NOT NULL DEFAULT 0
- is_active BOOLEAN NOT NULL DEFAULT true

### centre_supported_services
- centre_id UUID NOT NULL FK -> akshaya_centres.id
- service_id UUID NOT NULL FK -> services.id
- is_active BOOLEAN NOT NULL DEFAULT true
- centre_fee_override NUMERIC(12,2) NULL CHECK >= 0
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
Primary key: (centre_id,service_id).
Indexes: service_id, (centre_id,is_active).

### service_requests
- id UUID PK
- citizen_id UUID NOT NULL FK -> users.id
- service_id UUID NOT NULL FK -> services.id
- selected_centre_id UUID NULL FK -> akshaya_centres.id
- status VARCHAR(40) NOT NULL CHECK in approved 15-state vocabulary
- service_type_snapshot VARCHAR(1) NOT NULL CHECK in A,B,C
- service_name_snapshot VARCHAR(200) NOT NULL
- fee_snapshot NUMERIC(12,2) NULL CHECK >= 0
- submitted_at TIMESTAMPTZ NULL
- completed_at TIMESTAMPTZ NULL
- cancelled_at TIMESTAMPTZ NULL
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
Rules:
- new request starts DRAFT.
- submitted_at becomes non-null when leaving DRAFT via submit.
- terminal timestamps correspond to COMPLETED/CLOSED/CANCELLED as applicable.
Indexes: citizen_id, service_id, selected_centre_id, status, created_at, (selected_centre_id,status).

## 4. Later tables already present in the logical model
Assignments, request documents, document reviews, corrections, interactions, payments, messages, notifications, request history, escalations, support tickets, completed outputs, audit logs.

These are later migrations and MUST NOT be collapsed into Batch 1 JSON blobs merely to avoid proper modelling.

### request_documents
Implemented in migration 0007.

- id UUID PK
- request_id UUID NOT NULL FK -> service_requests.id
- requirement_id UUID NOT NULL FK -> service_document_requirements.id
- uploaded_by_id UUID NOT NULL FK -> users.id
- storage_key VARCHAR(512) NOT NULL UNIQUE
- original_filename VARCHAR(255) NOT NULL
- content_type VARCHAR(127) NOT NULL
- size_bytes BIGINT NOT NULL
- sha256 VARCHAR(64) NOT NULL
- version INTEGER NOT NULL DEFAULT 1
- is_current BOOLEAN NOT NULL DEFAULT true
- uploaded_at TIMESTAMPTZ NOT NULL
- replaced_at TIMESTAMPTZ NULL

Rules:
- storage_key is generated by the backend and is never exposed in API responses.
- uploaded file bytes live in private file storage configured by FILE_STORAGE_PATH.
- replacement uploads create a new version and preserve prior metadata.
- authorization is enforced by Citizen ownership, active employee assignment, centre administrator scope or system administrator role.

### request_document_reviews
Implemented in migration 0008.

- id UUID PK
- request_id UUID NOT NULL FK -> service_requests.id
- document_id UUID NOT NULL FK -> request_documents.id
- requirement_id UUID NOT NULL FK -> service_document_requirements.id
- reviewer_id UUID NOT NULL FK -> users.id
- decision VARCHAR(40) NOT NULL CHECK in APPROVED, REJECTED, REPLACEMENT_REQUESTED, SUSPICIOUS
- reason TEXT NULL
- created_at TIMESTAMPTZ NOT NULL

Rules:
- review records are append-only evidence for a document version.
- replacement uploads create new request_documents rows and preserve earlier review rows.
- correction reasons are visible to the Citizen owner through authorized request-scoped endpoints.

### request_interactions
Implemented in migration 0009.

- id UUID PK
- request_id UUID NOT NULL FK -> service_requests.id
- requirement_id UUID NOT NULL FK -> service_interaction_requirements.id
- requested_by_id UUID NOT NULL FK -> users.id
- scheduled_by_id UUID NULL FK -> users.id
- outcome_recorded_by_id UUID NULL FK -> users.id
- status VARCHAR(40) NOT NULL CHECK in REQUESTED, SCHEDULED, COMPLETED, MISSED
- reason TEXT NOT NULL
- instructions TEXT NULL
- scheduled_at TIMESTAMPTZ NULL
- outcome_note TEXT NULL
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

Rules:
- missed and completed interactions are secondary record statuses, not primary service request states.
- required interactions move the request through INTERACTION_REQUIRED and INTERACTION_SCHEDULED only.
- repeated missed mandatory interactions remain represented through interaction records/history for later cancellation handling.

### request_messages
Implemented in migration 0010.

- id UUID PK
- request_id UUID NOT NULL FK -> service_requests.id
- sender_id UUID NOT NULL FK -> users.id
- body TEXT NOT NULL
- created_at TIMESTAMPTZ NOT NULL

Rules:
- messages are scoped to a single request.
- Citizen owners and the current active assigned Employee may read/send.
- reassignment revokes old Employee access because access is checked against active assignment.
- message bodies are request data and must not be emitted to application logs.

## 5. Migration sequence
0001 users
0002 profiles_and_centres
0003 services_and_requirements
0004 centre_supported_services
0005 service_requests
Then later vertical-slice migrations.

## 6. Seed data
Development/test only:
- one system administrator via secure bootstrap script/env-supplied password
- sample centre
- sample A/B/C services and requirements
No production default passwords committed to source control.
