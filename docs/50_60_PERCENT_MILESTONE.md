# 50_60_PERCENT_MILESTONE

The milestone is measured by meaningful workflow coverage, not file count.

## Must be complete
1. Repository/CI foundation
2. PostgreSQL + migrations
3. Authentication and four-role foundation
4. Citizen self-registration
5. Centre/staff administration
6. Service catalogue
7. Type A/B/C configuration
8. Fixed document and interaction requirements
9. Centre-supported services
10. Citizen request creation
11. DRAFT -> SUBMITTED -> WAITING_FOR_CENTRE
12. Centre employee queue
13. capacity-aware atomic request acceptance
14. ACCEPTED / initial UNDER_REVIEW workflow entry
15. basic request history for implemented transitions
16. role-aware frontend for the above
17. automated API/integration tests and at least one browser E2E flow

## Required end-to-end demo
A citizen registers/logs in, browses a service and requirements, creates a request, selects an eligible centre, submits it; an authorized employee at that centre sees the queue and accepts the request; both parties then see the correct role-filtered request state/history.

## May remain for later milestone
- full document upload/review/correction loop
- complete interaction scheduling
- payment workflow
- full messaging/notifications
- escalation/reassignment automation
- support tickets
- completed-output delivery
- comprehensive audit UI
- Phase 2 AI capabilities

This boundary produces a genuinely usable partial system and exercises the core architecture.
