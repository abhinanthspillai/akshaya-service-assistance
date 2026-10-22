# Akshaya MCA Project - Final Report

## Part 1: Greeting Inconsistency
- Created `frontend/src/utils/greeting.ts` with a time-based greeting logic based on local time.
- Removed the hardcoded `Good morning` from `Dashboard.tsx` body by removing the title prop.
- Added the `getGreeting` to the top desktop header in `AppLayout.tsx`.

## Part 2: Remove Profile from Employee Sidebar
- Confirmed that the `Profile` navigation item is already removed from the `centre_employee` block in `AppLayout.tsx`.

## Part 3: Simplify Employee Workflow
### Step 0: Audit
Currently, it takes a minimum of **9 clicks** for an employee to fully process a request with a single document from the moment they log in:
1. Click the request from the Queue dashboard (`WAITING_FOR_CENTRE`).
2. Click **Accept Request** (Moves to `ACCEPTED`).
3. Click **Start Document Review** (Moves to `UNDER_REVIEW`).
4. Click **Download** to view the document (No inline viewer exists).
5. Click **Approve** on the document.
6. Click **Mark Ready for Processing** (Moves to `READY_FOR_PROCESSING`).
7. Click **Start Processing** (Moves to `PROCESSING`).
8. Click **Complete Request** to open the completion modal.
9. Click **Complete & Deliver Output** in the modal.

This is highly inefficient and creates significant friction for high-volume centres.
