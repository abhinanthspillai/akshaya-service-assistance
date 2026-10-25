"""
High-Resolution UML 2.5 Diagram Generator for Akshaya MCA Project Report
Renders all 9 standardized UML diagrams in publication-quality Black & White / Grayscale (300 DPI),
following autonomous college academic project reporting and print guidelines.
Accurately reflects the Akshaya Service Assistance Platform architecture, workflows, and database models.
"""

import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, Ellipse, Polygon
import matplotlib.lines as lines

TOOLKIT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT_DIR = os.path.join(TOOLKIT_DIR, "01_Inputs", "diagrams")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def set_diagram_output_dir(path):
    global OUTPUT_DIR
    OUTPUT_DIR = os.path.abspath(path)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

# ----------------------------------------------------------------------
# Common Drawing Utilities (Academic Black & White / Monochrome)
# ----------------------------------------------------------------------
def init_canvas(title, width=14, height=10):
    fig, ax = plt.subplots(figsize=(width, height), dpi=300)
    ax.set_xlim(0, 1000)
    ax.set_ylim(0, 750)
    ax.axis("off")
    # Background
    bg = patches.Rectangle((0, 0), 1000, 750, fc="#FFFFFF", ec="none", zorder=0)
    ax.add_patch(bg)
    # Header Title
    ax.text(500, 730, title, ha="center", va="center", fontsize=13.5, fontweight="bold", color="#000000", fontfamily="sans-serif", zorder=10)
    return fig, ax

def draw_actor(ax, x, y, name, color="#000000"):
    """Draws a standard UML stick-figure actor in crisp monochrome."""
    head = patches.Circle((x, y + 25), 8, fc="#FFFFFF", ec=color, lw=1.8, zorder=5)
    ax.add_patch(head)
    ax.plot([x, x], [y + 17, y - 5], color=color, lw=1.8, zorder=5)
    ax.plot([x - 14, x + 14], [y + 9, y + 9], color=color, lw=1.8, zorder=5)
    ax.plot([x, x - 12], [y - 5, y - 24], color=color, lw=1.8, zorder=5)
    ax.plot([x, x + 12], [y - 5, y - 24], color=color, lw=1.8, zorder=5)
    ax.text(x, y - 36, name, ha="center", va="top", fontsize=8.5, fontweight="bold", color=color, fontfamily="sans-serif", wrap=True, zorder=6)

def draw_use_case(ax, x, y, w, h, text, fc="#FFFFFF", ec="#000000"):
    """Draws a standard UML use case ellipse in monochrome."""
    ellipse = Ellipse((x, y), w, h, fc=fc, ec=ec, lw=1.4, zorder=4)
    ax.add_patch(ellipse)
    ax.text(x, y, text, ha="center", va="center", fontsize=7.5, color="#000000", fontfamily="sans-serif", zorder=6, multialignment="center")

def draw_box(ax, x, y, w, h, title="", subtitle="", fc="#FFFFFF", ec="#000000", lw=1.4, rx=4):
    """Draws a rounded rectangular box in monochrome."""
    box = FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={rx}", fc=fc, ec=ec, lw=lw, zorder=3)
    ax.add_patch(box)
    if title:
        y_text = y + h - 14 if subtitle else y + h / 2
        ax.text(x + w / 2, y_text, title, ha="center", va="center", fontsize=8.5, fontweight="bold", color="#000000", fontfamily="sans-serif", zorder=6)
    if subtitle:
        ax.text(x + w / 2, y + 12, subtitle, ha="center", va="center", fontsize=7.2, color="#333333", fontfamily="sans-serif", zorder=6)

def draw_arrow(ax, x1, y1, x2, y2, label="", color="#000000", style="->", ls="-", lw=1.2, label_offset=(0, 5)):
    """Draws a directional connection or message arrow in monochrome."""
    ax.annotate(
        "",
        xy=(x2, y2),
        xytext=(x1, y1),
        arrowprops=dict(arrowstyle=style, color=color, linestyle=ls, lw=lw, shrinkA=3, shrinkB=3),
        zorder=5
    )
    if label:
        mid_x = (x1 + x2) / 2 + label_offset[0]
        mid_y = (y1 + y2) / 2 + label_offset[1]
        ax.text(mid_x, mid_y, label, ha="center", va="center", fontsize=7.2, color="#000000", fontfamily="sans-serif",
                bbox=dict(boxstyle="square,pad=0.15", fc="#FFFFFF", ec="none", alpha=0.9), zorder=7)

def save_fig(fig, filename):
    filepath = os.path.join(OUTPUT_DIR, filename)
    fig.savefig(filepath, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"--> Saved monochrome diagram: {filepath} ({os.path.getsize(filepath):,} bytes)")

# ----------------------------------------------------------------------
# 4.2.1 USE CASE DIAGRAM (Monochrome)
# ----------------------------------------------------------------------
def generate_diagram_01_use_case():
    """Generates Figure 4.1: Use Case Diagram for Citizen, Centre Employee, and Administrator Ecosystem."""
    fig, ax = init_canvas("Figure 4.1: Use Case Diagram for Citizen, Centre Employee, and Administrator Ecosystem")
    
    # Platform Boundary Box
    boundary = FancyBboxPatch((140, 40), 710, 665, boxstyle="round,pad=0,rounding_size=10", fc="#FAFAFA", ec="#000000", lw=1.8, zorder=1)
    ax.add_patch(boundary)
    ax.text(160, 685, "Akshaya Service Assistance Platform — System Boundary", fontsize=10, fontweight="bold", color="#000000", zorder=6)
    
    # Human Actors
    draw_actor(ax, 65, 380, "Citizen\n(Applicant)", color="#000000")
    draw_actor(ax, 925, 560, "Centre Employee\n(Staff)", color="#000000")
    draw_actor(ax, 925, 380, "Centre Administrator\n(Supervisor)", color="#000000")
    draw_actor(ax, 925, 180, "System Administrator\n(State Level)", color="#000000")
    
    # External System Actors (Bottom Row)
    draw_box(ax, 180, 52, 170, 42, "Razorpay Gateway", "<<external system>>\nPayment Gateway & Webhook", fc="#FFFFFF", ec="#000000", rx=4)
    draw_box(ax, 410, 52, 190, 42, "Govt Portals / e-District", "<<external system>>\nDepartmental API & Portals", fc="#FFFFFF", ec="#000000", rx=4)
    draw_box(ax, 650, 52, 170, 42, "Secure Object Storage", "<<persistence>>\nLocal / Private Cloud Storage", fc="#FFFFFF", ec="#000000", rx=4)
    
    # Left Column Use Cases (Citizen Centric) - x=275, w=215, h=34
    uc_citizen = [
        (275, 640, 215, 34, "Authenticate (Argon2 / JWT)"),
        (275, 580, 215, 34, "Browse Service Catalogue (Type A/B/C)"),
        (275, 520, 215, 34, "Upload Mandatory Documents"),
        (275, 460, 215, 34, "Select / Recommended Centre"),
        (275, 400, 215, 34, "Submit Service Request"),
        (275, 340, 215, 34, "Track Real-Time Status & History"),
        (275, 280, 215, 34, "Correct Flagged Documents"),
        (275, 220, 215, 34, "Schedule In-Person Interaction"),
        (275, 160, 215, 34, "Pay Service Fee via Razorpay"),
        (275, 110, 215, 32, "Download Completed Certificate"),
    ]
    for x, y, w, h, text in uc_citizen:
        draw_use_case(ax, x, y, w, h, text, fc="#FFFFFF", ec="#000000")
    
    # Right Column Use Cases (Staff & Admin Centric) - x=695, w=220, h=34
    uc_staff_admin = [
        (695, 640, 220, 34, "Access Centre Request Queue"),
        (695, 580, 220, 34, "Accept Request (Capacity Checked)"),
        (695, 520, 220, 34, "Review Documents & Flag Defects"),
        (695, 460, 220, 34, "Schedule Physical Interaction"),
        (695, 400, 220, 34, "Process on Government Portal"),
        (695, 340, 220, 34, "Upload Completed Output Document"),
        (695, 280, 220, 34, "Manage Staff & Reassign Workload"),
        (695, 225, 220, 34, "Configure Centre Supported Services"),
        (695, 170, 220, 34, "Handle Escalations & Support Tickets"),
        (695, 115, 220, 34, "Provision Centres & Audit System Logs"),
    ]
    for x, y, w, h, text in uc_staff_admin:
        draw_use_case(ax, x, y, w, h, text, fc="#FFFFFF", ec="#000000")
        
    # Shared Middle Use Case
    draw_use_case(ax, 485, 360, 160, 38, "In-App Messaging &\nRequest Notifications", fc="#FFFFFF", ec="#000000")

    # Connect Citizen to Use Cases
    for _, y, _, _, _ in uc_citizen:
        ax.plot([65, 167], [380, y], color="#000000", lw=1.1, alpha=0.9, zorder=3)
    ax.plot([65, 405], [380, 360], color="#000000", lw=1.1, alpha=0.9, zorder=3)

    # Connect Employee to Use Cases
    for _, y, _, _, _ in uc_staff_admin[:6]:
        ax.plot([925, 805], [560, y], color="#000000", lw=1.1, alpha=0.9, zorder=3)
    ax.plot([925, 565], [560, 360], color="#000000", lw=1.1, alpha=0.9, zorder=3)

    # Connect Centre Admin to Use Cases
    for _, y, _, _, _ in uc_staff_admin[6:9]:
        ax.plot([925, 805], [380, y], color="#000000", lw=1.1, alpha=0.9, zorder=3)

    # Connect System Admin to Use Cases
    ax.plot([925, 805], [180, uc_staff_admin[9][1]], color="#000000", lw=1.1, alpha=0.9, zorder=3)

    # <<include>> relationships
    draw_arrow(ax, 275, 503, 275, 477, "<<include>>", color="#000000", style="->", ls="--", label_offset=(-32, 0))
    draw_arrow(ax, 275, 383, 275, 357, "<<include>>", color="#000000", style="->", ls="--", label_offset=(-32, 0))
    draw_arrow(ax, 275, 263, 275, 237, "<<extend>>", color="#000000", style="->", ls="--", label_offset=(-32, 0))
    draw_arrow(ax, 695, 563, 695, 537, "<<include>>", color="#000000", style="->", ls="--", label_offset=(32, 0))
    draw_arrow(ax, 695, 443, 695, 417, "<<include>>", color="#000000", style="->", ls="--", label_offset=(32, 0))

    # External systems connections
    ax.plot([275, 275, 265, 265], [143, 100, 100, 94], color="#000000", lw=1.1, ls=":", zorder=5)
    ax.annotate("", xy=(265, 94), xytext=(265, 102), arrowprops=dict(arrowstyle="->", color="#000000", linestyle=":", lw=1.1), zorder=6)

    ax.plot([695, 505, 505], [383, 383, 94], color="#000000", lw=1.1, ls=":", zorder=5)
    ax.annotate("", xy=(505, 94), xytext=(505, 102), arrowprops=dict(arrowstyle="->", color="#000000", linestyle=":", lw=1.1), zorder=6)

    ax.plot([695, 735, 735], [323, 323, 94], color="#000000", lw=1.1, ls=":", zorder=5)
    ax.annotate("", xy=(735, 94), xytext=(735, 102), arrowprops=dict(arrowstyle="->", color="#000000", linestyle=":", lw=1.1), zorder=6)

    save_fig(fig, "uml_01_use_case.png")

# ----------------------------------------------------------------------
# 4.2.2 SEQUENCE DIAGRAM (Monochrome)
# ----------------------------------------------------------------------
def generate_diagram_02_sequence():
    """Generates Figure 4.2: Sequence Diagram for Citizen Request Submission, Document Review, Payment & Output Delivery."""
    fig, ax = init_canvas("Figure 4.2: Sequence Diagram for Citizen Request Submission, Document Review, Payment & Output Delivery", width=15, height=10.5)
    
    lifelines = [
        (65, ":Citizen\n(React SPA)"),
        (190, ":AuthController\n(FastAPI / JWT)"),
        (315, ":RequestService\n(Workflow Engine)"),
        (440, ":DocumentEngine\n(Private Storage)"),
        (565, ":PostgreSQL\n(Database / ORM)"),
        (690, ":CentreDesk\n(Employee UI)"),
        (815, ":RazorpayAPI\n(Payment Gateway)"),
        (940, ":CompletedOutput\n(Secure Delivery)"),
    ]
    
    for x, label in lifelines:
        draw_box(ax, x - 50, 665, 100, 38, label, fc="#FFFFFF", ec="#000000", lw=1.4, rx=3)
        ax.plot([x, x], [665, 55], color="#555555", lw=1.2, ls="--", zorder=2)
        draw_box(ax, x - 42, 30, 84, 24, "", fc="#FFFFFF", ec="#000000", lw=1, rx=2)
        ax.text(x, 42, label.split("\n")[0], ha="center", va="center", fontsize=6.5, color="#000000", fontweight="bold", zorder=6)

    def draw_act(x, y_top, y_bot, fc="#FFFFFF", ec="#000000"):
        rect = patches.Rectangle((x - 6, y_bot), 12, y_top - y_bot, fc=fc, ec=ec, lw=1.2, zorder=4)
        ax.add_patch(rect)

    draw_act(65, 645, 595)
    draw_act(190, 640, 580)
    draw_act(315, 625, 490)
    draw_act(440, 615, 570)
    draw_act(565, 605, 95)
    draw_act(690, 560, 240)
    draw_act(815, 230, 160)
    draw_act(940, 150, 80)
    draw_act(65, 510, 80)

    messages = [
        (65, 190, 635, "1: submitRequest(serviceId, docFiles)", True),
        (190, 190, 615, "2: verifyJwtAndRole(citizen)", True, 25),
        (190, 440, 595, "3: validateMimeAndSha256(docFiles)", True),
        (440, 315, 575, "4: filesValidated(storageKeys)", False),
        (315, 565, 555, "5: insertRequest(status=WAITING_FOR_CENTRE)", True),
        (565, 690, 535, "6: streamQueueAlert(centreId)", False),
        (690, 315, 515, "7: claimRequest(employeeId) [Capacity Checked]", True),
        (315, 565, 495, "8: updateAssignment(ACCEPTED, empId)", True),
        (690, 440, 475, "9: inspectDocuments(requestId)", True),
        (440, 690, 455, "10: returnDocumentStream(version=1)", False),
        (690, 565, 435, "11: recordReviewDecision(CORRECTION_REQUIRED)", True),
        (565, 65, 415, "12: notifyCorrectionRequired(reason)", False),
        (65, 440, 395, "13: uploadReplacementDocument(newFile)", True),
        (440, 565, 375, "14: saveDocumentVersion(version=2, is_current=True)", True),
        (690, 565, 355, "15: approveDocumentReview(status=APPROVED)", True),
        (690, 565, 335, "16: scheduleInteraction(INTERACTION_SCHEDULED)", True),
        (565, 65, 315, "17: notifyAppointment(date, instructions)", False),
        (690, 565, 290, "18: completeInteraction() -> READY_FOR_PROCESSING", True),
        (315, 815, 265, "19: createPaymentOrder(feeSnapshot, 'INR')", True),
        (815, 65, 240, "20: returnRazorpayOrderId(orderId)", False),
        (65, 815, 215, "21: executeCheckout(signature, paymentId)", True),
        (815, 315, 190, "22: webhookConfirmPayment(PAYMENT_CONFIRMED)", False),
        (315, 565, 170, "23: setStatus(PROCESSING)", True),
        (690, 940, 145, "24: processGovtApplication() & uploadCertificate()", True),
        (940, 565, 125, "25: registerCompletedOutput(status=COMPLETED)", True),
        (565, 65, 105, "26: notifyCompletion(downloadReady)", False),
        (65, 940, 85, "27: downloadOfficialCertificate()", True),
    ]

    for item in messages:
        if len(item) == 5:
            x1, x2, y, text, is_sync = item
            offset_y = 6
            if x1 == x2:
                arc = patches.Arc((x1 + 15, y), 30, 20, angle=0, theta1=270, theta2=90, color="#000000", lw=1.2)
                ax.add_patch(arc)
                draw_arrow(ax, x1 + 15, y - 10, x1 + 6, y - 10, style="->", color="#000000", lw=1.2)
                ax.text(x1 + 35, y, text, fontsize=7.2, color="#000000", fontfamily="sans-serif", va="center", zorder=7)
                continue
        else:
            x1, x2, y, text, is_sync, loop_w = item
            arc = patches.Arc((x1 + loop_w / 2, y), loop_w, 18, angle=0, theta1=270, theta2=90, color="#000000", lw=1.2)
            ax.add_patch(arc)
            draw_arrow(ax, x1 + loop_w / 2, y - 9, x1 + 6, y - 9, style="->", color="#000000", lw=1.2)
            ax.text(x1 + loop_w + 5, y, text, fontsize=7.2, color="#000000", fontfamily="sans-serif", va="center", zorder=7)
            continue

        ls = "-" if is_sync else "--"
        draw_arrow(ax, x1, y, x2, y, label=text, color="#000000", style="->", ls=ls, lw=1.2, label_offset=(0, offset_y))

    save_fig(fig, "uml_02_sequence.png")

# ----------------------------------------------------------------------
# 4.2.3 STATE CHART DIAGRAM (Monochrome)
# ----------------------------------------------------------------------
def generate_diagram_03_state():
    """Generates Figure 4.3: State Chart Diagram for Akshaya Service Request Lifecycle."""
    fig, ax = init_canvas("Figure 4.3: State Chart Diagram for Akshaya Service Request Lifecycle", width=14, height=10.5)

    def draw_state_box(x, y, w, h, title, sub=""):
        box = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=8", fc="#FFFFFF", ec="#000000", lw=1.4, zorder=3)
        ax.add_patch(box)
        ax.plot([x, x + w], [y + h - 18, y + h - 18], color="#000000", lw=1, zorder=4)
        ax.text(x + w / 2, y + h - 10, title, ha="center", va="center", fontsize=8.2, fontweight="bold", color="#000000", zorder=6)
        if sub:
            ax.text(x + w / 2, y + (h - 18) / 2, sub, ha="center", va="center", fontsize=6.8, color="#000000", multialignment="center", zorder=6)

    # Initial State [●]
    ax.add_patch(patches.Circle((200, 690), 8, fc="#000000", ec="none", zorder=4))
    ax.text(200, 706, "Start", ha="center", va="bottom", fontsize=8, fontweight="bold", color="#000000", zorder=6)
    draw_arrow(ax, 200, 682, 200, 645, "createDraft()", color="#000000", lw=1.2)

    # State: DRAFT
    draw_state_box(110, 595, 180, 50, "DRAFT", "entry / initRequestForm()\ndo / uploadChecklistFiles()")

    # Transition to SUBMITTED
    draw_arrow(ax, 290, 620, 370, 620, "submitRequest() [all required files present]", color="#000000", lw=1.2, label_offset=(0, 6))

    # State: SUBMITTED
    draw_state_box(370, 595, 210, 50, "SUBMITTED", "entry / preValidateFiles()\ndo / snapshotServiceRequirements()")

    # Transition to WAITING_FOR_CENTRE
    draw_arrow(ax, 580, 620, 660, 620, "routeToCentreQueue()", color="#000000", lw=1.2, label_offset=(0, 6))

    # State: WAITING_FOR_CENTRE
    draw_state_box(660, 595, 230, 50, "WAITING_FOR_CENTRE", "entry / addToQueue()\ndo / checkEmployeeWorkload()")

    # Transition to ACCEPTED
    draw_arrow(ax, 775, 595, 775, 525, "employeeClaims [active_reqs < 10]", color="#000000", lw=1.2, label_offset=(0, 6))

    # State: ACCEPTED
    draw_state_box(660, 475, 230, 50, "ACCEPTED", "entry / assignEmployeeId()\ndo / emitAcceptedNotification()")

    # Transition to UNDER_REVIEW
    draw_arrow(ax, 775, 475, 775, 415, "openDocumentReview()", color="#000000", lw=1.2, label_offset=(0, 6))

    # State: UNDER_REVIEW
    draw_state_box(660, 365, 230, 50, "UNDER_REVIEW", "do / staffInspectsDocuments()\ndo / markReviewDecisions()")

    # Branch to CORRECTION_REQUIRED (Left)
    draw_state_box(330, 365, 230, 50, "CORRECTION_REQUIRED", "entry / flagDefectiveDocument()\ndo / awaitCitizenReupload()")
    draw_arrow(ax, 660, 375, 560, 375, "defectDetected [reason logged]", color="#000000", lw=1.2, label_offset=(0, -8))
    draw_arrow(ax, 560, 405, 660, 405, "citizenReuploadsDoc() [version++]", color="#000000", lw=1.2, ls="--", label_offset=(0, 8))

    # Branch to INTERACTION_REQUIRED (Left Lower)
    draw_state_box(330, 255, 230, 50, "INTERACTION_REQUIRED", "entry / requireBiometricOrPhysical()\ndo / promptAppointmentChoice()")
    draw_arrow(ax, 720, 365, 560, 290, "physicalVisitNeeded [Type B/C]", color="#000000", lw=1.2, label_offset=(0, 6))

    # INTERACTION_SCHEDULED
    draw_state_box(330, 150, 230, 50, "INTERACTION_SCHEDULED", "entry / bookSlot(date, time)\ndo / sendCitizenInstructions()")
    draw_arrow(ax, 445, 255, 445, 200, "slotConfirmed()", color="#000000", lw=1.2, label_offset=(-10, 0))

    # Transition to READY_FOR_PROCESSING
    draw_state_box(660, 255, 230, 50, "READY_FOR_PROCESSING", "entry / allChecksPassed()\ndo / requestFeePayment()")
    draw_arrow(ax, 775, 365, 775, 305, "allDocumentsApproved [Type A]", color="#000000", lw=1.2, label_offset=(10, 0))
    draw_arrow(ax, 560, 175, 720, 255, "interactionCompleted()", color="#000000", lw=1.2, label_offset=(0, 6))

    # Transition to PROCESSING
    draw_state_box(660, 150, 230, 50, "PROCESSING", "entry / paymentConfirmed()\ndo / submitToGovtDepartment()")
    draw_arrow(ax, 775, 255, 775, 200, "razorpayPaymentVerified()", color="#000000", lw=1.2, label_offset=(10, 0))

    # Transition to COMPLETED
    draw_state_box(660, 45, 230, 50, "COMPLETED", "entry / uploadSignedOutputDoc()\nexit / sendDownloadNotification()")
    draw_arrow(ax, 775, 150, 775, 95, "certificateIssued()", color="#000000", lw=1.2, label_offset=(10, 0))

    # Final State [◉]
    ax.add_patch(patches.Circle((530, 70), 10, fc="#FFFFFF", ec="#000000", lw=1.5, zorder=4))
    ax.add_patch(patches.Circle((530, 70), 6, fc="#000000", ec="none", zorder=5))
    ax.text(530, 48, "End", ha="center", va="top", fontsize=8, fontweight="bold", color="#000000", zorder=6)
    draw_arrow(ax, 660, 70, 545, 70, "closeRequest()", color="#000000", lw=1.2, label_offset=(0, 6))

    # Cancellation State (Far Left)
    draw_state_box(80, 255, 170, 50, "CANCELLED / REJECTED", "entry / recordAuditLog()\nentry / refundFeeIfEligible()")
    draw_arrow(ax, 330, 380, 165, 305, "citizenCancels() / rejected()", color="#000000", lw=1.1, ls=":", label_offset=(0, 6))
    draw_arrow(ax, 165, 255, 520, 75, "archive()", color="#000000", lw=1.1, ls=":", label_offset=(0, 6))

    save_fig(fig, "uml_03_state.png")

# ----------------------------------------------------------------------
# 4.2.4 ACTIVITY DIAGRAM (Monochrome)
# ----------------------------------------------------------------------
def generate_diagram_04_activity():
    """Generates Figure 4.4: Activity Diagram for Citizen-to-Akshaya Assistance Workflow."""
    fig, ax = init_canvas("Figure 4.4: Activity Diagram for Citizen-to-Akshaya Assistance Workflow", width=14, height=10.5)

    # Swimlanes
    ax.plot([330, 330], [700, 30], color="#000000", lw=1.4, zorder=2)
    ax.plot([670, 670], [700, 30], color="#000000", lw=1.4, zorder=2)
    ax.plot([30, 970], [700, 700], color="#000000", lw=1.4, zorder=2)
    ax.plot([30, 970], [30, 30], color="#000000", lw=1.4, zorder=2)
    ax.plot([30, 30], [700, 30], color="#000000", lw=1.4, zorder=2)
    ax.plot([970, 970], [700, 30], color="#000000", lw=1.4, zorder=2)

    # Headers
    ax.text(180, 715, "Citizen (Web Portal)", ha="center", va="center", fontsize=11, fontweight="bold", zorder=6)
    ax.text(500, 715, "Akshaya Backend (FastAPI & PostgreSQL)", ha="center", va="center", fontsize=11, fontweight="bold", zorder=6)
    ax.text(820, 715, "Centre Staff (Akshaya Desk)", ha="center", va="center", fontsize=11, fontweight="bold", zorder=6)

    def draw_action(x, y, w, h, text):
        box = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=6", fc="#FFFFFF", ec="#000000", lw=1.3, zorder=3)
        ax.add_patch(box)
        ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=7.5, color="#000000", multialignment="center", zorder=6)

    def draw_diamond(x, y, w, h, label):
        poly = Polygon([(x, y + h / 2), (x + w / 2, y + h), (x + w, y + h / 2), (x + w / 2, y)], fc="#FFFFFF", ec="#000000", lw=1.3, zorder=3)
        ax.add_patch(poly)
        ax.text(x + w / 2, y + h / 2, label, ha="center", va="center", fontsize=7, color="#000000", multialignment="center", zorder=6)

    # Start Node
    ax.add_patch(patches.Circle((180, 675), 8, fc="#000000", ec="none", zorder=4))
    draw_arrow(ax, 180, 667, 180, 635, color="#000000")

    # Citizen: Browse & Upload
    draw_action(80, 595, 200, 40, "Select Service & Review\nMandatory Document Checklist")
    draw_arrow(ax, 180, 595, 180, 560)
    draw_action(80, 520, 200, 40, "Upload Required Files (PDF/JPG)\n& Select Target Akshaya Centre")
    draw_arrow(ax, 180, 520, 180, 485)
    draw_action(80, 445, 200, 40, "Submit Service Request\nwith Form Parameters")
    
    # Across to Backend
    draw_arrow(ax, 280, 465, 390, 465, "Submit HTTP POST", label_offset=(0, 6))

    # Backend: Pre-validation & Queueing
    draw_action(390, 445, 220, 40, "Pre-validate MIME Types, File Sizes\n& Generate SHA-256 Checksums")
    draw_arrow(ax, 500, 445, 500, 410)
    draw_action(390, 370, 220, 40, "Store Private Files, Record DB State\n& Allocate to Centre Intake Queue")

    # Across to Staff
    draw_arrow(ax, 610, 390, 710, 390, "Queue Stream", label_offset=(0, 6))

    # Staff: Claim & Review
    draw_action(710, 370, 220, 40, "Inspect Queue & Claim Request\n(Verify Workload Capacity <= 10)")
    draw_arrow(ax, 820, 370, 820, 335)
    draw_action(710, 295, 220, 40, "Review Document Checklist Items\nagainst Administrative Criteria")
    draw_arrow(ax, 820, 295, 820, 265)

    # Diamond: Documents Valid?
    draw_diamond(760, 215, 120, 45, "Documents\nValid?")

    # Defect Loop
    draw_arrow(ax, 760, 237, 280, 237, "[No] Flag Defective Document & Reason", label_offset=(0, 6))
    draw_action(80, 215, 200, 42, "Receive Defect Alert &\nUpload Replacement Document")
    draw_arrow(ax, 180, 257, 180, 295, "Re-submit", label_offset=(-15, 0))
    ax.plot([180, 180, 710], [295, 315, 315], color="#000000", lw=1.1, ls="--", zorder=3)

    # Valid -> Diamond: Physical Interaction Required?
    draw_arrow(ax, 820, 215, 820, 185, "[Yes]", label_offset=(15, 0))
    draw_diamond(760, 140, 120, 45, "Interaction\nRequired?")

    # Interaction Path (Type B/C)
    draw_arrow(ax, 760, 162, 610, 162, "[Yes] Schedule Slot", label_offset=(0, 6))
    draw_action(390, 142, 220, 40, "Notify Appointment Time Slot\n& Physical Instructions")
    draw_arrow(ax, 390, 162, 280, 162)
    draw_action(80, 142, 200, 40, "Visit Akshaya Centre for\nBiometric / Paper Attestation")
    draw_arrow(ax, 180, 142, 180, 105)
    ax.plot([180, 820], [105, 105], color="#000000", lw=1.1, ls="--", zorder=3)

    # Payment & Processing
    draw_arrow(ax, 820, 140, 820, 95, "[No / Completed]", label_offset=(25, 0))
    draw_action(710, 55, 220, 40, "Process Government Application\n& Upload Signed Certificate")

    # Payment check before processing
    draw_arrow(ax, 710, 75, 610, 75, "Verify Fee", label_offset=(0, 6))
    draw_action(390, 55, 220, 40, "Verify Razorpay Payment Gateway\nSignature & Transition COMPLETED")
    draw_arrow(ax, 390, 75, 280, 75, "Delivery Ready", label_offset=(0, 6))

    # Citizen Download & End
    draw_action(80, 55, 200, 40, "Download Official Verified Certificate\n& View Immutable Audit Trail")
    
    # End Node
    ax.add_patch(patches.Circle((45, 75), 10, fc="#FFFFFF", ec="#000000", lw=1.5, zorder=4))
    ax.add_patch(patches.Circle((45, 75), 6, fc="#000000", ec="none", zorder=5))
    draw_arrow(ax, 80, 75, 57, 75)

    save_fig(fig, "uml_04_activity.png")

# ----------------------------------------------------------------------
# 4.2.5 CLASS DIAGRAM (Monochrome)
# ----------------------------------------------------------------------
def generate_diagram_05_class():
    """Generates Figure 4.5: Class Diagram for Akshaya Service Assistance Architecture."""
    fig, ax = init_canvas("Figure 4.5: Class Diagram for Akshaya Service Assistance Architecture", width=15, height=11)

    def draw_uml_class(x, y, w, h, class_name, attributes, methods):
        box = FancyBboxPatch((x, y), w, h, boxstyle="square,pad=0", fc="#FFFFFF", ec="#000000", lw=1.4, zorder=3)
        ax.add_patch(box)
        # Class Header
        ax.text(x + w / 2, y + h - 12, class_name, ha="center", va="center", fontsize=8.5, fontweight="bold", color="#000000", zorder=6)
        ax.plot([x, x + w], [y + h - 22, y + h - 22], color="#000000", lw=1, zorder=4)
        
        # Attributes
        y_attr = y + h - 34
        for attr in attributes:
            ax.text(x + 6, y_attr, attr, ha="left", va="center", fontsize=6.8, color="#000000", fontfamily="monospace", zorder=6)
            y_attr -= 12
            
        # Divider
        ax.plot([x, x + w], [y_attr + 4, y_attr + 4], color="#000000", lw=1, zorder=4)
        y_meth = y_attr - 8
        for meth in methods:
            ax.text(x + 6, y_meth, meth, ha="left", va="center", fontsize=6.8, color="#000000", fontfamily="monospace", zorder=6)
            y_meth -= 12

    # Row 1: Users, Profiles, Centres
    draw_uml_class(40, 520, 200, 180, "User", [
        "+ id: UUID [PK]",
        "+ email: String [Unique]",
        "+ password_hash: String",
        "+ role: RoleEnum",
        "+ is_active: Boolean",
        "+ created_at: DateTime"
    ], [
        "+ verify_password(raw): Bool",
        "+ generate_jwt_token(): Str",
        "+ deactivate_account(): Void"
    ])

    draw_uml_class(280, 520, 200, 180, "CitizenProfile", [
        "+ user_id: UUID [PK, FK]",
        "+ full_name: String",
        "+ phone: String",
        "+ address_text: String",
        "+ created_at: DateTime",
        "+ updated_at: DateTime"
    ], [
        "+ update_profile(data): Void",
        "+ get_request_history(): List"
    ])

    draw_uml_class(520, 520, 210, 180, "AkshayaCentre", [
        "+ id: UUID [PK]",
        "+ code: String [Unique]",
        "+ name: String",
        "+ district: String",
        "+ locality: String",
        "+ is_active: Boolean"
    ], [
        "+ get_active_workload(): Int",
        "+ get_supported_services(): List",
        "+ verify_staff_capacity(): Bool"
    ])

    draw_uml_class(760, 520, 200, 180, "EmployeeProfile", [
        "+ user_id: UUID [PK, FK]",
        "+ centre_id: UUID [FK]",
        "+ full_name: String",
        "+ max_active_requests: Int",
        "+ is_available: Boolean"
    ], [
        "+ can_accept_request(): Bool",
        "+ increment_workload(): Void",
        "+ decrement_workload(): Void"
    ])

    # Row 2: Services, Requirements, Requests
    draw_uml_class(40, 280, 200, 190, "Service", [
        "+ id: UUID [PK]",
        "+ code: String [Unique]",
        "+ name: String",
        "+ service_type: TypeEnum",
        "+ base_fee: Decimal",
        "+ retention_days: Int",
        "+ is_active: Boolean"
    ], [
        "+ get_document_checklist(): List",
        "+ get_interaction_rules(): List",
        "+ calculate_total_fee(): Decimal"
    ])

    draw_uml_class(280, 280, 200, 190, "ServiceDocumentRequirement", [
        "+ id: UUID [PK]",
        "+ service_id: UUID [FK]",
        "+ name: String",
        "+ is_required: Boolean",
        "+ is_reusable: Boolean",
        "+ max_file_size_bytes: Long",
        "+ sort_order: Int"
    ], [
        "+ validate_file(meta): Bool",
        "+ check_mime_allowed(mime): Bool"
    ])

    draw_uml_class(520, 270, 210, 200, "ServiceRequest", [
        "+ id: UUID [PK]",
        "+ citizen_id: UUID [FK]",
        "+ service_id: UUID [FK]",
        "+ selected_centre_id: UUID [FK]",
        "+ status: RequestStateEnum",
        "+ service_type_snapshot: Char",
        "+ fee_snapshot: Decimal",
        "+ submitted_at: DateTime"
    ], [
        "+ transition_to(next_state): Void",
        "+ assign_employee(emp_id): Void",
        "+ mark_completed(): Void"
    ])

    draw_uml_class(760, 280, 200, 190, "RequestDocument", [
        "+ id: UUID [PK]",
        "+ request_id: UUID [FK]",
        "+ requirement_id: UUID [FK]",
        "+ uploaded_by_id: UUID [FK]",
        "+ storage_key: String [Unique]",
        "+ sha256: String",
        "+ version: Int",
        "+ is_current: Boolean"
    ], [
        "+ create_new_version(file): Self",
        "+ mark_replaced(): Void"
    ])

    # Row 3: Reviews, Payments, Completed Outputs, Audits
    draw_uml_class(40, 50, 200, 180, "RequestDocumentReview", [
        "+ id: UUID [PK]",
        "+ request_id: UUID [FK]",
        "+ document_id: UUID [FK]",
        "+ reviewer_id: UUID [FK]",
        "+ decision: DecisionEnum",
        "+ reason: String",
        "+ created_at: DateTime"
    ], [
        "+ is_approved(): Bool",
        "+ get_rejection_reason(): Str"
    ])

    draw_uml_class(280, 50, 200, 180, "RequestInteraction", [
        "+ id: UUID [PK]",
        "+ request_id: UUID [FK]",
        "+ requirement_id: UUID [FK]",
        "+ status: InteractionEnum",
        "+ reason: String",
        "+ scheduled_at: DateTime"
    ], [
        "+ mark_scheduled(slot): Void",
        "+ mark_completed(notes): Void"
    ])

    draw_uml_class(520, 50, 210, 180, "RequestPayment", [
        "+ id: UUID [PK]",
        "+ request_id: UUID [FK]",
        "+ amount: Decimal",
        "+ currency: String",
        "+ status: PaymentStateEnum",
        "+ provider: String",
        "+ provider_reference: String"
    ], [
        "+ verify_razorpay_sig(sig): Bool",
        "+ mark_confirmed(): Void"
    ])

    draw_uml_class(760, 50, 200, 180, "CompletedOutput", [
        "+ id: UUID [PK]",
        "+ request_id: UUID [FK]",
        "+ storage_key: String",
        "+ original_filename: String",
        "+ delivery_mode: DeliveryEnum",
        "+ uploaded_at: DateTime"
    ], [
        "+ generate_download_url(): Str",
        "+ verify_owner_access(uid): Bool"
    ])

    # Associations & Connectors
    ax.plot([240, 280], [610, 610], color="#000000", lw=1.2, zorder=3)
    ax.text(243, 615, "1", fontsize=7.5, fontweight="bold", zorder=6)
    ax.text(270, 615, "1", fontsize=7.5, fontweight="bold", zorder=6)

    ax.plot([730, 760], [610, 610], color="#000000", lw=1.2, zorder=3)
    ax.text(733, 615, "1", fontsize=7.5, fontweight="bold", zorder=6)
    ax.text(750, 615, "1..*", fontsize=7.5, fontweight="bold", zorder=6)

    ax.plot([240, 280], [375, 375], color="#000000", lw=1.2, zorder=3)
    ax.text(243, 380, "1", fontsize=7.5, fontweight="bold", zorder=6)
    ax.text(270, 380, "1..*", fontsize=7.5, fontweight="bold", zorder=6)

    ax.plot([480, 520], [375, 375], color="#000000", lw=1.2, zorder=3)
    ax.text(485, 380, "1", fontsize=7.5, fontweight="bold", zorder=6)
    ax.text(510, 380, "1..*", fontsize=7.5, fontweight="bold", zorder=6)

    ax.plot([730, 760], [375, 375], color="#000000", lw=1.2, zorder=3)
    ax.text(733, 380, "1", fontsize=7.5, fontweight="bold", zorder=6)
    ax.text(750, 380, "1..*", fontsize=7.5, fontweight="bold", zorder=6)

    # ServiceRequest -> RequestPayment
    ax.plot([625, 625], [270, 230], color="#000000", lw=1.2, zorder=3)
    ax.text(630, 260, "1", fontsize=7.5, fontweight="bold", zorder=6)
    ax.text(630, 235, "0..1", fontsize=7.5, fontweight="bold", zorder=6)

    # ServiceRequest -> CompletedOutput
    ax.plot([700, 700, 860, 860], [270, 245, 245, 230], color="#000000", lw=1.2, zorder=3)
    ax.text(865, 235, "0..1", fontsize=7.5, fontweight="bold", zorder=6)

    # ServiceRequest -> RequestInteraction
    ax.plot([550, 550, 380, 380], [270, 245, 245, 230], color="#000000", lw=1.2, zorder=3)
    ax.text(385, 235, "0..*", fontsize=7.5, fontweight="bold", zorder=6)

    # ServiceRequest -> RequestDocumentReview
    ax.plot([530, 530, 140, 140], [270, 258, 258, 230], color="#000000", lw=1.2, zorder=3)
    ax.text(145, 235, "0..*", fontsize=7.5, fontweight="bold", zorder=6)

    save_fig(fig, "uml_05_class.png")

# ----------------------------------------------------------------------
# 4.2.6 OBJECT DIAGRAM (Monochrome)
# ----------------------------------------------------------------------
def generate_diagram_06_object():
    """Generates Figure 4.6: Object Diagram for Active Service Request Instance."""
    fig, ax = init_canvas("Figure 4.6: Object Diagram for Active Service Request Instance", width=14, height=10.5)

    def draw_uml_object(x, y, w, h, obj_name, slots):
        box = FancyBboxPatch((x, y), w, h, boxstyle="square,pad=0", fc="#FFFFFF", ec="#000000", lw=1.4, zorder=3)
        ax.add_patch(box)
        ax.text(x + w / 2, y + h - 12, obj_name, ha="center", va="center", fontsize=8.2, fontweight="bold", color="#000000", zorder=6)
        ax.plot([x + 10, x + w - 10], [y + h - 17, y + h - 17], color="#000000", lw=1, zorder=4)
        ax.plot([x, x + w], [y + h - 22, y + h - 22], color="#000000", lw=1, zorder=4)
        y_slot = y + h - 34
        for slot in slots:
            ax.text(x + 6, y_slot, slot, ha="left", va="center", fontsize=7, color="#000000", fontfamily="monospace", zorder=6)
            y_slot -= 13

    # Row 1: Concrete User, Profile, Centre, Staff
    draw_uml_object(40, 520, 205, 175, "citUser_101 : User", [
        "id = 'usr_c101'",
        "email = 'abhinanth@gmail.com'",
        "role = CITIZEN",
        "is_active = True",
        "created_at = '2026-10-01T09:00Z'"
    ])

    draw_uml_object(275, 520, 215, 175, "citProfile_101 : CitizenProfile", [
        "user_id = 'usr_c101'",
        "full_name = 'Abhinanth S Pillai'",
        "phone = '+91 9447012345'",
        "address = 'Koorali, Kottayam'"
    ])

    draw_uml_object(520, 520, 215, 175, "centre_KJP : AkshayaCentre", [
        "id = 'ctr_42'",
        "code = 'AK-KTY-042'",
        "name = 'Kanjirappally Town Centre'",
        "district = 'Kottayam'",
        "locality = 'Kanjirappally'"
    ])

    draw_uml_object(760, 520, 200, 175, "emp_205 : EmployeeProfile", [
        "user_id = 'usr_e205'",
        "centre_id = 'ctr_42'",
        "full_name = 'Kavitha Nair'",
        "max_active = 10",
        "is_available = True"
    ])

    # Row 2: Service, Request, Uploaded Documents
    draw_uml_object(40, 270, 205, 195, "srv_caste : Service", [
        "id = 'srv_c01'",
        "code = 'REV-CERT-01'",
        "name = 'Caste Certificate'",
        "service_type = 'B'",
        "base_fee = 65.00",
        "retention_days = 90"
    ])

    draw_uml_object(275, 270, 215, 195, "req_892 : ServiceRequest", [
        "id = 'req_892'",
        "citizen_id = 'usr_c101'",
        "service_id = 'srv_c01'",
        "selected_centre = 'ctr_42'",
        "status = PROCESSING",
        "fee_snapshot = 65.00",
        "submitted_at = '2026-10-23T10:15Z'"
    ])

    draw_uml_object(520, 270, 215, 195, "doc_aadhaar : RequestDocument", [
        "id = 'doc_901'",
        "request_id = 'req_892'",
        "filename = 'aadhaar_card.pdf'",
        "sha256 = '3a7f8e...91c'",
        "version = 1",
        "is_current = True"
    ])

    draw_uml_object(760, 270, 200, 195, "doc_ration : RequestDocument", [
        "id = 'doc_902'",
        "request_id = 'req_892'",
        "filename = 'ration_card_v2.pdf'",
        "sha256 = '7b2e1a...44d'",
        "version = 2",
        "is_current = True"
    ])

    # Row 3: Reviews, Payments, Output
    draw_uml_object(40, 50, 205, 170, "rev_ration : DocumentReview", [
        "id = 'rev_11'",
        "document_id = 'doc_902'",
        "reviewer_id = 'usr_e205'",
        "decision = APPROVED",
        "reason = 'Address verified'"
    ])

    draw_uml_object(275, 50, 215, 170, "pay_order : RequestPayment", [
        "id = 'pay_505'",
        "request_id = 'req_892'",
        "amount = 65.00",
        "currency = 'INR'",
        "status = CONFIRMED",
        "provider = 'RAZORPAY'",
        "ref = 'pay_NzaKj2819'"
    ])

    draw_uml_object(520, 50, 215, 170, "out_cert : CompletedOutput", [
        "id = 'out_33'",
        "request_id = 'req_892'",
        "storage_key = 'out_892_signed.pdf'",
        "filename = 'Caste_Certificate.pdf'",
        "delivery_mode = 'DOWNLOAD'"
    ])

    draw_uml_object(760, 50, 200, 170, "audit_892 : AuditLog", [
        "id = 'aud_771'",
        "user_id = 'usr_e205'",
        "action = 'PAYMENT_CONFIRMED'",
        "entity_type = 'service_requests'",
        "entity_id = 'req_892'"
    ])

    # Connect Object Links
    ax.plot([245, 275], [605, 605], color="#000000", lw=1.2, zorder=3)
    ax.plot([735, 760], [605, 605], color="#000000", lw=1.2, zorder=3)
    ax.plot([245, 275], [365, 365], color="#000000", lw=1.2, zorder=3)
    ax.plot([490, 520], [365, 365], color="#000000", lw=1.2, zorder=3)
    ax.plot([735, 760], [365, 365], color="#000000", lw=1.2, zorder=3)
    # req_892 -> pay_order (Straight down)
    ax.plot([382, 382], [270, 220], color="#000000", lw=1.2, zorder=3)

    # req_892 -> out_cert (Clean orthogonal corridor routing via y=245 avoiding any box intersections)
    ax.plot([450, 450, 627, 627], [270, 245, 245, 220], color="#000000", lw=1.2, zorder=3)

    # req_892 -> rev_ration (Clean orthogonal corridor routing via y=245 avoiding any box intersections)
    ax.plot([315, 315, 142, 142], [270, 245, 245, 220], color="#000000", lw=1.2, zorder=3)

    # out_cert -> audit_892 (Horizontal link)
    ax.plot([735, 760], [135, 135], color="#000000", lw=1.2, zorder=3)

    save_fig(fig, "uml_06_object.png")

# ----------------------------------------------------------------------
# 4.2.7 COMPONENT DIAGRAM (Monochrome)
# ----------------------------------------------------------------------
def generate_diagram_07_component():
    """Generates Figure 4.7: Component Diagram for Modular Web & Backend Subsystems."""
    fig, ax = init_canvas("Figure 4.7: Component Diagram for Modular Web & Backend Subsystems", width=14, height=10.5)

    def draw_uml_component(x, y, w, h, name, stereotype="<<component>>"):
        box = FancyBboxPatch((x, y), w, h, boxstyle="square,pad=0", fc="#FFFFFF", ec="#000000", lw=1.4, zorder=3)
        ax.add_patch(box)
        # Component icon tabs
        tab1 = FancyBboxPatch((x - 8, y + h - 18), 16, 8, boxstyle="square,pad=0", fc="#FFFFFF", ec="#000000", lw=1, zorder=4)
        tab2 = FancyBboxPatch((x - 8, y + h - 34), 16, 8, boxstyle="square,pad=0", fc="#FFFFFF", ec="#000000", lw=1, zorder=4)
        ax.add_patch(tab1)
        ax.add_patch(tab2)
        ax.text(x + w / 2, y + h / 2 + 6, stereotype, ha="center", va="center", fontsize=7, color="#555555", zorder=6)
        ax.text(x + w / 2, y + h / 2 - 8, name, ha="center", va="center", fontsize=8.2, fontweight="bold", color="#000000", multialignment="center", zorder=6)

    # Outer Boundaries / Packages
    # 1. Frontend Client Package
    p1 = FancyBboxPatch((40, 480), 920, 220, boxstyle="round,pad=0,rounding_size=6", fc="#FAFAFA", ec="#000000", lw=1.4, zorder=1)
    ax.add_patch(p1)
    ax.text(60, 685, "Presentation Tier — React 18 Single Page Application (TypeScript / Vite)", fontsize=9.5, fontweight="bold", zorder=6)

    draw_uml_component(70, 520, 180, 120, "CitizenPortal\nComponent")
    draw_uml_component(290, 520, 180, 120, "CentreEmployee\nDeskComponent")
    draw_uml_component(510, 520, 180, 120, "Administrator\nConsoleComponent")
    draw_uml_component(730, 520, 190, 120, "ApiClient &\nAxiosAuthInterceptor")

    # 2. Backend Application Package
    p2 = FancyBboxPatch((40, 240), 920, 200, boxstyle="round,pad=0,rounding_size=6", fc="#FAFAFA", ec="#000000", lw=1.4, zorder=1)
    ax.add_patch(p2)
    ax.text(60, 425, "Application Tier — FastAPI REST Framework (Python 3.12 / Pydantic v2)", fontsize=9.5, fontweight="bold", zorder=6)

    draw_uml_component(70, 270, 180, 120, "AuthSecurity\nMiddleware (Argon2)")
    draw_uml_component(290, 270, 180, 120, "ServiceRequest\nWorkflowEngine")
    draw_uml_component(510, 270, 180, 120, "DocumentValidation\n& StorageEngine")
    draw_uml_component(730, 270, 190, 120, "PaymentGateway\nIntegrationBridge")

    # 3. Persistence Tier & External Gateways
    p3 = FancyBboxPatch((40, 40), 920, 160, boxstyle="round,pad=0,rounding_size=6", fc="#FAFAFA", ec="#000000", lw=1.4, zorder=1)
    ax.add_patch(p3)
    ax.text(60, 185, "Persistence & External Gateway Tier", fontsize=9.5, fontweight="bold", zorder=6)

    draw_uml_component(70, 60, 200, 100, "PostgreSQL 16\nRelational Database")
    draw_uml_component(310, 60, 180, 100, "SQLAlchemy 2.x ORM\n& Alembic Migrations")
    draw_uml_component(530, 60, 180, 100, "Secure Local/Cloud\nPrivate File Store")
    draw_uml_component(750, 60, 180, 100, "Razorpay API\n& Govt Webhooks")

    # Connectors between tiers
    draw_arrow(ax, 250, 580, 290, 580, color="#000000")
    draw_arrow(ax, 470, 580, 510, 580, color="#000000")
    draw_arrow(ax, 690, 580, 730, 580, color="#000000")
    
    # Inter-tier calls: Presentation to Application
    draw_arrow(ax, 825, 520, 825, 390, "REST / JSON (HTTPS)", color="#000000", label_offset=(15, 0))
    
    # Application tier internal orchestration
    draw_arrow(ax, 250, 330, 290, 330, color="#000000")
    draw_arrow(ax, 470, 330, 510, 330, color="#000000")
    draw_arrow(ax, 690, 330, 730, 330, color="#000000")

    # Application to Persistence Tier (Direct vertical connectors)
    draw_arrow(ax, 380, 270, 380, 160, "ORM Sessions", color="#000000", label_offset=(15, 0))
    draw_arrow(ax, 310, 110, 270, 110, "TCP / Port 5432", color="#000000", label_offset=(0, 7))
    draw_arrow(ax, 600, 270, 600, 160, "File IO / Hash Check", color="#000000", label_offset=(15, 0))
    draw_arrow(ax, 825, 270, 825, 160, "TLS 1.3 Webhooks", color="#000000", label_offset=(15, 0))

    save_fig(fig, "uml_07_component.png")

# ----------------------------------------------------------------------
# 4.2.8 DEPLOYMENT DIAGRAM (Monochrome — High Readability)
# ----------------------------------------------------------------------
def generate_diagram_08_deployment():
    """Generates Figure 4.8: Deployment Diagram for Physical Web & Database Topology."""
    fig, ax = init_canvas("Figure 4.8: Deployment Diagram for Physical Web & Database Topology", width=14, height=10.5)

    def draw_3d_node(x, y, w, h, title, subtitle="", depth=14):
        # Base rectangle
        box = patches.Rectangle((x, y), w, h, fc="#FFFFFF", ec="#000000", lw=1.4, zorder=3)
        ax.add_patch(box)
        # 3D Top
        top = Polygon([(x, y + h), (x + depth, y + h + depth), (x + w + depth, y + h + depth), (x + w, y + h)],
                      fc="#F2F2F2", ec="#000000", lw=1.4, zorder=3)
        # 3D Side
        side = Polygon([(x + w, y), (x + w + depth, y + depth), (x + w + depth, y + h + depth), (x + w, y + h)],
                       fc="#E2E2E2", ec="#000000", lw=1.4, zorder=3)
        ax.add_patch(top)
        ax.add_patch(side)

        # Node Header (Stereotype + Name)
        ax.text(x + w / 2, y + h - 12, "<<device>>", ha="center", va="center", fontsize=7.2, color="#444444", zorder=6)
        ax.text(x + w / 2, y + h - 25, title, ha="center", va="center", fontsize=8.2, fontweight="bold", color="#000000", zorder=6)
        if subtitle:
            ax.text(x + w / 2, y + h - 37, subtitle, ha="center", va="center", fontsize=7.0, color="#333333", zorder=6)
            divider_y = y + h - 46
        else:
            divider_y = y + h - 35
        # Header divider line
        ax.plot([x, x + w], [divider_y, divider_y], color="#000000", lw=1.1, zorder=4)

    def draw_artifact(x, y, w, h, name):
        box = FancyBboxPatch((x, y), w, h, boxstyle="square,pad=0", fc="#FFFFFF", ec="#000000", lw=1.1, zorder=4)
        ax.add_patch(box)
        # UML Artifact Tab symbol in upper-right corner
        tab = FancyBboxPatch((x + w - 18, y + h - 7), 14, 5, boxstyle="square,pad=0", fc="#FFFFFF", ec="#000000", lw=0.8, zorder=5)
        ax.add_patch(tab)
        # Artifact text centered with guaranteed zorder=6
        lines_list = name.split("\n")
        if len(lines_list) == 1:
            ax.text(x + w / 2, y + h / 2 + 6, "<<artifact>>", ha="center", va="center", fontsize=6.5, color="#555555", zorder=6)
            ax.text(x + w / 2, y + h / 2 - 5, lines_list[0], ha="center", va="center", fontsize=7.2, fontweight="bold", color="#000000", zorder=6)
        else:
            ax.text(x + w / 2, y + h - 11, "<<artifact>>", ha="center", va="center", fontsize=6.2, color="#555555", zorder=6)
            y_curr = y + h - 24
            for idx, line_text in enumerate(lines_list):
                fw = "bold" if idx == 0 else "normal"
                fs = 7.2 if idx == 0 else 6.7
                ax.text(x + w / 2, y_curr, line_text, ha="center", va="center", fontsize=fs, fontweight=fw, color="#000000", zorder=6)
                y_curr -= 11

    # =========================================================================
    # LEFT COLUMN NODES (Clients)
    # =========================================================================
    # Node 1: Citizen Workstation / Mobile
    draw_3d_node(40, 415, 275, 255, "Citizen Workstation / Mobile", "(Client Browser Execution)")
    draw_artifact(55, 530, 245, 62, "React 18 Single Page App (SPA)\n(HTML5 / CSS3 / TypeScript Bundle)")
    draw_artifact(55, 435, 245, 62, "Web Browser Engine\n(Google Chrome / Safari / Firefox)")

    # Node 2: Akshaya Centre Staff Terminal
    draw_3d_node(40, 75, 275, 255, "Centre Staff Terminal", "(Akshaya Kiosk PC)")
    draw_artifact(55, 190, 245, 62, "Akshaya Desk Staff Portal\n(Queue Management & Ingestion UI)")
    draw_artifact(55, 95, 245, 62, "Inline Document Previewer\n& Biometric Attestation Client")

    # =========================================================================
    # MIDDLE COLUMN NODE (Application Server)
    # =========================================================================
    # Node 3: Cloud / Linux Application Server Node
    draw_3d_node(365, 75, 295, 595, "Web & Application Server Node", "(Ubuntu Linux 24.04 LTS)")
    draw_artifact(380, 545, 265, 60, "Nginx Reverse Proxy & Gateway\n(TLS 1.3 Termination & Static Caching)")
    draw_artifact(380, 440, 265, 65, "Uvicorn ASGI Server Runtime\n(Python 3.12 Asynchronous Workers)")
    draw_artifact(380, 335, 265, 65, "FastAPI REST Application Framework\n(Pydantic v2 & Security Middleware)")
    draw_artifact(380, 230, 265, 65, "SQLAlchemy 2.x ORM Engine\n& Alembic Database Migrations")
    draw_artifact(380, 115, 265, 65, "Private Encrypted File Store\n(Secure FILE_STORAGE_PATH Mount)")

    # =========================================================================
    # RIGHT COLUMN NODES (Database & External SaaS)
    # =========================================================================
    # Node 4: Database Server Node
    draw_3d_node(710, 415, 260, 255, "Database Server Node", "(Enterprise Linux Dedicated VM)")
    draw_artifact(725, 530, 230, 65, "PostgreSQL 16 Relational Engine\n(ACID Compliant Transactional Store)")
    draw_artifact(725, 435, 230, 65, "psycopg 3 Connection Pool\n(16 Normalized Relational Schemas)")

    # Node 5: External SaaS Cloud
    draw_3d_node(710, 75, 260, 255, "External Cloud Services Node", "(Third-Party Managed SaaS)")
    draw_artifact(725, 190, 230, 62, "Razorpay Payment API Cloud\n(Online Fee Escrow & Webhooks)")
    draw_artifact(725, 95, 230, 62, "Govt e-District / State Portals\n(External Departmental Ingestion API)")

    # =========================================================================
    # COMMUNICATION PATHWAYS (Links with Protocol Labels)
    # =========================================================================
    # Citizen -> App Server
    ax.plot([315, 365], [540, 540], color="#000000", lw=1.4, zorder=3)
    ax.text(340, 552, "HTTPS (443)\nTLS 1.3", ha="center", va="bottom", fontsize=7.0, fontweight="bold", zorder=6,
            bbox=dict(boxstyle="square,pad=0.15", fc="#FFFFFF", ec="none", alpha=0.9))

    # Staff Terminal -> App Server
    ax.plot([315, 365], [200, 200], color="#000000", lw=1.4, zorder=3)
    ax.text(340, 212, "HTTPS (443)\nTLS 1.3", ha="center", va="bottom", fontsize=7.0, fontweight="bold", zorder=6,
            bbox=dict(boxstyle="square,pad=0.15", fc="#FFFFFF", ec="none", alpha=0.9))

    # App Server -> Database Server
    ax.plot([660, 710], [540, 540], color="#000000", lw=1.4, zorder=3)
    ax.text(685, 552, "TCP/IP (5432)\nSQL Pool", ha="center", va="bottom", fontsize=7.0, fontweight="bold", zorder=6,
            bbox=dict(boxstyle="square,pad=0.15", fc="#FFFFFF", ec="none", alpha=0.9))

    # App Server -> External SaaS Cloud
    ax.plot([660, 710], [200, 200], color="#000000", lw=1.4, zorder=3)
    ax.text(685, 212, "REST APIs\nWebhooks", ha="center", va="bottom", fontsize=7.0, fontweight="bold", zorder=6,
            bbox=dict(boxstyle="square,pad=0.15", fc="#FFFFFF", ec="none", alpha=0.9))

    save_fig(fig, "uml_08_deployment.png")

# ----------------------------------------------------------------------
# 4.2.9 COLLABORATION DIAGRAM (Monochrome)
# ----------------------------------------------------------------------
def generate_diagram_09_collaboration():
    """Generates Figure 4.9: Collaboration Diagram for Service Request Processing & Verification."""
    fig, ax = init_canvas("Figure 4.9: Collaboration Diagram for Service Request Processing & Verification", width=14, height=10.5)

    def draw_collab_obj(x, y, w, h, name):
        box = FancyBboxPatch((x, y), w, h, boxstyle="square,pad=0", fc="#FFFFFF", ec="#000000", lw=1.4, zorder=3)
        ax.add_patch(box)
        ax.text(x + w / 2, y + h / 2, name, ha="center", va="center", fontsize=8.2, fontweight="bold", color="#000000", multialignment="center", zorder=6)

    # Center Hub Object
    draw_collab_obj(400, 330, 200, 70, ":WorkflowEngine\n(RequestService)")

    # Surrounding Collaborating Objects
    draw_collab_obj(80, 540, 180, 60, ":CitizenPortal\n(React UI)")
    draw_collab_obj(400, 570, 200, 60, ":SecurityFilter\n(JWT Guard)")
    draw_collab_obj(740, 540, 180, 60, ":CentreDesk\n(Employee Portal)")
    draw_collab_obj(80, 330, 180, 60, ":DocumentValidator\n(MIME & Hash)")
    draw_collab_obj(740, 330, 180, 60, ":PaymentBridge\n(Razorpay API)")
    draw_collab_obj(80, 120, 180, 60, ":PostgresDB\n(SQLAlchemy)")
    draw_collab_obj(400, 90, 200, 60, ":StorageManager\n(Private Store)")
    draw_collab_obj(740, 120, 180, 60, ":AuditLogger\n(History Tracker)")

    # Links and numbered message interactions
    ax.plot([260, 400], [570, 590], color="#000000", lw=1.2, zorder=3)
    ax.text(320, 595, "1: submit(req, token) ->", fontsize=7.2, fontweight="bold", zorder=6,
            bbox=dict(boxstyle="square,pad=0.2", fc="#FFFFFF", ec="none", alpha=0.95))

    ax.plot([500, 500], [570, 400], color="#000000", lw=1.2, zorder=3)
    ax.text(505, 485, "2: authorize(uid, role) ->\n11: notify(COMPLETED) ->", fontsize=7.2, fontweight="bold", zorder=6,
            bbox=dict(boxstyle="square,pad=0.2", fc="#FFFFFF", ec="none", alpha=0.95))

    ax.plot([400, 260], [365, 365], color="#000000", lw=1.2, zorder=3)
    ax.text(330, 375, "3: validate(files) ->", fontsize=7.2, fontweight="bold", ha="center", zorder=6,
            bbox=dict(boxstyle="square,pad=0.2", fc="#FFFFFF", ec="none", alpha=0.95))

    ax.plot([400, 260], [330, 170], color="#000000", lw=1.2, zorder=3)
    ax.text(320, 240, "4: insert(SUBMITTED) ->\n6: assign(empId) ->", fontsize=7.2, fontweight="bold", zorder=6,
            bbox=dict(boxstyle="square,pad=0.2", fc="#FFFFFF", ec="none", alpha=0.95))

    ax.plot([600, 740], [370, 540], color="#000000", lw=1.2, zorder=3)
    ax.text(670, 460, "5: alertQueue(centreId) ->\n7: reviewDocs() ->", fontsize=7.2, fontweight="bold", zorder=6,
            bbox=dict(boxstyle="square,pad=0.2", fc="#FFFFFF", ec="none", alpha=0.95))

    ax.plot([600, 740], [365, 365], color="#000000", lw=1.2, zorder=3)
    ax.text(670, 375, "8: createOrder(fee) ->\n9: verifyWebhook() ->", fontsize=7.2, fontweight="bold", ha="center", zorder=6,
            bbox=dict(boxstyle="square,pad=0.2", fc="#FFFFFF", ec="none", alpha=0.95))

    ax.plot([500, 500], [330, 150], color="#000000", lw=1.2, zorder=3)
    ax.text(505, 230, "10: saveOutputCert() ->", fontsize=7.2, fontweight="bold", zorder=6,
            bbox=dict(boxstyle="square,pad=0.2", fc="#FFFFFF", ec="none", alpha=0.95))

    ax.plot([600, 740], [330, 170], color="#000000", lw=1.2, zorder=3)
    ax.text(670, 240, "12: logTransition() ->", fontsize=7.2, fontweight="bold", zorder=6,
            bbox=dict(boxstyle="square,pad=0.2", fc="#FFFFFF", ec="none", alpha=0.95))

    save_fig(fig, "uml_09_collaboration.png")

# ----------------------------------------------------------------------
# Master Generation
# ----------------------------------------------------------------------
def generate_all_diagrams():
    """Generates all 9 publication-grade monochrome UML 2.5 diagrams at 300 DPI."""
    print("=" * 70)
    print("GENERATING 9 PUBLICATION-GRADE MONOCHROME UML 2.5 DIAGRAMS (300 DPI)")
    print(f"Target Directory: {OUTPUT_DIR}")
    print("=" * 70)
    
    generate_diagram_01_use_case()
    generate_diagram_02_sequence()
    generate_diagram_03_state()
    generate_diagram_04_activity()
    generate_diagram_05_class()
    generate_diagram_06_object()
    generate_diagram_07_component()
    generate_diagram_08_deployment()
    generate_diagram_09_collaboration()
    
    print("=" * 70)
    print("[SUCCESS] All 9 monochrome UML 2.5 architecture diagrams verified.")
    print("=" * 70)

if __name__ == "__main__":
    generate_all_diagrams()
