# Domain Rules
- Service Request is the central transaction.
- Primary request states are frozen to the 15 states in PROJECT_SPEC.
- State changes must be business actions with preconditions and history.
- Centre/employee access is scoped; reassignment revokes prior employee access.
- Capacity constrains acceptance.
- Payment is gated by workflow readiness.
- Notification failure does not alter authoritative request state.
- Historical request meaning survives later configuration edits through snapshots.
- External system failure cannot produce false completion.
