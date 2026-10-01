# Centre Employee Workflow

## End-to-End Workflow
1. **Intake**: A request created by a citizen enters the system. After routing to a specific centre, it enters the `WAITING_FOR_CENTRE` state.
2. **Acceptance (Claiming)**: An employee at the targeted centre views the queue and accepts the request. This assigns the request to the employee and transitions it to `ACCEPTED`.
3. **Verification**: The employee starts the review process, transitioning the request to `UNDER_REVIEW`.
4. **Document Review**: The employee reviews each uploaded document:
   - If **APPROVED**, the document is marked as `VERIFIED`.
   - If **REPLACEMENT_REQUESTED**, the document is marked as `REUPLOAD_REQUIRED` and the request transitions to `CORRECTION_REQUIRED`.
   - If **REJECTED**, the document is marked as `REJECTED` and the request transitions to `CORRECTION_REQUIRED`.
   - If the citizen is fundamentally ineligible, the employee transitions the entire request to `UNABLE_TO_PROCEED`.
5. **Processing**: Once documents are in order, the request transitions through `READY_FOR_PROCESSING` and `PROCESSING`. Additional steps like `INTERACTION_REQUIRED` and `PAYMENT_PENDING` may occur.
6. **Completion**: Upon successful processing, the request is marked `COMPLETED`.

## State Transitions
| Current State | Allowed Next States | Triggered By |
| --- | --- | --- |
| `WAITING_FOR_CENTRE` | `ACCEPTED`, `CANCELLED` | `centre_employee` (Accept), `citizen` (Cancel) |
| `ACCEPTED` | `UNDER_REVIEW`, `UNABLE_TO_PROCEED`, `CANCELLED` | `centre_employee` (Review, Reject), `citizen` (Cancel) |
| `UNDER_REVIEW` | `CORRECTION_REQUIRED`, `INTERACTION_REQUIRED`, `READY_FOR_PROCESSING`, `UNABLE_TO_PROCEED`, `CANCELLED` | `centre_employee` (various), `citizen` (Cancel) |
| `CORRECTION_REQUIRED` | `UNDER_REVIEW`, `INTERACTION_REQUIRED`, `UNABLE_TO_PROCEED`, `CANCELLED` | `citizen` (Resubmit), `centre_employee` |
| `INTERACTION_REQUIRED` | `INTERACTION_SCHEDULED`, `UNABLE_TO_PROCEED`, `CANCELLED` | `citizen`, `centre_employee` |
| `INTERACTION_SCHEDULED` | `UNDER_REVIEW`, `INTERACTION_REQUIRED`, `UNABLE_TO_PROCEED`, `CANCELLED` | `centre_employee`, `system`, `citizen` |
| `READY_FOR_PROCESSING`| `PROCESSING`, `UNABLE_TO_PROCEED` | `centre_employee` |
| `PROCESSING` | `PAYMENT_PENDING`, `COMPLETED`, `UNABLE_TO_PROCEED` | `centre_employee` |
| `PAYMENT_PENDING` | `PROCESSING`, `COMPLETED`, `UNABLE_TO_PROCEED`, `CANCELLED` | `system` (Payment success), `centre_employee` |

## Document Verification & Rejection
- When a document is rejected or marked for replacement, the document itself changes status (`REUPLOAD_REQUIRED` or `REJECTED`), and the parent request is automatically transitioned to `CORRECTION_REQUIRED`.
- The citizen must re-upload the document and resubmit the request to move it back to `UNDER_REVIEW`.
- An ineligible citizen leads the employee to reject the *entire request* by moving it to `UNABLE_TO_PROCEED`. 

## Centre Scoping
Requests are scoped by the `selected_centre_id`. According to the implementation in `api/endpoints/requests.py`:
- `centre_employee` users can only list and view requests where `selected_centre_id` matches their own `centre_id`.
- Furthermore, an employee must have an `approval_status` of `APPROVED` to view requests.

## Request Limits & Acceptance
- **Limit ENFORCED**: Yes, the system enforces a limit on active claims.
- Specifically, the `accept_request` endpoint checks `active_count >= employee.max_active_requests`. If the limit is reached, it raises a 409 error: "Employee at maximum capacity".

## Notifications
- The system fires automated notifications on state changes using `_safe_add_notification`.
- During document correction, a notification is explicitly dispatched to the citizen with the reason.
- When an employee is assigned to a request or the request is cancelled, notifications are logged.

## Account Approval Flow
- Centre Employees are approved by the `centre_administrator`.
- `centre_administrator` accounts are approved by a `system_administrator`.
- An employee cannot view centre requests until their `approval_status` is updated to `APPROVED`.

## Mermaid Diagram
```mermaid
stateDiagram-v2
    [*] --> DRAFT: Citizen creates
    DRAFT --> SUBMITTED: Citizen submits
    SUBMITTED --> WAITING_FOR_CENTRE: Auto-routed
    WAITING_FOR_CENTRE --> ACCEPTED: Employee accepts
    ACCEPTED --> UNDER_REVIEW: Employee starts review
    
    UNDER_REVIEW --> CORRECTION_REQUIRED: Request correction
    CORRECTION_REQUIRED --> UNDER_REVIEW: Citizen re-uploads
    
    UNDER_REVIEW --> INTERACTION_REQUIRED: Needs Interaction
    INTERACTION_REQUIRED --> INTERACTION_SCHEDULED: Citizen schedules
    INTERACTION_SCHEDULED --> UNDER_REVIEW: Interaction completed
    
    UNDER_REVIEW --> READY_FOR_PROCESSING: All approved
    READY_FOR_PROCESSING --> PROCESSING: Begin centre work
    
    PROCESSING --> PAYMENT_PENDING: Request fee
    PAYMENT_PENDING --> PROCESSING: Payment confirmed
    
    PROCESSING --> COMPLETED: Final approval
    
    ACCEPTED --> UNABLE_TO_PROCEED: Reject entirely
    UNDER_REVIEW --> UNABLE_TO_PROCEED: Reject entirely
    PROCESSING --> UNABLE_TO_PROCEED: Reject entirely
```

## Gaps & Inconsistencies
- `CANCELLED` is an allowed transition from `PAYMENT_PENDING`, which may complicate refunds if the cancellation occurs concurrently with a payment attempt.
- Document rejection transitions the request to `CORRECTION_REQUIRED`, but does not verify if multiple documents are simultaneously rejected (though this is mitigated by the atomic nature of the review endpoint, doing it in bulk might be cleaner).
- The transition from `DRAFT` to `SUBMITTED` involves citizen action, but `SUBMITTED` immediately transitions to `WAITING_FOR_CENTRE` via the `SUBMIT_REQUEST_ROUTING` action in the same API call. `SUBMITTED` is basically transient.

### Employee Capacity Meter
Each employee has a `max_active_requests` limit to prevent them from taking on too many requests simultaneously. A visual capacity meter displays in the Queue header, showing how many active assignments the employee holds against their limit. If they attempt to accept a request when at maximum capacity, the system prevents it and returns a 409 conflict error.

### Queue Filters
The employee dashboard includes server-side queue filters to help manage workloads efficiently:
*   **Assigned To**: Filter by `ME` (assigned to the current employee), `UNASSIGNED` (waiting to be picked up), or `OTHERS` (assigned to colleagues in the same centre).
*   **Status**: Filter by specific request status (e.g., `WAITING_FOR_CENTRE`, `UNDER_REVIEW`, `PAYMENT_PENDING`).
*   **Search**: Full-text search on request IDs and citizen names.
*   **Service & Date Range**: Narrow down requests by specific service type or submission date range.
All these filters map directly to URL search parameters for deep-linking.

### Support Tickets Access Rules
Employees can interact with Support Tickets under strict scoping rules:
*   **Access**: Employees can only view tickets linked to requests assigned to their specific centre.
*   **Actions**: Employees can read messages and post replies to the citizen.
*   **Restrictions**: Employees *cannot* create new support tickets, nor can they change the status (open/close) of tickets. Centre scoping ensures they receive a 403 Forbidden error if they attempt to access tickets belonging to another centre.
