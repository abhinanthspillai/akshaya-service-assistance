# PROJECT_SPEC

## 1. Product definition
The Akshaya MCA project is a digital service-assistance platform that connects citizens with Akshaya Centres through a structured workflow for discovering services, understanding fixed requirements, uploading documents, selecting or being recommended a centre, submitting requests, centre acceptance, document review, required corrections/interactions, processing, payment, progress tracking, communication, escalation/reassignment, support, and secure delivery/collection of completed outputs.

It is not merely a service catalogue. The core value is the end-to-end assisted-service workflow.

## 2. Roles
1. Citizen
2. Centre Employee
3. Centre Administrator
4. System Administrator

External government departments/portals are integrations or external dependencies, not internal user roles.

## 3. Service classification
- Type A: predominantly digital; normally no mandatory physical centre interaction.
- Type B: mostly digital; one or limited meaningful citizen-centre interactions are required.
- Type C: substantial physical participation or centre procedure is required; the platform assists preparation, scheduling, communication and tracking.

Classification is based on the normal Akshaya assistance workflow and the amount of citizen-centre interaction, not simply on whether a government service is online.

## 4. Primary Phase 1 capabilities
- authentication and role-aware access
- Akshaya Centre management
- service catalogue
- Type A/B/C classification
- fixed required-document checklists
- supported file types
- service interaction requirements
- centre-supported-service configuration
- citizen request creation and submission
- system pre-validation
- centre recommendation and citizen choice
- centre request queue
- employee acceptance subject to capacity
- document review and corrections
- request state machine and timestamped history
- request-specific messaging/call actions
- interaction scheduling
- consolidated payment workflow (mock/sandbox acceptable during Phase 1)
- notifications
- cancellation, escalation and reassignment
- support tickets
- audit logging
- completed-document delivery / collection instructions
- privacy and least-privilege access

## 5. Request primary states
The approved primary state vocabulary is:
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

Agents must not invent additional primary states. Exceptional conditions such as stalled/escalated, delayed external processing, notification failure and reassignment are represented through dedicated records/flags/history where specified, unless an approved later decision explicitly changes this.

## 6. Important workflow rules
- Requests unaccepted for the configured escalation window (baseline: 24 hours) are escalated for administrative handling/reassignment.
- Suspended employees lose access and affected requests are reassigned.
- Employee acceptance is subject to maximum active-request capacity.
- Before acceptance, employee visibility is intentionally limited to the minimum queue metadata required for a decision.
- Payment follows required verification/readiness, not arbitrary early collection.
- Refunds preserve the original payment record and create a separate refund record.
- Document retention is configurable by service.
- Reusable documents and request-only documents are distinguished.
- Applicable fees are locked/snapshotted for the request when required by the approved workflow.
- Deactivation/configuration changes affect new requests unless an approved rule requires otherwise.
- Repeated missed mandatory interactions may lead to cancellation; baseline threshold is 3.
- Support tickets may be linked to service requests.
- Duplicate-request risk should produce a warning, not silent duplication.
- Suspicious or mismatched documents are flagged/rejected through review rules.
- Assignment/reassignment must be atomic.
- Reassignment revokes prior employee access.
- Notification delivery failure never changes the authoritative request state.
- External portal downtime must not falsely mark a request complete.
- Completion requires all mandatory preconditions.
- Critical changes must be transactional and history/audit producing where required.

## 7. Out of scope for the initial 50–60% milestone
- production-grade integration with every external government portal
- advanced AI runtime features
- autonomous decision-making on behalf of government services
- production payment settlement if a sandbox/mock flow sufficiently proves the workflow
- full Phase 2 intelligent document assistance
- complete advanced analytics

## 8. Non-functional baseline
- Security: least privilege, backend-authoritative authorization, secure password hashing, secure file access.
- Reliability: critical transitions are transactional; retries must be safe.
- Maintainability: modular backend, explicit contracts, migrations, tests.
- Accessibility: keyboard-friendly semantic frontend; labels and validation messages required.
- Observability: structured application logs without secrets/passwords/document contents.
- Performance: normal CRUD/API requests should be suitable for interactive web use; no synchronous long-running external work in request handlers.
- Cost: prefer simple deployable components; no cache/vector DB/agent runtime unless justified by an approved requirement.
