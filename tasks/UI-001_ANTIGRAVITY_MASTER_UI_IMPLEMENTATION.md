# UI-001 — Antigravity Master UI Implementation Task
## Akshaya MCA Service-Assistance Platform

## Objective
Implement the Akshaya web application's Phase-1 visual design system, shared application shell, role-aware navigation, reusable components, and the UI screens required for the 50–60% milestone. Antigravity should also verify the running UI in the browser, test responsiveness, validate role-specific navigation, and correct visual/UX mismatches within this task's scope.

Antigravity must NOT invent business logic, roles, request states, permissions, database rules, or API semantics.

## Authoritative repository inputs
Read before making changes:
1. `/AGENTS.md`
2. `/docs/PROJECT_SPEC.md`
3. `/docs/ARCHITECTURE.md`
4. `/docs/API_SPEC.md`
5. `/docs/SECURITY.md`
6. `/docs/UI_SPEC.md`
7. `/docs/50_60_PERCENT_MILESTONE.md`
8. `/docs/DECISIONS.md`
9. `/docs/CHANGE_POLICY.md`

If a visual preference conflicts with security, authorization, workflow, or API requirements, the approved project specification wins.

## Visual references

### Reference A — Login / registration image
This is the PRIMARY source for the entire application's visual theme:
- purple / blue / cyan gradient
- soft lavender background
- white elevated cards
- rounded forms and containers
- restrained soft shadow
- clean modern typography
- compact professional form layout

Rules:
- Adapt the content to Akshaya.
- Do not copy unrelated text.
- Do not add social-login buttons unless the approved project later supports them.
- The left visual panel may contain Akshaya branding and a short value statement.
- The right panel contains the authentication form.

### Reference B — Dashboard image
This is the PRIMARY structural/layout reference for authenticated pages:
- sidebar proportions
- app-shell composition
- information density
- metric-card hierarchy
- table/card composition
- topbar layout
- clean dashboard spacing

Rules:
- DO NOT use the green/black visual theme.
- DO NOT copy environmental/pollution content.
- Recreate only the structural quality and density.
- Use Reference A's purple/blue/cyan identity everywhere.

## Frozen visual direction

### Color tokens
Use these as the initial implementation tokens:

```css
--color-primary: #5538FF;
--color-primary-dark: #3923D9;
--color-primary-light: #7A67FF;
--color-blue: #4D8CFF;
--color-cyan: #86DFF3;

--color-bg: #F6F4FF;
--color-surface: #FFFFFF;
--color-surface-soft: #FAF9FF;

--color-text: #17141F;
--color-text-secondary: #777382;
--color-border: #E7E3F2;

--color-success: #2E9D66;
--color-warning: #D99020;
--color-danger: #D84D5F;
--color-info: #4D8CFF;
```

Minor changes are allowed only where needed for accessibility/contrast while preserving the visual direction.

### Brand gradient

```css
linear-gradient(
  135deg,
  #8AE5F6 0%,
  #4D8CFF 30%,
  #5538FF 58%,
  #D399FF 100%
)
```

Use it sparingly:
- authentication brand panel
- selected high-priority accents
- occasional summary/hero areas

Do not apply gradients to every card.

### Shape and spacing
Recommended:
- input/button radius: 10–12 px
- card radius: 16–20 px
- shell/modal radius: 20–24 px
- spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48
- H1: 28–32 px
- H2: 22–26 px
- H3: 18–20 px
- body: 14–16 px
- meta text: 12–14 px

Avoid oversized marketing typography inside authenticated screens.

## Global application shell

Desktop:

```text
┌──────────────────────────────────────────────────────────────┐
│ Sidebar                        │ Topbar / actions              │
│                                ├───────────────────────────────┤
│ Akshaya                        │ Page title / breadcrumb       │
│ Role context                   │                               │
│                                │ Main content                  │
│ Navigation                     │                               │
│                                │                               │
│                                │                               │
│ Settings/Profile/Logout        │                               │
└──────────────────────────────────────────────────────────────┘
```

### Sidebar
- desktop width about 240–280 px
- deep indigo / charcoal-purple, never green
- white/light labels
- selected nav item has clear purple/blue active state
- icon + label layout

Tablet/mobile:
- sidebar becomes a drawer/sheet
- use a topbar menu trigger
- do not keep a cramped permanent desktop sidebar

### Topbar
Use only meaningful actions:
- current page title/breadcrumb
- notifications
- account menu
- page-level primary action when relevant

## Role-aware navigation

### Citizen
- Dashboard
- Services
- My Requests
- Notifications
- Support
- Profile
- Logout

### Centre Employee
- Dashboard
- Request Queue
- My Requests / Assigned Requests
- Notifications
- Profile
- Logout

### Centre Administrator
- Dashboard
- Requests
- Employees
- Supported Services
- Notifications
- Centre Settings
- Profile
- Logout

### System Administrator
- Dashboard
- Centres
- Services
- Administrators / Staff
- Users
- System Activity
- Settings
- Profile
- Logout

If a destination is outside the active milestone, do not build fake functionality. Omit it or show a clearly approved disabled state.

## Shared component library

Create reusable components rather than page-specific copies.

### Layout
- AppShell
- Sidebar
- TopBar
- PageHeader
- ContentSection
- ResponsiveContainer

### Inputs
- TextInput
- PasswordInput
- SearchInput
- Select
- Textarea
- Checkbox
- FormField
- FormError

### Buttons
- PrimaryButton
- SecondaryButton
- GhostButton
- DangerButton
- IconButton

### Feedback
- Alert
- Toast
- ConfirmDialog
- Modal
- LoadingSkeleton
- EmptyState
- ErrorState

### Domain components
- ServiceCard
- CentreCard
- MetricCard
- RequestTable
- RequestCard
- StatusBadge
- ServiceTypeBadge
- RequestTimeline
- RequirementChecklist
- RoleBadge

### Utility
- Pagination
- FilterBar
- SearchAndFilterBar

## Request status visual contract

Use the approved states only:

| State | Visual intent |
|---|---|
| DRAFT | neutral |
| SUBMITTED | blue |
| WAITING_FOR_CENTRE | violet |
| ACCEPTED | indigo |
| UNDER_REVIEW | blue |
| CORRECTION_REQUIRED | amber |
| INTERACTION_REQUIRED | amber/orange |
| INTERACTION_SCHEDULED | cyan |
| READY_FOR_PROCESSING | purple |
| PROCESSING | blue-purple |
| PAYMENT_PENDING | amber |
| COMPLETED | green |
| CLOSED | muted green/neutral |
| CANCELLED | muted red |
| UNABLE_TO_PROCEED | red |

Never rely on color alone. Always show readable text and use accessible contrast.

# Screens required for the 50–60% milestone

## Authentication

### 1. Login
Closely follow Reference A.

Left:
- Akshaya branding
- purple/blue/cyan gradient
- short service-assistance value statement

Right:
- Akshaya identity/logo
- "Welcome back"
- Email
- Password
- Sign In
- link to citizen registration

Required states:
- normal
- submitting
- invalid credentials
- validation error
- network/server error
- expired-session message

No unsupported social login.

### 2. Citizen Registration
Use the same shell as Login.

Fields:
- Full name
- Email
- Phone if supported by the current API
- Password
- Confirm password

No role selector. Public registration always creates Citizen accounts.

## Citizen

### 3. Citizen Dashboard
Use Reference B's structure/density with Reference A's colors.

Recommended content:
- greeting
- primary CTA: Start New Request
- Active Requests metric
- Action Required metric
- Completed metric
- Recent Requests
- Recent Updates/Notifications
- Recommended/Common Services only if data/API supports them

Do not invent meaningless charts.

### 4. Service Catalogue
- search
- optional Type A/B/C filter
- service cards/list
- type badge
- description
- View Details action
- loading/empty/error states

### 5. Service Detail
Display:
- service name
- type
- description
- fixed document requirements
- allowed file types
- interaction requirements
- fee if available
- eligible/supported-centre summary
- Start Request CTA

### 6. Centre Selection
Eligible centres only.

Centre card:
- centre name
- locality/district
- service support confirmation
- fee information only if backend provides it
- Select action

Do not invent distance or scoring if the API does not provide it.

### 7. Request Creation / Review
Display:
- selected service
- requirements summary
- selected centre
- known fee
- warnings/preconditions
- Submit CTA

### 8. Request Detail / Timeline
Display:
- service
- request reference
- centre
- current status
- timestamps
- current action required
- request timeline/history
- contextual CTA only when backend permits it

## Centre Employee

### 9. Employee Dashboard
Show where supported:
- active assignments
- capacity remaining
- waiting queue count
- action-required count
- recent assigned requests

### 10. Request Queue
Use a compact professional table/list.

Before acceptance, show only metadata permitted by approved privacy rules.

Suggested columns:
- request reference
- service
- submitted time
- waiting duration
- status
- action

### 11. Request Workspace
For the milestone:
- request summary
- service
- permitted metadata
- status
- Accept action
- timeline/history area
- capacity warning if applicable

## Centre Administrator

### 12. Centre Dashboard
Recommended:
- active employees
- waiting requests
- active accepted requests
- supported service count
- recent centre activity

### 13. Employee Management
- employee table
- active/inactive
- availability
- capacity
- create employee
- deactivate/reactivate when authorized

### 14. Supported Services
- service list/table
- active state
- optional centre fee override
- enable/disable action
- search/filter

## System Administrator

### 15. System Dashboard
Recommended:
- active centres
- active services
- staff/users summary
- requests summary if API provides it
- recent administrative activity if implemented

### 16. Centre Management
- list
- search/filter
- create/edit
- activate/deactivate

### 17. Service Management
- list
- Type A/B/C
- requirements summary
- create/edit
- active/inactive

### 18. Staff/Admin Management
- centre administrators
- system-level staff/user lookup where implemented
- role
- active state
- authorized provisioning actions

# UI states required everywhere

Every API-driven page must visibly support:

### Loading
Prefer skeletons for cards/tables.

### Empty
Explain the state and provide a useful next action.
Example:
"You haven't created any requests yet."
CTA: "Browse Services"

### Validation error
Display field-specific messages.

### Authorization failure
Show a safe Access Denied state without sensitive resource details.

### Network/server failure
Display a clear retry action when retry is safe.

### Success
Use toast/banner where appropriate, but never rely on a toast for critical persistent information.

### In-progress mutations
Disable duplicate submit/accept actions while a request is in flight.

### Confirmations
Required for destructive/terminal actions such as cancellation and deactivation.

# Responsive rules

## Desktop
Primary target for employee and administration workflows.

## Tablet
- collapsible/drawer sidebar
- reduce columns where practical
- avoid horizontal scrolling when a responsive representation is possible

## Mobile
Citizen workflows must remain fully usable:
- drawer navigation
- one-column cards
- tables become mobile list/cards when needed
- primary CTA remains easy to reach
- full-width forms
- dialogs fit viewport
- no tiny status labels

# Accessibility

Required:
- semantic HTML
- keyboard navigation
- visible focus
- proper form labels
- accessible error relationships
- icon-only buttons have accessible names
- color is never the sole state indicator
- sufficient contrast

# API and authorization rules

- Use the approved API client/service layer.
- Do not hard-code roles for production behavior.
- Do not set authoritative request status directly in frontend state.
- Workflow transitions use approved backend action endpoints.
- 401 -> session/auth handling.
- 403 -> access denied.
- 409 -> workflow/state conflict.
- 422 -> validation feedback.
- Never display backend stack traces.
- Mock data may be used only for isolated visual development and must not remain as production application behavior.

# Browser and visual verification

After implementation:

1. Run the app.
2. Compare Login/Registration against Reference A.
3. Compare dashboard/app-shell structure against Reference B.
4. Confirm the green dashboard palette was NOT copied.
5. Verify consistent purple/blue/cyan branding.
6. Test all implemented role navigations.
7. Test desktop, tablet, and mobile widths.
8. Test loading, empty, error and authorization states.
9. Test key browser workflow paths.
10. Capture screenshots for PR review.

Perform correction passes for:
- alignment
- spacing
- card radius consistency
- button consistency
- typography hierarchy
- sidebar proportions
- table density
- status badge consistency
- responsive overflow

# Non-goals

Do NOT:
- redesign the business workflow
- add roles
- add request states
- invent APIs
- invent backend fields
- add social login
- add AI/chatbot features
- add unrelated charts
- change DB schema for UI convenience
- weaken security
- copy the green dashboard theme

# Expected deliverables

1. shared design tokens/theme
2. reusable component library
3. responsive AppShell
4. role-aware navigation
5. authentication screens
6. citizen milestone screens
7. employee milestone screens
8. centre-admin milestone screens
9. system-admin milestone screens
10. loading/empty/error/success states
11. key-screen screenshots
12. browser/E2E verification notes
13. frontend tests where appropriate

# Acceptance criteria

The task is complete only when:
- Login and Registration clearly follow Reference A's visual direction while being Akshaya-specific.
- The entire application consistently uses the Reference A purple/blue/cyan theme.
- Dashboard/application shell uses Reference B's structural quality and density without copying its green palette or content.
- Role navigation matches the approved role model.
- Required milestone screens exist.
- Shared components are reused.
- Major API-driven screens have loading, empty and error states.
- Citizen mobile flow is usable.
- Employee/admin desktop flows are usable.
- Status badges use the approved request-state vocabulary consistently.
- Frontend does not bypass backend authorization.
- No unsupported social login or unrelated analytics are added.
- Browser screenshots are attached to the implementation PR.
- Frontend tests/checks/build pass.

# Definition of Done

DONE means:
- implementation conforms to this specification,
- browser verification has been completed,
- responsive behavior has been checked,
- visual mismatches have been corrected,
- CI passes,
- screenshots are available for review,
- no Level-3 product/architecture decision was made without human approval.

If a required product-level visual decision is genuinely impossible to infer from the references or this task, STOP and request human approval rather than inventing a new design direction.
