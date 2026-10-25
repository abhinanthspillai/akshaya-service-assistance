import os
try:
    from .styles import (
        add_chapter_heading, add_heading_1, add_heading_2, add_heading_3,
        add_body_p, add_bullet_p, add_styled_table, add_figure_image
    )
except ImportError:
    from styles import (
        add_chapter_heading, add_heading_1, add_heading_2, add_heading_3,
        add_body_p, add_bullet_p, add_styled_table, add_figure_image
    )
try:
    from .schemas import add_all_database_schemas
except ImportError:
    from schemas import add_all_database_schemas

def add_chapter_4_design(doc, cfg=None, diagrams_dir=None):
    if diagrams_dir is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        diagrams_dir = os.path.join(base_dir, "01_Inputs", "diagrams")
    if cfg is None:
        cfg = {}

    pj = cfg.get("project", {})
    project_short = pj.get("short_name", "AKSHAYA")

    # =========================================================================
    # CHAPTER 4: SYSTEM DESIGN
    # =========================================================================
    add_chapter_heading(doc, 4, "System Design")

    add_heading_1(doc, "4.1 Introduction")
    add_body_p(
        doc,
        "System design is the foundational phase in software engineering where architectural requirements are translated into detailed "
        "structural and behavioral blueprints. It bridges domain analysis and physical implementation, defining software components, "
        "data models, interfaces, object relationships, and operational workflows. For the Akshaya Service Assistance Platform, system design encompasses two primary domains: "
        "Object-Oriented Modeling utilizing the Unified Modeling Language (UML 2.5), and Relational Database Engineering encompassing PostgreSQL "
        "table schemas, Boyce-Codd Normalization proofs, foreign key integrity constraints, and role-based access control policies."
    )

    add_heading_1(doc, "4.2 UML Diagrams")
    add_body_p(
        doc,
        "The Unified Modeling Language (UML) provides a standard graphical notation for visualizing, specifying, constructing, and documenting "
        "the artifacts of software-intensive systems. The Akshaya system design incorporates nine standardized UML 2.5 diagrams strictly ordered per autonomous college format:"
    )

    # 4.2.1 USE CASE DIAGRAM
    doc.add_page_break()
    add_heading_2(doc, "4.2.1 Use Case Diagram")
    add_body_p(
        doc,
        "The Use Case Diagram captures the functional boundaries of the system by depicting the relationships between external actors and "
        "the use cases with which they interact. In the Akshaya Service Assistance Platform, four primary human actors are modeled: Citizen (Applicant), "
        "Centre Employee (Staff), Centre Administrator (Supervisor), and System Administrator (State Level Governance), alongside three secondary boundary systems: "
        "Razorpay Payment Gateway, External Government Portals (e-District), and Secure Object Storage."
    )
    add_bullet_p(doc, "Authenticates via Argon2 password / JWT bearer token, explores categorized service catalogue (Type A, B, C), uploads mandatory documents, selects or gets recommended an Akshaya Centre, submits service requests, tracks live status, remedies flagged defects, schedules in-person interactions, pays service fees online, and downloads completed certificates.", "Citizen Actor")
    add_bullet_p(doc, "Accesses the centre intake queue, accepts requests subject to capacity limits (<= 10 concurrent active requests), reviews document checklists against criteria, flags document defects with specific reasons, schedules physical appointments, processes applications on external government portals, and uploads signed certificates.", "Centre Employee Actor")
    add_bullet_p(doc, "Manages centre staff profiles, monitors employee workloads and capacity thresholds, reassigns stalled or overloaded requests, configures supported services and centre fee overrides, and resolves citizen escalations.", "Centre Administrator Actor")
    add_bullet_p(doc, "Provisions new Akshaya Centres across districts, manages the statewide master service catalogue and document checklist definitions, monitors platform health, and audits immutable system-wide activity logs.", "System Administrator Actor")
    add_figure_image(
        doc,
        os.path.join(diagrams_dir, "uml_01_use_case.png"),
        "Figure 4.1: Use Case Diagram for Citizen, Centre Employee, and Administrator Ecosystem",
        width_inches=5.8
    )

    # 4.2.2 SEQUENCE DIAGRAM
    doc.add_page_break()
    add_heading_2(doc, "4.2.2 Sequence Diagram")
    add_body_p(
        doc,
        "The Sequence Diagram illustrates the temporal order of message exchanges between instantiated objects during an active transaction. "
        "The diagram details the chronological execution flow when a Citizen applies for a government service: from initial service selection, "
        "document pre-validation (MIME, size, SHA-256), queue allocation, employee capacity check and intake, document review and correction cycle, "
        "appointment scheduling, online Razorpay fee payment, departmental processing, and secure certificate delivery."
    )
    add_body_p(
        doc,
        "Lifelines represent the Citizen (React SPA), AuthController (FastAPI), RequestService (Workflow Engine), DocumentEngine (Storage Manager), "
        "PostgreSQL (Relational Store), CentreDesk (Staff UI), RazorpayAPI (Payment Gateway), and CompletedOutput (Delivery Subsystem). "
        "Messages are strictly numbered to emphasize synchronous request-response pairs and asynchronous background event triggers."
    )
    add_figure_image(
        doc,
        os.path.join(diagrams_dir, "uml_02_sequence.png"),
        "Figure 4.2: Sequence Diagram for Citizen Request Submission, Document Review, Payment & Output Delivery",
        width_inches=5.8
    )

    # 4.2.3 STATE CHART DIAGRAM
    doc.add_page_break()
    add_heading_2(doc, "4.2.3 State Chart Diagram")
    add_body_p(
        doc,
        "The State Chart Diagram (State Machine) models the dynamic lifecycle states of a ServiceRequest entity within the Akshaya ecosystem. "
        "In strict compliance with approved architectural specifications, a service request transitions through deterministic, auditable states: "
        "DRAFT -> SUBMITTED -> WAITING_FOR_CENTRE -> ACCEPTED -> UNDER_REVIEW -> (CORRECTION_REQUIRED loop) -> "
        "(INTERACTION_REQUIRED -> INTERACTION_SCHEDULED) -> READY_FOR_PROCESSING -> PROCESSING -> COMPLETED (or CANCELLED / REJECTED)."
    )
    add_body_p(
        doc,
        "State transitions are governed by strict business invariants: a request cannot transition to ACCEPTED unless the claiming employee has "
        "capacity (active_requests < max_active_requests); a request cannot move to READY_FOR_PROCESSING without all mandatory documents approved; "
        "and terminal completion requires verified payment and uploaded output artifacts."
    )
    add_figure_image(
        doc,
        os.path.join(diagrams_dir, "uml_03_state.png"),
        "Figure 4.3: State Chart Diagram for Akshaya Service Request Lifecycle",
        width_inches=5.8
    )

    # 4.2.4 ACTIVITY DIAGRAM
    doc.add_page_break()
    add_heading_2(doc, "4.2.4 Activity Diagram")
    add_body_p(
        doc,
        "The Activity Diagram specifies the step-by-step procedural workflow and decision logic governing end-to-end citizen service delivery. "
        "It employs swimlanes representing the Citizen (Web Portal), Akshaya Backend (FastAPI & PostgreSQL), and Centre Staff (Akshaya Desk), capturing "
        "decision branching (document validity checks, physical interaction requirements) and iterative correction cycles."
    )
    add_body_p(
        doc,
        "The process initiates when a Citizen discovers a required service and uploads checklist documents. The backend pre-validates files and registers "
        "the request in the targeted centre queue. A centre employee claims the request, evaluates uploaded files against criteria, flags any discrepancies "
        "with explanatory reasons, and schedules in-person biometric/signature interactions when required for Type B/C services. Following online fee payment, "
        "the staff submits the application to the external department and uploads the verified completion certificate."
    )
    add_figure_image(
        doc,
        os.path.join(diagrams_dir, "uml_04_activity.png"),
        "Figure 4.4: Activity Diagram for Citizen-to-Akshaya Assistance Workflow",
        width_inches=5.8
    )

    # 4.2.5 CLASS DIAGRAM
    doc.add_page_break()
    add_heading_2(doc, "4.2.5 Class Diagram")
    add_body_p(
        doc,
        "The Class Diagram provides the static structural view of the system, depicting domain entity models, data access objects, attributes, "
        "methods, and relational associations. It formalizes foreign key mappings, composition relationships, and encapsulation boundaries across the domain."
    )
    add_body_p(
        doc,
        "Core entity classes include User (base identity with Argon2 authentication), CitizenProfile, AkshayaCentre (governing locality and capacity), "
        "EmployeeProfile (governing workload limits), Service (defining Type A/B/C classifications and fees), ServiceDocumentRequirement, "
        "ServiceRequest (managing state transitions and fee snapshots), RequestDocument (versioned file metadata), RequestDocumentReview, "
        "RequestInteraction, RequestPayment, CompletedOutput, and AuditLog."
    )
    add_figure_image(
        doc,
        os.path.join(diagrams_dir, "uml_05_class.png"),
        "Figure 4.5: Class Diagram for Akshaya Service Assistance Architecture",
        width_inches=5.8
    )

    # 4.2.6 OBJECT DIAGRAM
    doc.add_page_break()
    add_heading_2(doc, "4.2.6 Object Diagram")
    add_body_p(
        doc,
        "The Object Diagram provides a snapshot of instantiated objects at a specific execution moment in runtime memory. "
        "It illustrates real-world object instances, concrete attribute values, and bidirectional linkages during an active Caste Certificate application."
    )
    add_body_p(
        doc,
        "Instances depicted include citUser_101:User, citProfile_101:CitizenProfile (Abhinanth S Pillai), centre_KJP:AkshayaCentre (Kanjirappally Town Centre), "
        "emp_205:EmployeeProfile (Kavitha Nair), srv_caste:Service (Revenue Department Caste Certificate), req_892:ServiceRequest (Status: PROCESSING), "
        "versioned document uploads doc_aadhaar and doc_ration, review decision rev_ration, confirmed payment pay_order, and audit entry audit_892."
    )
    add_figure_image(
        doc,
        os.path.join(diagrams_dir, "uml_06_object.png"),
        "Figure 4.6: Object Diagram for Active Service Request Instance",
        width_inches=5.8
    )

    # 4.2.7 COMPONENT DIAGRAM
    doc.add_page_break()
    add_heading_2(doc, "4.2.7 Component Diagram")
    add_body_p(
        doc,
        "The Component Diagram models the modular software subsystems comprising the Akshaya platform, detailing their provided "
        "and required interface contracts. Components are organized across three primary architectural tiers: Presentation Tier (React 18 SPA), "
        "Application Tier (FastAPI REST Runtime), and Persistence / External Gateway Tier."
    )
    add_body_p(
        doc,
        "The Presentation Tier comprises CitizenPortal, EmployeeDesk, AdminConsole, and ApiClient. The Application Tier encapsulates AuthSecurityMiddleware, "
        "ServiceRequestWorkflowEngine, DocumentValidationEngine, and PaymentBridge. The Persistence Tier hosts PostgreSQL 16 managed via SQLAlchemy 2.x ORM "
        "and Alembic migrations, alongside secure private file storage and Razorpay payment webhooks."
    )
    add_figure_image(
        doc,
        os.path.join(diagrams_dir, "uml_07_component.png"),
        "Figure 4.7: Component Diagram for Modular Web & Backend Subsystems",
        width_inches=5.8
    )

    # 4.2.8 DEPLOYMENT DIAGRAM
    doc.add_page_break()
    add_heading_2(doc, "4.2.8 Deployment Diagram")
    add_body_p(
        doc,
        "The Deployment Diagram maps logical software artifacts onto physical hardware processing nodes and network execution environments. "
        "It depicts Client Workstations (Citizen and Staff web browsers), the Application Server Node (Ubuntu Linux hosting Nginx reverse proxy "
        "and Uvicorn ASGI running FastAPI), the Relational Database Server Node (PostgreSQL 16), and External Cloud Gateways connected over TLS 1.3 encrypted HTTPS."
    )
    add_body_p(
        doc,
        "Security boundaries are strictly enforced: the client browser communicates exclusively via TLS 1.3 over port 443 with Nginx; Nginx proxies requests "
        "to Uvicorn running on an internal Unix socket; and FastAPI connects to PostgreSQL on port 5432 using connection pooling via psycopg 3 with encrypted credentials."
    )
    add_figure_image(
        doc,
        os.path.join(diagrams_dir, "uml_08_deployment.png"),
        "Figure 4.8: Deployment Diagram for Physical Web & Database Topology",
        width_inches=5.8
    )

    # 4.2.9 COLLABORATION DIAGRAM
    doc.add_page_break()
    add_heading_2(doc, "4.2.9 Collaboration Diagram")
    add_body_p(
        doc,
        "The Collaboration (Communication) Diagram emphasizes the structural organization and message linkages between collaborating "
        "runtime objects during an active service request lifecycle. Unlike the Sequence Diagram which focuses on linear time progression, "
        "the Collaboration Diagram highlights object connectivity and numbered message flows passed across communication pathways."
    )
    add_body_p(
        doc,
        "The diagram visualizes the collaborative mesh uniting CitizenPortal, SecurityFilter, WorkflowEngine, DocumentValidator, PostgresDB, "
        "CentreDesk, PaymentBridge, StorageManager, and AuditLogger, demonstrating how a single citizen action triggers coordinated validation, "
        "state mutation, queue broadcasting, and immutable audit recording."
    )
    add_figure_image(
        doc,
        os.path.join(diagrams_dir, "uml_09_collaboration.png"),
        "Figure 4.9: Collaboration Diagram for Service Request Processing & Verification",
        width_inches=5.8
    )

    # 4.3 USER INTERFACE DESIGN USING MODERN WEB ARCHITECTURE
    doc.add_page_break()
    add_heading_1(doc, "4.3 User Interface Design & Visual Layout Architecture")
    add_body_p(
        doc,
        "The user experience and visual architecture of the Akshaya platform were designed adhering to modern responsive web standards "
        "utilizing React 18, TypeScript, and Tailwind CSS. The design system emphasizes clarity, high contrast, cognitive simplicity for diverse "
        "citizen demographics (including rural and elderly users), and dense information hierarchy for centre staff handling high-volume queues:"
    )
    add_bullet_p(doc, "Hex #0D47A1 / #1565C0 (Government Blue) — used for official institutional headers, primary call-to-actions, and certified badges.", "Primary Institutional Blue")
    add_bullet_p(doc, "Hex #2E7D32 (Emerald Green) — used for verified document approvals, completed service states, and confirmed payment alerts.", "Verified State Green")
    add_bullet_p(doc, "Hex #C62828 (Alert Crimson) — used for document defect warnings, required correction prompts, and overdue interaction notices.", "Correction Alert Crimson")
    add_bullet_p(doc, "Hex #F8FAFC / #FFFFFF (Clean Slate) — high-contrast background surfaces minimizing cognitive fatigue during document inspection.", "Clean Canvas Slate")

    add_heading_2(doc, "4.3.1 Role-Based Responsive Portals")
    add_body_p(
        doc,
        "The application provides dedicated responsive portal layouts tailored to distinct user personas: the Citizen Portal offers intuitive "
        "step-by-step wizards for document uploading and tracking; the Centre Employee Desk features a real-time request queue with inline PDF previews, "
        "defect tagging chips, and appointment schedulers; and the Administrator Console offers workload analytics, staff assignment matrices, "
        "and audit log inspection tools."
    )

    # 4.4 DATABASE DESIGN
    add_heading_1(doc, "4.4 Database Design")
    add_body_p(
        doc,
        "A robust database architecture is the backbone of an assisted e-governance platform. In the Akshaya system, persistence is realized via "
        "PostgreSQL 16—an enterprise-grade relational database management system offering ACID compliance, foreign key constraints, "
        "transactional isolation, and JSONB capabilities."
    )

    add_heading_2(doc, "4.4.1 Relational Normalization & Referential Integrity")
    add_body_p(
        doc,
        "The database design strictly enforces relational normalization principles up to Boyce-Codd Normal Form (BCNF) to eliminate data redundancy, "
        "prevent modification anomalies, and maintain transactional integrity across complex multi-step workflows:"
    )
    add_bullet_p(doc, "Every table possesses a designated primary key (UUID), and all attributes contain atomic, indivisible values with no repeating multivalued groups.", "First Normal Form (1NF)")
    add_bullet_p(doc, "All non-key attributes are fully functionally dependent on the entire primary key, eliminating partial dependencies across composite-key tables like centre_supported_services.", "Second Normal Form (2NF)")
    add_bullet_p(doc, "Transitive dependencies are eliminated by separating user authentication credentials from citizen and employee profiles; service fee snapshots are immutably stored in service_requests rather than recalculating from mutating service catalogue entries.", "Third Normal Form (3NF)")
    add_bullet_p(doc, "Every determinant in the schema is a candidate key, ensuring no non-trivial functional dependencies exist where the determinant is not a superkey.", "Boyce-Codd Normal Form (BCNF)")

    add_body_p(
        doc,
        "Referential integrity is guaranteed through ON DELETE CASCADE and ON DELETE RESTRICT foreign key constraints, CHECK constraints verifying "
        "valid status enumerations and positive fee amounts, and unique indexes preventing duplicate email registrations and centre code collisions."
    )

    # 4.4.2 TABLE SCHEMAS (AUTHENTIC PROJECT SCHEMAS)
    add_all_database_schemas(doc, cfg=cfg)

    # 4.5 ASSISTED SERVICE WORKFLOW ENGINE & QUEUE ARCHITECTURE
    doc.add_page_break()
    add_heading_1(doc, "4.5 Assisted Service Workflow Engine & Queue Management Architecture")
    add_body_p(
        doc,
        "The core innovation of the Akshaya platform is its Assisted Service Delivery Engine. Unlike standard informational portals that merely link "
        "to external department sites, the platform orchestrates the complete operational workflow between citizens and physical Akshaya Centres:"
    )
    add_bullet_p(doc, "Services are categorized into Type A (predominantly digital), Type B (limited citizen-centre interaction required), and Type C (substantial physical procedure required). The platform dynamically adapts document checklists, interaction scheduling, and processing steps based on this taxonomy.", "Service Classification Engine")
    add_bullet_p(doc, "Each centre employee is governed by an enforced maximum workload constraint (max_active_requests = 10). The intake queue programmatically blocks staff from claiming additional requests when at capacity, preventing bottlenecks and guaranteeing timely service.", "Capacity-Guarded Queueing")
    add_bullet_p(doc, "Every document uploaded undergoes automated pre-validation (MIME type verification, maximum size enforcement, SHA-256 integrity hashing) before entering the staff queue. Reviewers can flag specific documents with actionable feedback, triggering versioned re-upload cycles without losing prior audit history.", "Versioned Document Verification Loop")
    add_bullet_p(doc, "Every state transition, document replacement, staff claim, interaction outcome, and payment confirmation is permanently recorded in the immutable audit log table, ensuring full administrative accountability and legal defensibility.", "Immutable Audit Pipeline")

    print("[CHAPTER 4 OK] Built Chapter 4 Design with Akshaya UML Diagrams & Database Schemas.")
