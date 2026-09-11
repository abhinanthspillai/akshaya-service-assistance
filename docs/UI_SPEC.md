# UI Reference Addendum

Authoritative visual references are stored at `docs/ui/references/`. Use `login_reference.png` for the entire color/theme language and `dashboard_reference.png` for authenticated layout structure. Full implementation instructions are in `tasks/UI-001_ANTIGRAVITY_MASTER_UI_IMPLEMENTATION.md`.

---

# UI_SPEC

Visual branding is not frozen here. Agents must implement a simple professional accessible interface without inventing elaborate visual requirements.

## Global navigation
Unauthenticated: Login, Register.
Citizen: Dashboard, Services, My Requests, Notifications, Support, Profile.
Centre Employee: Dashboard, Queue/Assigned Requests, Notifications, Profile.
Centre Administrator: Centre Dashboard, Requests, Employees, Supported Services, Notifications.
System Administrator: System Dashboard, Centres, Services, Administrators/Users, Audit/Support as implemented.

## Required initial screens
1. Login
2. Citizen Registration
3. Role-aware dashboard shell
4. Service Catalogue
5. Service Detail / requirements
6. Centre selection/recommendation list
7. Request creation / DRAFT summary
8. Request detail / timeline
9. Employee queue
10. Employee request workspace
11. Centre administration
12. System administration

## Screen-state contract
Every API-driven screen must define:
- loading
- empty
- success
- validation error
- authorization error
- server/network error
- retry path where safe

Buttons that perform state transitions must:
- be hidden/disabled when clearly invalid for UX
- still rely on backend enforcement
- show confirmation for destructive/terminal actions
- prevent accidental duplicate submits while a request is in-flight

## Forms
- visible labels, not placeholder-only labels
- inline validation
- server errors mapped to fields/general error
- preserve safe user input after validation errors
- password fields never log or echo values
- document requirements display accepted types and size limits

## Accessibility baseline
- semantic HTML
- keyboard operable
- focus states
- meaningful button/link labels
- accessible form errors
- color is not the only status indicator
