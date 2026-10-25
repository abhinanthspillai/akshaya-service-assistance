import os
import re
import datetime
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

try:
    from .styles import (
        add_styled_table, set_table_borders,
        get_bookmark_name, add_internal_hyperlink
    )
except ImportError:
    from styles import (
        add_styled_table, set_table_borders,
        get_bookmark_name, add_internal_hyperlink
    )

def load_and_prepare_front_matter(template_path=None, cfg=None):
    """
    Loads the official College Format DOCX directly to ensure:
    - Exact layout, margins, and typography from the prescribed college template.
    - Embedded official Amal Jyothi College emblem (image2.png on Cover and Certificate) is 100% authentic and pixel-perfect.
    - Updates student name, registration number, project title, and faculty details dynamically from cfg.
    - Prepares interactive Table of Contents with clickable internal bookmarks.
    - Trims out template placeholder instructional paragraphs, leaving the document ready for chapters.
    """
    if cfg is None:
        cfg = {}

    inst = cfg.get("institution", {})
    st = cfg.get("student", {})
    fc = cfg.get("faculty", {})
    pj = cfg.get("project", {})

    student_name = st.get("full_name", "STUDENT FULL NAME")
    reg_number = st.get("reg_number", "AJC25MCA-XXXX")
    project_title = pj.get("title", "ENTER YOUR PROJECT TITLE HERE")
    short_name = pj.get("short_name", "PROJECT")
    guide_name = fc.get("project_guide_name", "PROJECT GUIDE NAME")
    guide_desig = fc.get("project_guide_designation", "Assistant Professor")
    hod_name = fc.get("hod_name", "Dr. Juby Mathew")
    hod_desig = fc.get("hod_designation", "Professor & Head of Department")
    college_name = inst.get("college_name", "AMAL JYOTHI COLLEGE OF ENGINEERING AUTONOMOUS")

    if template_path is None or not os.path.exists(template_path):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        template_path = os.path.join(base_dir, "02_Benchmarks_And_Templates", "College_Official_Report_Format_24MCAR295.docx")

    if not os.path.exists(template_path):
        raise FileNotFoundError(f"College format template not found at: {template_path}")

    doc = docx.Document(template_path)

    # Standardize margins across all template sections
    # Section 0: Cover page (symmetric 1.0 inch margins)
    s0 = doc.sections[0]
    s0.top_margin = Inches(1.0)
    s0.bottom_margin = Inches(1.0)
    s0.left_margin = Inches(1.0)
    s0.right_margin = Inches(1.0)

    # Sections 1 to 4: Preliminary matters (1.18 in left margin for binding, 1.0 in right margin)
    for s in doc.sections[1:]:
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(1.0)
        s.left_margin = Inches(1.18)
        s.right_margin = Inches(1.0)

    # -------------------------------------------------------------
    # 1. UPDATE COVER PAGE (Paragraphs 0 to 25)
    # -------------------------------------------------------------
    # P1: Project Name
    doc.paragraphs[1].text = project_title.upper()
    doc.paragraphs[1].alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.paragraphs[1].paragraph_format.space_before = Pt(12)
    doc.paragraphs[1].paragraph_format.space_after = Pt(2)
    doc.paragraphs[1].paragraph_format.left_indent = Inches(0)
    doc.paragraphs[1].paragraph_format.right_indent = Inches(0)
    for r in doc.paragraphs[1].runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(18)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    # P2: Subtitle
    doc.paragraphs[2].text = f"({short_name})" if short_name else ""
    doc.paragraphs[2].alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.paragraphs[2].paragraph_format.space_after = Pt(16)
    doc.paragraphs[2].paragraph_format.left_indent = Inches(0)
    doc.paragraphs[2].paragraph_format.right_indent = Inches(0)
    for r in doc.paragraphs[2].runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(14)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    # P4: Mini Project Report
    doc.paragraphs[4].text = "Project Report"
    doc.paragraphs[4].alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.paragraphs[4].paragraph_format.space_after = Pt(14)
    doc.paragraphs[4].paragraph_format.left_indent = Inches(0)
    doc.paragraphs[4].paragraph_format.right_indent = Inches(0)
    for r in doc.paragraphs[4].runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(13)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    # P8: Name of Student
    doc.paragraphs[8].text = student_name
    doc.paragraphs[8].alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.paragraphs[8].paragraph_format.space_after = Pt(2)
    doc.paragraphs[8].paragraph_format.left_indent = Inches(0)
    doc.paragraphs[8].paragraph_format.right_indent = Inches(0)
    for r in doc.paragraphs[8].runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(14)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    # P9: Reg. No.
    doc.paragraphs[9].text = f"Reg. No.: {reg_number}"
    doc.paragraphs[9].alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.paragraphs[9].paragraph_format.space_after = Pt(14)
    doc.paragraphs[9].paragraph_format.left_indent = Inches(0)
    doc.paragraphs[9].paragraph_format.right_indent = Inches(0)
    for r in doc.paragraphs[9].runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(13)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    # P11: Degree award text (reset anomalous template indents)
    doc.paragraphs[11].paragraph_format.left_indent = Inches(0)
    doc.paragraphs[11].paragraph_format.right_indent = Inches(0)
    doc.paragraphs[11].paragraph_format.first_line_indent = Inches(0)
    doc.paragraphs[11].alignment = WD_ALIGN_PARAGRAPH.CENTER

    # NOTE: Paragraph 16 contains the authentic embedded college emblem logo (image2.png), preserved untouched!

    # -------------------------------------------------------------
    # 2. UPDATE CERTIFICATE PAGE (Paragraphs 26 to 53)
    # -------------------------------------------------------------
    doc.paragraphs[34].alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.paragraphs[34].paragraph_format.left_indent = Inches(0)
    doc.paragraphs[34].paragraph_format.right_indent = Inches(0)

    # NOTE: Paragraph 30 contains the authentic embedded college emblem logo on certificate, preserved untouched!
    today_str = datetime.date.today().strftime("%B %Y")
    doc.paragraphs[36].text = (
        f"This is to certify that the Project report titled “{project_title.upper()}” "
        f"is the bona fide work of {student_name} (Reg. No: {reg_number}) carried out in partial fulfillment "
        f"of the requirements for the award of the Degree of Master of Computer Applications at Amal Jyothi "
        f"College of Engineering Autonomous, Kanjirappally. The project was undertaken during the academic period "
        f"2025–2027."
    )
    doc.paragraphs[36].alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    doc.paragraphs[36].paragraph_format.line_spacing = 1.5
    doc.paragraphs[36].paragraph_format.left_indent = Inches(0)
    doc.paragraphs[36].paragraph_format.right_indent = Inches(0)
    for r in doc.paragraphs[36].runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(12)
        r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    # Update Certificate Guide & HOD Signatures
    doc.paragraphs[41].text = f"             {guide_name}                                                                     {guide_name}"
    doc.paragraphs[42].text = f"             {guide_desig}                                                                Project Guide / Mentor"
    doc.paragraphs[49].text = f"{hod_name}"
    doc.paragraphs[50].text = f"{hod_desig}"
    for p_cert in [doc.paragraphs[41], doc.paragraphs[42], doc.paragraphs[49], doc.paragraphs[50]]:
        for r in p_cert.runs:
            r.font.name = "Times New Roman"
            r.font.size = Pt(11)
            r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)
    for r in doc.paragraphs[49].runs:
        r.font.bold = True

    # -------------------------------------------------------------
    # 3. UPDATE DECLARATION & ACKNOWLEDGEMENT (Paragraphs 54 to 87)
    # -------------------------------------------------------------
    doc.paragraphs[57].alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.paragraphs[57].paragraph_format.left_indent = Inches(0)
    doc.paragraphs[57].paragraph_format.right_indent = Inches(0)

    doc.paragraphs[60].text = (
        f"I hereby declare that the project report titled “{project_title.upper()}” is a "
        f"bona fide work done at Amal Jyothi College of Engineering Autonomous, Kanjirappally, towards the partial "
        f"fulfillment of the requirements for the award of the Master of Computer Applications (MCA) during the academic year 2025–2027."
    )
    doc.paragraphs[60].alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    doc.paragraphs[60].paragraph_format.line_spacing = 1.5
    doc.paragraphs[60].paragraph_format.left_indent = Inches(0)
    doc.paragraphs[60].paragraph_format.right_indent = Inches(0)
    for r in doc.paragraphs[60].runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(12)
        r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    today_date = datetime.date.today().strftime("%d-%m-%Y")
    doc.paragraphs[68].text = f"             Date: {today_date}                                                                    {student_name}"
    doc.paragraphs[69].text = f"             KANJIRAPPALLY                                                                       Reg: {reg_number}"
    for p_dec in [doc.paragraphs[68], doc.paragraphs[69]]:
        for r in p_dec.runs:
            r.font.name = "Times New Roman"
            r.font.size = Pt(12)
            r.font.bold = True
            r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    doc.paragraphs[75].alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.paragraphs[75].paragraph_format.left_indent = Inches(0)
    doc.paragraphs[75].paragraph_format.right_indent = Inches(0)

    for p_ack in [doc.paragraphs[77], doc.paragraphs[80], doc.paragraphs[83]]:
        p_ack.paragraph_format.left_indent = Inches(0)
        p_ack.paragraph_format.right_indent = Inches(0)

    # Update Acknowledgement paragraph 80 with HOD and Guide
    doc.paragraphs[80].text = (
        f"I owe a great depth of gratitude towards our Head of the Department {hod_name} for her invaluable support and encouragement. "
        f"I extend my wholehearted thanks to our faculty members for their valuable suggestions and concern from the beginning to the end of the project. "
        f"I express my profound and sincere gratitude to my project guide {guide_name}, {guide_desig}, for her continuous inspiration, patient mentorship, "
        f"technical guidance, and helping hand throughout the architectural formulation and realization of this project."
    )
    doc.paragraphs[80].alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    doc.paragraphs[80].paragraph_format.line_spacing = 1.5
    for r in doc.paragraphs[80].runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(12)
        r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    doc.paragraphs[87].text = f"\t\t {student_name}\n\t\t Reg. No: {reg_number}"
    for r in doc.paragraphs[87].runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(12)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    # -------------------------------------------------------------
    # 4. ABSTRACT (Paragraphs 88 to 90)
    # -------------------------------------------------------------
    doc.paragraphs[88].alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.paragraphs[88].paragraph_format.left_indent = Inches(0)
    doc.paragraphs[88].paragraph_format.right_indent = Inches(0)

    tagline = pj.get("tagline", "A high-performance modern software application")
    doc.paragraphs[90].text = (
        f"The {project_title} ({short_name}) is an enterprise-grade software system "
        f"engineered to address key challenges in modern computing and user workflow management. {tagline}. "
        f"Built upon a modular, highly maintainable architecture conforming strictly to institutional engineering benchmarks, "
        f"the system provides end-to-end functionality, high reliability, and responsive client-server interaction. "
        f"Comprehensive empirical testing, structured design modeling through UML 2.5 architecture diagrams, "
        f"and rigorous security validation confirm that {short_name} delivers dependable real-world performance, "
        f"secure data management, and seamless operational usability."
    )
    doc.paragraphs[90].alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    doc.paragraphs[90].paragraph_format.line_spacing = 1.5
    doc.paragraphs[90].paragraph_format.left_indent = Inches(0)
    doc.paragraphs[90].paragraph_format.right_indent = Inches(0)
    for r in doc.paragraphs[90].runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(12)
        r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    doc.paragraphs[92].alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.paragraphs[92].paragraph_format.left_indent = Inches(0)
    doc.paragraphs[92].paragraph_format.right_indent = Inches(0)

    # -------------------------------------------------------------
    # 5. REMOVE OLD TEMPLATE TABLES & INSTRUCTIONAL PLACEHOLDERS
    # -------------------------------------------------------------
    body = doc._body._element

    while len(doc.tables) > 0:
        tbl = doc.tables[0]._tbl
        tbl.getparent().remove(tbl)

    for p in doc.paragraphs[93:]:
        body.remove(p._element)

    if len(doc.sections) > 4:
        s4 = doc.sections[4]
        s4.header.is_linked_to_previous = False
        s4.footer.is_linked_to_previous = False
        for p in list(s4.header.paragraphs):
            p._element.getparent().remove(p._element)
        for p in list(s4.footer.paragraphs):
            p._element.getparent().remove(p._element)
        s4.top_margin = Inches(1.0)
        s4.bottom_margin = Inches(1.0)
        s4.left_margin = Inches(1.18)
        s4.right_margin = Inches(1.0)

    # -------------------------------------------------------------
    # 6. ADD INTERACTIVE CLICKABLE TABLE OF CONTENTS
    # -------------------------------------------------------------
    toc_entries = [
        ["1", "INTRODUCTION", "1"],
        ["1.1", "PROJECT OVERVIEW", "2"],
        ["1.2", "PROJECT SPECIFICATION", "3"],
        ["2", "SYSTEM STUDY", "5"],
        ["2.1", "INTRODUCTION", "6"],
        ["2.2", "LITERATURE REVIEW", "6"],
        ["2.3", "DRAWBACKS OF EXISTING SYSTEM", "8"],
        ["2.4", "PROPOSED SYSTEM", "8"],
        ["2.5", "ADVANTAGES OF PROPOSED SYSTEM", "8"],
        ["3", "REQUIREMENT ANALYSIS", "10"],
        ["3.1", "FEASIBILITY STUDY", "11"],
        ["3.1.1", "ECONOMICAL FEASIBILITY", "11"],
        ["3.1.2", "TECHNICAL FEASIBILITY", "11"],
        ["3.1.3", "BEHAVIORAL FEASIBILITY", "11"],
        ["3.1.4", "FEASIBILITY STUDY QUESTIONNAIRE", "12"],
        ["3.1.5", "GEOTAGGED PHOTOGRAPH", "14"],
        ["3.2", "SYSTEM SPECIFICATION", "14"],
        ["3.2.1", "HARDWARE SPECIFICATION", "14"],
        ["3.2.2", "SOFTWARE SPECIFICATION", "15"],
        ["3.3", "SOFTWARE DESCRIPTION", "15"],
        ["3.3.1", "APPLICATION LANGUAGE & UI FRAMEWORK", "15"],
        ["3.3.2", "DATABASE & CLOUD INFRASTRUCTURE", "16"],
        ["4", "SYSTEM DESIGN", "17"],
        ["4.1", "INTRODUCTION", "18"],
        ["4.2", "UML DIAGRAM", "18"],
        ["4.2.1", "USE CASE DIAGRAM", "19"],
        ["4.2.2", "SEQUENCE DIAGRAM", "20"],
        ["4.2.3", "STATE CHART DIAGRAM", "21"],
        ["4.2.4", "ACTIVITY DIAGRAM", "22"],
        ["4.2.5", "CLASS DIAGRAM", "23"],
        ["4.2.6", "OBJECT DIAGRAM", "24"],
        ["4.2.7", "COMPONENT DIAGRAM", "25"],
        ["4.2.8", "DEPLOYMENT DIAGRAM", "26"],
        ["4.2.9", "COLLABORATION DIAGRAM", "27"],
        ["4.3", "USER INTERFACE DESIGN USING FIGMA", "28"],
        ["4.4", "DATABASE DESIGN", "28"],
        ["4.4.1", "DATABASE NORMALIZATION (1NF TO BCNF)", "28"],
        ["4.4.2", "TABLE / COLLECTION DESIGN", "30"],
        ["5", "SYSTEM TESTING", "47"],
        ["5.1", "INTRODUCTION", "48"],
        ["5.2", "TEST PLAN", "48"],
        ["5.2.1", "UNIT TESTING", "48"],
        ["5.2.2", "INTEGRATION TESTING", "48"],
        ["5.2.3", "VALIDATION TESTING", "49"],
        ["5.2.4", "USER ACCEPTANCE TESTING", "49"],
        ["5.2.5", "AUTOMATION TESTING", "49"],
        ["5.2.6", "SELENIUM & APPIUM TESTING", "49"],
        ["5.2.7", "FORMAL TEST CASES (TEST_1 TO TEST_6)", "51"],
        ["5.2.8", "TEST EXECUTION STATUS & SCHEDULED COMPLETION", "57"],
        ["6", "IMPLEMENTATION", "58"],
        ["6.1", "INTRODUCTION", "59"],
        ["6.2", "IMPLEMENTATION PROCEDURE", "59"],
        ["6.2.1", "USER TRAINING", "59"],
        ["6.2.2", "TRAINING ON APPLICATION SOFTWARE", "59"],
        ["6.2.3", "SYSTEM MAINTENANCE", "59"],
        ["6.2.4", "HOSTING & CLOUD DEPLOYMENT", "60"],
        ["7", "CONCLUSION & FUTURE SCOPE", "62"],
        ["7.1", "CONCLUSION", "63"],
        ["7.2", "FEATURE IMPLEMENTATION STATUS MATRIX (CHECK TABLE)", "64"],
        ["7.3", "FUTURE SCOPE", "65"],
        ["8", "BIBLIOGRAPHY", "67"],
        ["8.1", "ACADEMIC & TECHNICAL REFERENCES (IEEE STYLE)", "68"],
        ["8.2", "WEBSITES & DOCUMENTATION PORTALS", "69"],
        ["9", "APPENDIX", "70"],
        ["9.1", "SAMPLE CODE", "71"],
        ["9.2", "SCREEN SHOTS", "89"],
        ["9.3", "GIT LOG", "95"],
    ]

    add_interactive_toc_table(doc, toc_entries, col_widths=[0.9, 4.25, 0.85])
    return doc

def add_interactive_toc_table(doc, toc_entries, col_widths=[0.9, 4.25, 0.85]):
    """
    Builds the official Table of Contents with active internal hyperlinks.
    Clicking the SL. NO, TOPIC name, or PAGE NO navigates directly to that target page!
    """
    table = doc.add_table(rows=1, cols=3)
    table.alignment = docx.enum.table.WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_borders(table)

    headers = ["SL. NO", "TOPIC", "PAGE NO"]
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = 'Times New Roman'
            r.font.size = Pt(11)
            r.font.bold = True
            r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    shd = parse_xml(r'<w:shd {} w:fill="EAEAEA"/>'.format(nsdecls('w')))
    for cell in hdr_cells:
        cell._tc.get_or_add_tcPr().append(shd)

    for row_data in toc_entries:
        sl_no, topic, page_no = row_data[0], row_data[1], row_data[2]
        bm_name = get_bookmark_name(sl_no)
        is_chapter = ("." not in sl_no)
        row_cells = table.add_row().cells

        # Col 0: SL. NO (clickable)
        p0 = row_cells[0].paragraphs[0]
        p0.alignment = WD_ALIGN_PARAGRAPH.LEFT if "." in sl_no else WD_ALIGN_PARAGRAPH.CENTER
        add_internal_hyperlink(p0, sl_no, bm_name, font_size=Pt(11) if is_chapter else Pt(10), is_bold=is_chapter)

        # Col 1: TOPIC (clickable)
        p1 = row_cells[1].paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.LEFT
        indent = "    " if sl_no.count(".") >= 2 else ("  " if "." in sl_no else "")
        add_internal_hyperlink(p1, indent + topic, bm_name, font_size=Pt(11) if is_chapter else Pt(10), is_bold=is_chapter)

        # Col 2: PAGE NO (clickable!)
        p2 = row_cells[2].paragraphs[0]
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_internal_hyperlink(p2, page_no, bm_name, font_size=Pt(11) if is_chapter else Pt(10), is_bold=is_chapter)

    for row in table.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = Inches(width)
            tcPr = row.cells[idx]._tc.get_or_add_tcPr()
            tcMar = OxmlElement('w:tcMar')
            for m, val in [('top', '100'), ('bottom', '100'), ('left', '140'), ('right', '140')]:
                node = OxmlElement(f'w:{m}')
                node.set(qn('w:w'), val)
                node.set(qn('w:type'), 'dxa')
                tcMar.append(node)
            tcPr.append(tcMar)

def add_preliminary_lists(doc):
    """Adds standard List of Tables and List of Figures right after Table of Contents."""
    doc.add_page_break()

    # 1. LIST OF TABLES
    p_lot = doc.add_paragraph()
    p_lot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_lot.paragraph_format.space_before = Pt(12)
    p_lot.paragraph_format.space_after = Pt(14)
    r_lot = p_lot.add_run("LIST OF TABLES")
    r_lot.font.name = "Times New Roman"
    r_lot.font.size = Pt(15)
    r_lot.font.bold = True
    r_lot.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    lot_headers = ["Table No.", "Table Title", "Page No."]
    lot_rows = [
        ["Table 2.1", "Critical Literature Analysis of 10 Landmark Publications", "6"],
        ["Table 3.1", "Cloud Infrastructure Operational Cost Projections", "11"],
        ["Table 3.2", "Q1: User Requirement Survey — Service Discovery Frequency", "12"],
        ["Table 3.3", "Q2: Primary Frustration Encountered with Existing Systems", "12"],
        ["Table 3.4", "Q3: Demand for Verified Identity and Platform Trust", "12"],
        ["Table 3.5", "Q4: Requirement for Real-Time Status Notification", "12"],
        ["Table 3.6", "Q5: System Security and Authenticated Access Requirements", "13"],
        ["Table 3.7", "Q6: Willingness to Adopt Digital In-App Workflows", "13"],
        ["Table 3.8", "Q7: Preference for Upfront Transparent Digital Payments", "13"],
        ["Table 3.9", "Q8: Real-Time In-App Communication Needs", "13"],
        ["Table 3.10", "Q9: Acceptance of Automated Verification Protocols", "14"],
        ["Table 3.11", "Q10: Overall Likelihood to Adopt All-in-One Application", "14"],
        ["Table 3.12", "Hardware and Development Environment Specifications", "14"],
        ["Table 3.13", "Software and Cloud Technology Stack Specifications", "15"],
        ["Table 4.1", "Master User Accounts Schema (tbl_users)", "29"],
        ["Table 4.2", "Saved User Profiles Subcollection Schema", "30"],
        ["Table 4.3", "Identity & Verification Documents Schema", "30"],
        ["Table 4.4", "Master Service Offerings Catalog Schema", "32"],
        ["Table 4.5", "Primary Category Taxonomy Schema", "32"],
        ["Table 4.6", "Core Transactional Records Schema", "33"],
        ["Table 4.7", "Verification & State Transitions Schema", "34"],
        ["Table 4.8", "Secondary Catalog & Inventory Schema", "35"],
        ["Table 4.9", "Financial Escrow & Settlements Schema", "37"],
        ["Table 4.10", "Customer Reviews & Quality Ratings Schema", "38"],
        ["Table 4.11", "Real-Time Communication Channels Schema", "38"],
        ["Table 4.12", "High-Frequency GPS & Telemetry Schema", "40"],
        ["Table 4.13", "Helpdesk Support & Dispute Resolution Schema", "40"],
        ["Table 4.14", "Knowledgebase Support FAQs Schema", "41"],
        ["Table 4.15", "Visual Layouts & Templates Schema", "41"],
        ["Table 4.16", "System Quota Guard & Circuit Breaker Schema", "42"],
        ["Table 4.17", "Administrative Governance & Audit Logs Schema", "42"],
        ["Table 4.18", "Push Notifications Queue Schema", "43"],
        ["Table 5.1", "Test Case 1 - User Authentication & Role Detection", "51"],
        ["Table 5.2", "Test Case 2 - Transaction Execution & Concurrency Lock", "52"],
        ["Table 5.3", "Test Case 3 - Core Workflow & Schedule Selection", "53"],
        ["Table 5.4", "Test Case 4 - Financial Escrow & Authorization", "54"],
        ["Table 5.5", "Test Case 5 - Navigation & Spatial Operations", "55"],
        ["Table 5.6", "Test Case 6 - Real-Time State Notification & Sync", "56"],
        ["Table 6.1", "Quantitative System Performance Benchmarks", "60"],
        ["Table 7.1", "Master Feature & Module Implementation Status Check Table", "64"],
        ["Table 8.1", "Complete Academic References & Literature Bibliography", "68"],
        ["Table 8.2", "Technical Documentation & Developer Portals", "69"],
    ]
    add_styled_table(doc, lot_headers, lot_rows, col_widths=[1.1, 4.0, 0.9])

    # 2. LIST OF FIGURES
    doc.add_page_break()
    p_lof = doc.add_paragraph()
    p_lof.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_lof.paragraph_format.space_before = Pt(12)
    p_lof.paragraph_format.space_after = Pt(14)
    r_lof = p_lof.add_run("LIST OF FIGURES")
    r_lof.font.name = "Times New Roman"
    r_lof.font.size = Pt(15)
    r_lof.font.bold = True
    r_lof.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    lof_headers = ["Figure No.", "Figure Title", "Page No."]
    lof_rows = [
        ["Figure 4.1", "Use Case Diagram for Customer, Provider, and Administrator Ecosystem", "19"],
        ["Figure 4.2", "Sequence Diagram for End-to-End System Service Execution & Escrow Release", "20"],
        ["Figure 4.3", "State Chart Diagram for Core Entity Lifecycle Transitions", "21"],
        ["Figure 4.4", "Activity Diagram Depicting Procedural Service Fulfillment & Execution Workflows", "22"],
        ["Figure 4.5", "Class Diagram Depicting Domain Models, Repositories, and System Architecture", "23"],
        ["Figure 4.6", "Object Diagram Depicting Instantiated Runtime Objects During Active Execution", "24"],
        ["Figure 4.7", "Component Diagram Illustrating System Subsystems and Interface Connectors", "25"],
        ["Figure 4.8", "Deployment Diagram Mapping Client Devices and Cloud Datacenter Infrastructure", "26"],
        ["Figure 4.9", "Collaboration Diagram Illustrating Inter-Object Linkages and Message Sequences", "27"],
    ]
    add_styled_table(doc, lof_headers, lof_rows, col_widths=[1.1, 4.0, 0.9])

    # 3. LIST OF ABBREVIATIONS
    doc.add_page_break()
    p_ab = doc.add_paragraph()
    p_ab.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ab.paragraph_format.space_before = Pt(12)
    p_ab.paragraph_format.space_after = Pt(14)
    r_ab = p_ab.add_run("LIST OF ABBREVIATIONS")
    r_ab.font.name = "Times New Roman"
    r_ab.font.size = Pt(15)
    r_ab.font.bold = True
    r_ab.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    ab_headers = ["Acronym", "Full Expansion / Description"]
    ab_rows = [
        ["ADB", "Android Debug Bridge"],
        ["AICTE", "All India Council for Technical Education"],
        ["ANR", "Application Not Responding"],
        ["API", "Application Programming Interface"],
        ["APK", "Android Package Kit"],
        ["BCNF", "Boyce-Codd Normal Form"],
        ["BaaS", "Backend-as-a-Service"],
        ["CTA", "Call-To-Action"],
        ["DTO", "Data Transfer Object"],
        ["FCM", "Firebase Cloud Messaging"],
        ["FIFO", "First In, First Out"],
        ["GPS", "Global Positioning System"],
        ["HUD", "Heads-Up Display"],
        ["IEEE", "Institute of Electrical and Electronics Engineers"],
        ["JSON", "JavaScript Object Notation"],
        ["JVM", "Java Virtual Machine"],
        ["KYC", "Know Your Customer (Identity Verification)"],
        ["MCA", "Master of Computer Applications"],
        ["MVVM", "Model-View-ViewModel"],
        ["NAAC", "National Assessment and Accreditation Council"],
        ["NBA", "National Board of Accreditation"],
        ["NoSQL", "Non-Relational Structured Query Language"],
        ["NFR", "Non-Functional Requirement"],
        ["OTA", "Over-The-Air (Software Distribution)"],
        ["PaaS", "Platform-as-a-Service"],
        ["QoS", "Quality of Service"],
        ["RBAC", "Role-Based Access Control"],
        ["REST", "Representational State Transfer"],
        ["SDK", "Software Development Kit"],
        ["SRS", "Software Requirements Specification"],
        ["SSL", "Secure Sockets Layer"],
        ["SUS", "System Usability Scale"],
        ["TLS", "Transport Layer Security"],
        ["UAT", "User Acceptance Testing"],
        ["UI", "User Interface"],
        ["UML", "Unified Modeling Language"],
        ["URI", "Uniform Resource Identifier"],
        ["UX", "User Experience"],
        ["VCS", "Version Control System"],
        ["1NF", "First Normal Form"],
        ["2NF", "Second Normal Form"],
        ["3NF", "Third Normal Form"],
    ]
    add_styled_table(doc, ab_headers, ab_rows, col_widths=[1.2, 4.8])
