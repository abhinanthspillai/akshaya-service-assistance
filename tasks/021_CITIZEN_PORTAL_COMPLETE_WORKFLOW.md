# Task 021 — Complete Citizen Portal Workflow

## Status

**Planned / Ready for implementation**

## Objective

Complete the full Citizen-facing experience for the Akshaya Service Assistance Phase 1 project. This task must deliver a coherent, production-like Citizen portal covering dashboard, service discovery, request creation, request tracking, notifications, support, profile, responsive navigation, authorization boundaries, testing, and one complete manual Citizen E2E flow.

This task is limited to the **Citizen** experience. Centre Employee, Centre Administrator, and System Administrator work must not be expanded except where required for route compatibility or authorization protection.

---

## Existing baseline

The project already has:

- Citizen public registration
- Citizen login
- JWT bearer authentication
- `/auth/me`
- logout/session handling
- service catalogue screen
- service detail screen
- My Requests screen
- Request Detail screen
- Citizen sidebar navigation
- request creation/submission foundations
- request history/timeline foundations
- PostgreSQL + SQLAlchemy + Alembic
- current migrations through `0006 (head)`

Current Citizen navigation concept:

- Dashboard
- Services
- My Requests
- Notifications
- Support
- Profile
- Logout

Current gaps include:

- no real Citizen dashboard
- `/` redirects to Services rather than Dashboard
- Notifications is still a placeholder
- Support is still a placeholder
- Profile is still a placeholder
- Citizen workflow and UI are not yet complete end-to-end

---

## Non-negotiable project rules

Do not redesign the approved architecture, role model, authentication model, service classification, request state machine, or backend-authoritative business rules.

Approved roles are exactly:

1. Citizen
2. Centre Employee
3. Centre Administrator
4. System Administrator

Approved service types:

- **Type A** — predominantly digital, normally no mandatory physical centre interaction
- **Type B** — mostly digital, one or limited meaningful Citizen–Centre interaction
- **Type C** — substantial physical participation / centre procedure, with the system assisting preparation, scheduling, communication, and tracking

Approved primary request states:

- DRAFT
- SUBMITTED
- WAITING_FOR_CENTRE
- ACCEPTED
- UNDER_REVIEW
- CORRECTION_REQUIRED
- INTERACTION_REQUIRED
- INTERACTION_SCHEDULED
- READY_FOR_PROCESSING
- PROCESSING
- PAYMENT_PENDING
- COMPLETED
- CLOSED
- CANCELLED
- UNABLE_TO_PROCEED

Do not invent:

- new roles
- new primary request states
- runtime AI behavior
- OTP architecture
- social login
- automatic approval
- automatic centre assignment
- external government API integrations
- unapproved payment gateway architecture
- unapproved notification providers

Backend remains authoritative for:

- authentication
- role authorization
- object-level authorization
- request ownership
- request state
- request transitions
- service/centre validity
- request history

---

# 1. Citizen Dashboard

Create a proper Citizen Dashboard and make it the default Citizen landing route after login.

## Route

`/`

Citizen login must route to Dashboard, not directly to `/services`.

## Dashboard requirements

### Welcome section

Use Citizen name where available.

Suggested framing:

> Welcome back, <name>

> Access and track Akshaya services through one guided workflow.

### Summary cards

Show real data where supported:

- Active Requests
- Completed Requests
- Needs Attention
- Available Services

### Quick actions

- Browse Services
- Start New Request
- View My Requests
- Contact Support

### Recent requests

Show latest Citizen requests with:

- service name
- current status
- selected centre where available
- last updated
- open/view action

### Needs Attention

Highlight real actionable states such as:

- CORRECTION_REQUIRED
- INTERACTION_REQUIRED
- PAYMENT_PENDING

Do not invent fake alerts.

### Notifications preview

If a notification API exists, show recent notifications.

If not, show a polished empty/future-ready state rather than fake data.

### Required UI states

- loading
- empty
- API error
- normal populated state

---

# 2. Citizen Portal Design and Layout

Preserve the approved visual language:

- purple / indigo / blue / cyan
- soft lavender / off-white backgrounds
- white cards
- dark-indigo / charcoal text
- restrained gradients
- rounded corners
- subtle shadows
- professional government/service-portal feel

Do **not** use a green theme.

## App layout requirements

Improve the Citizen shell so it is:

- responsive
- mobile-friendly
- easy to navigate
- visually consistent

Citizen navigation must include:

- Dashboard
- Services
- My Requests
- Notifications
- Support
- Profile
- Logout

Add where appropriate:

- clear active nav state
- collapsible/mobile sidebar or drawer
- responsive page header
- Citizen name
- avatar/initials treatment

Do not expose Employee/Admin navigation to Citizens.

---

# 3. Services Module

Improve the existing Service Catalogue and Service Detail screens.

## Service Catalogue

Support:

- search
- active services only
- Type A / Type B / Type C filtering
- service cards
- service name
- concise description
- service type badge
- base/estimated fee where actually exposed
- View Details action
- Start Service action where appropriate

Required states:

- loading
- API error
- no services
- no search results

## Service Detail

Clearly show:

- service name
- description
- service type
- plain-language Type A/B/C explanation
- required documents/checklist
- mandatory/optional indication where available
- reusable/request-only indication where available
- allowed file types where exposed
- interaction requirements
- fee/base fee where available
- supporting centre information where available
- Citizen-relevant notes only

Provide a clear **Start Request** action.

Do not claim that the platform itself issues government certificates, approves applications, or replaces government portals.

---

# 4. Request Creation Workflow

Create a guided Citizen request creation experience using the existing backend-authoritative request APIs.

## Recommended UI flow

### Step 1 — Service

- confirm selected service
- show service type

### Step 2 — Requirements

- show required document checklist
- show interaction requirements
- explain Type A/B/C implications

### Step 3 — Centre

- show supporting/available Akshaya Centres
- allow Citizen to choose a centre
- if recommendation support exists, show recommendation(s)
- Citizen remains the final chooser

Do not automatically assign a centre unless approved backend behavior already does so.

### Step 4 — Review

Show:

- service
- service type
- selected centre
- fee snapshot if available
- requirement summary

### Step 5 — Create / Submit

Use approved workflow:

- create DRAFT where appropriate
- explicit submit action
- backend determines authoritative resulting state

Expected early progression:

DRAFT → SUBMITTED → WAITING_FOR_CENTRE

Do not silently mutate request status on the frontend.

## Error handling

Handle:

- inactive service
- unsupported centre
- validation errors
- duplicate/retry behavior
- backend unavailable
- network failure
- double-submit prevention

---

# 5. My Requests

Upgrade My Requests into a clear Citizen tracking page.

## Required functionality

Provide tabs/filters where useful:

- Active
- Needs Attention
- Completed
- Cancelled / Closed
- All

Show each request with:

- service name
- request reference / ID
- current status
- centre name
- created/submitted date
- updated date
- next-action indicator where relevant

Search by service name or request reference only if supported cleanly.

Citizen must only see their own requests.

No cross-user data leakage is acceptable.

---

# 6. Request Detail / Citizen Request Workspace

Upgrade Request Detail into the primary Citizen request workspace.

## A. Request header

Show:

- service name
- current status
- service type
- request ID/reference
- selected centre
- submitted date
- last updated

## B. Progress / timeline

Use authoritative request history only.

Human-readable timeline may represent approved states such as:

- Draft
- Submitted
- Waiting for Centre
- Accepted
- Under Review
- Correction Required
- Interaction Required
- Interaction Scheduled
- Ready for Processing
- Processing
- Payment Pending
- Completed
- Closed
- Cancelled
- Unable to Proceed

Do not manufacture history records.

## C. Next Action banner

Show contextual Citizen guidance based on actual status, for example:

- Waiting for Centre
- Correction Required
- Interaction Required
- Payment Pending
- Completed

The banner must explain what the Citizen should do next without inventing unsupported actions.

## D. Requirements / Documents

Show the request/service checklist.

If document upload/review backend is not yet implemented:

- show the correct section and current availability state
- clearly mark unavailable actions
- do not fake successful uploads

## E. Interaction section

If interaction backend exists, wire real data/actions.

If not, show informational state only.

## F. Payment section

If payment backend exists, use real data/actions.

If not:

- show fee/payment status only where backed by real data
- do not fake payment completion

## G. Communication

Only wire request messaging/chat if the backend exists.

Do not invent messaging endpoints.

---

# 7. Notifications

Replace the `/notifications` placeholder.

If notification backend exists, support:

- notification list
- unread/read state
- request-linked navigation
- timestamps
- mark-read action if supported

If backend does not exist:

- create a polished future-ready screen
- show honest empty state
- document the missing backend dependency
- do not use fake notifications

---

# 8. Support

Replace the `/support` placeholder.

Citizen Support should include:

- clear help introduction
- request-specific support entry where supported
- general support/ticket section where backend exists
- concise FAQ/help guidance based only on approved project behavior
- support/contact guidance

If support-ticket backend is unavailable:

- build a proper shell/empty state
- do not fake persisted tickets
- document the backend dependency

---

# 9. Profile

Replace `/profile` placeholder.

Display real Citizen information from `/auth/me` or existing profile APIs:

- full name
- email
- role = Citizen
- other profile fields actually available

Editing rules:

- if approved update endpoint exists, wire it
- if not, keep fields read-only
- do not invent an API

Include logout action.

---

# 10. Authorization and Route Protection

Citizen portal routes must enforce Citizen role.

Required behavior:

- unauthenticated user → `/login`
- Citizen routes → Citizen only
- Employee routes → Centre Employee only
- Centre Admin routes → Centre Administrator only
- System Admin routes → System Administrator only

A logged-in Employee/Admin must not be able to open Citizen-only pages merely by typing the URL.

Frontend route protection is required for UX, but backend authorization remains authoritative.

---

# 11. Shared UI States and Reusable Components

Every Citizen page must handle:

- loading
- error
- empty state
- processing/disabled actions where appropriate
- responsive/mobile layout
- success feedback where relevant

Avoid browser `alert()` for normal user flows.

Prefer small reusable Citizen components where appropriate, including:

- PageHeader
- StatusBadge
- RequestCard
- EmptyState
- LoadingState
- ErrorState
- ServiceTypeBadge
- RequirementChecklist
- RequestTimeline
- ActionBanner

Do not over-engineer.

---

# 12. Project-Specific Content

Remove generic SaaS wording from Citizen pages.

Use Akshaya Service Assistance framing consistently.

Preferred wording examples:

> Access and track Akshaya services through one guided workflow.

> Find the service you need, prepare your requirements, choose an Akshaya Centre, and track your request.

Avoid unsupported claims such as:

- the application directly issues government certificates
- the application replaces government portals
- the application automatically approves applications
- the application guarantees service completion

The product assists the Citizen–Akshaya workflow.

---

# 13. Source-of-Truth Inspection Before Implementation

Before implementing each module, inspect the current repository source of truth, including where present:

- `docs/PROJECT_SPEC.md`
- `docs/DECISIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/API_SPEC.md`
- `docs/SECURITY.md`
- `docs/TEST_STRATEGY.md`
- relevant task files
- backend endpoints
- backend schemas
- backend models
- existing migrations
- existing frontend pages/components

If filenames differ, locate the equivalent current project documents.

## Backend dependency rule

If a Citizen feature needs backend functionality that does not exist:

### Allowed

If it is already approved Phase 1 behavior and can be implemented as a straightforward conformant vertical slice, implement the smallest necessary backend support.

### Stop condition

If it requires a new Level 3 architecture/product decision, stop and report the blocker rather than inventing a solution.

---

# 14. Testing Requirements

## Backend tests

At minimum verify:

- Citizen can only see own requests
- Citizen cannot access employee/admin operations
- service access
- request creation
- request submission
- centre support/selection validation
- request history ownership
- any new approved Citizen APIs

Run:

```bash
ruff format --check .
ruff check .
mypy app tests
pytest
```

## Frontend tests

Cover where practical:

- Citizen dashboard renders
- Citizen role protection
- Service Catalogue
- Service Detail
- request creation flow
- submit flow
- My Requests
- Request Detail
- Notifications page
- Support page
- Profile page
- logout
- loading/error/empty cases

Run:

```bash
npm install
npm run lint
npm run typecheck
npm run build
npm test -- --run
```

Do not skip failing tests simply to mark the task complete.

---

# 15. Manual Citizen E2E Acceptance Test

Use a real local PostgreSQL database and real backend/frontend processes.

Complete this exact flow:

1. Register a new Citizen.
2. Login.
3. Verify Citizen Dashboard.
4. Browse Services.
5. Open Service Detail.
6. Start a request.
7. Review requirements.
8. Select an Akshaya Centre.
9. Create draft/request.
10. Submit request.
11. Verify request appears in My Requests.
12. Open Request Detail.
13. Verify authoritative status/history.
14. Verify Citizen cannot access `/queue`.
15. Open Notifications.
16. Open Support.
17. Open Profile.
18. Logout.
19. Verify protected route redirects to `/login`.

Do not use fake/mock success for the final manual E2E.

---

# 16. Completion Criteria

This task may be marked complete only when all of the following are true:

- Citizen Dashboard exists and is the Citizen landing page
- Services flow is usable
- Service Detail is complete for current API data
- request creation is guided and functional
- centre selection is functional where backend supports it
- request submission works
- My Requests is usable
- Request Detail/timeline is usable
- Citizen route protection is correct
- Notifications placeholder is replaced
- Support placeholder is replaced
- Profile placeholder is replaced
- responsive Citizen navigation is implemented
- backend/frontend automated tests pass
- manual Citizen E2E succeeds
- no secrets are committed
- no Level 3 decisions are silently invented

If some approved Citizen functionality cannot be completed because backend modules are intentionally not yet implemented, the task report must identify each remaining dependency explicitly and must not falsely claim full completion.

---

# 17. Git Workflow

Before changing code:

```bash
git status
```

Do not overwrite unrelated local work.

Use focused commits where practical. Suggested commit structure:

```text
feat(citizen): add citizen dashboard and responsive portal shell
feat(citizen): complete service and request creation flow
feat(citizen): complete request tracking experience
feat(citizen): add notifications support and profile screens
test(citizen): cover citizen workflow and authorization
```

Push only to:

```text
origin/milestone/phase1-50-60
```

Do **not**:

- push directly to `main`
- merge PR #7
- commit `.env`
- commit passwords/tokens/secrets
- rewrite unrelated history

---

# 18. Required Final Report

At completion, report all of the following:

1. Citizen modules completed
2. Dashboard implementation
3. Service Catalogue / Service Detail changes
4. Request creation workflow
5. Centre selection behavior
6. My Requests changes
7. Request Detail / timeline changes
8. Document section status
9. Interaction section status
10. Payment section status
11. Notifications status
12. Support status
13. Profile status
14. Citizen route authorization
15. Backend endpoints added/changed
16. Database/migrations added/changed
17. Frontend tests
18. Backend tests
19. Lint/type/build results
20. Manual E2E result
21. Files changed
22. Commit SHAs
23. Push result
24. Remaining Citizen functionality
25. Any Level 3 blocker
26. Confirmation that no secrets were committed

Do not call the Citizen module complete unless the complete manual E2E succeeds or the report explicitly identifies the remaining backend blockers.
