"""
Report Generation Service using ReportLab.

Generates professional PDF investigation reports for cases.
"""
import io
from datetime import datetime
from typing import Dict, Any, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# Color palette
DARK_BLUE = colors.HexColor("#0d1b2a")
TEAL = colors.HexColor("#00b4d8")
ACCENT_ORANGE = colors.HexColor("#f77f00")
LIGHT_GRAY = colors.HexColor("#f8f9fa")
MID_GRAY = colors.HexColor("#6c757d")
RED = colors.HexColor("#dc3545")
GREEN = colors.HexColor("#28a745")
YELLOW = colors.HexColor("#ffc107")

SEVERITY_COLORS = {
    "critical": colors.HexColor("#dc3545"),
    "high": colors.HexColor("#fd7e14"),
    "medium": colors.HexColor("#ffc107"),
    "low": colors.HexColor("#28a745"),
    "informational": colors.HexColor("#17a2b8"),
}

RISK_COLORS = {
    "critical": colors.HexColor("#dc3545"),
    "high": colors.HexColor("#fd7e14"),
    "medium": colors.HexColor("#ffc107"),
    "low": colors.HexColor("#28a745"),
}


def get_styles() -> Dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    styles = {}

    styles["title"] = ParagraphStyle(
        "title",
        parent=base["Title"],
        fontSize=24,
        textColor=DARK_BLUE,
        spaceAfter=6,
        fontName="Helvetica-Bold",
    )
    styles["subtitle"] = ParagraphStyle(
        "subtitle",
        parent=base["Normal"],
        fontSize=14,
        textColor=MID_GRAY,
        spaceAfter=12,
        fontName="Helvetica",
    )
    styles["h1"] = ParagraphStyle(
        "h1",
        parent=base["Heading1"],
        fontSize=16,
        textColor=DARK_BLUE,
        spaceBefore=16,
        spaceAfter=8,
        fontName="Helvetica-Bold",
        borderPad=4,
    )
    styles["h2"] = ParagraphStyle(
        "h2",
        parent=base["Heading2"],
        fontSize=13,
        textColor=TEAL,
        spaceBefore=12,
        spaceAfter=6,
        fontName="Helvetica-Bold",
    )
    styles["body"] = ParagraphStyle(
        "body",
        parent=base["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#333333"),
        spaceAfter=6,
        leading=14,
    )
    styles["small"] = ParagraphStyle(
        "small",
        parent=base["Normal"],
        fontSize=8,
        textColor=MID_GRAY,
    )
    styles["label"] = ParagraphStyle(
        "label",
        parent=base["Normal"],
        fontSize=9,
        textColor=MID_GRAY,
        fontName="Helvetica-Bold",
        spaceAfter=2,
    )
    styles["value"] = ParagraphStyle(
        "value",
        parent=base["Normal"],
        fontSize=10,
        textColor=DARK_BLUE,
        spaceAfter=8,
    )
    styles["disclaimer"] = ParagraphStyle(
        "disclaimer",
        parent=base["Normal"],
        fontSize=8,
        textColor=MID_GRAY,
        alignment=TA_CENTER,
    )

    return styles


def generate_case_report(
    case: Dict[str, Any],
    evidence_list: List[Dict[str, Any]],
    findings: List[Dict[str, Any]],
    timeline_events: List[Dict[str, Any]],
    risk_assessment: Optional[Dict[str, Any]],
    investigator: Dict[str, Any],
    config: Dict[str, Any],
) -> bytes:
    """
    Generate a comprehensive PDF investigation report.
    
    Returns the PDF as bytes.
    """
    buffer = io.BytesIO()
    styles = get_styles()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2.5*cm,
        bottomMargin=2.5*cm,
        title=f"Investigation Report - {case.get('case_number', 'N/A')}",
        author=investigator.get("full_name", "Unknown"),
    )

    story = []

    # ============================================================
    # COVER PAGE
    # ============================================================
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph("🔍 CYBER CRIME INVESTIGATION DASHBOARD", styles["small"]))
    story.append(HRFlowable(width="100%", thickness=3, color=TEAL, spaceAfter=12))
    story.append(Paragraph("INVESTIGATION REPORT", styles["title"]))
    story.append(Paragraph(case.get("title", "Untitled Investigation"), styles["subtitle"]))
    story.append(Spacer(1, 1*cm))

    # Case info table
    case_meta = [
        ["Case Number:", case.get("case_number", "N/A"), "Status:", _badge_text(case.get("status", ""))],
        ["Priority:", _badge_text(case.get("priority", "")), "Category:", case.get("category", "N/A")],
        ["Investigator:", investigator.get("full_name", "Unknown"), "Report Date:", datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")],
        ["Jurisdiction:", case.get("jurisdiction", "N/A"), "Incident Date:", _format_date(case.get("incident_date"))],
    ]
    meta_table = Table(case_meta, colWidths=[3.5*cm, 6*cm, 3*cm, 5*cm])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
        ("TEXTCOLOR", (0, 0), (0, -1), MID_GRAY),
        ("TEXTCOLOR", (2, 0), (2, -1), MID_GRAY),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, LIGHT_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dee2e6")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 1*cm))

    # Disclaimer
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#dee2e6"), spaceAfter=8))
    story.append(Paragraph(
        "CONFIDENTIAL — This document contains sensitive law enforcement information. "
        "Unauthorized disclosure is prohibited.",
        styles["disclaimer"]
    ))
    story.append(PageBreak())

    # ============================================================
    # EXECUTIVE SUMMARY
    # ============================================================
    if config.get("include_executive_summary", True):
        story.append(Paragraph("1. Executive Summary", styles["h1"]))
        story.append(HRFlowable(width="100%", thickness=1, color=TEAL, spaceAfter=8))

        desc = case.get("description") or "No description provided."
        story.append(Paragraph(desc, styles["body"]))
        story.append(Spacer(1, 0.5*cm))

        # Summary stats
        critical_count = sum(1 for f in findings if f.get("severity") == "critical")
        high_count = sum(1 for f in findings if f.get("severity") == "high")

        summary_data = [
            ["Metric", "Value"],
            ["Total Evidence Items", str(len(evidence_list))],
            ["Total Findings", str(len(findings))],
            ["Critical Findings", str(critical_count)],
            ["High Severity Findings", str(high_count)],
            ["Timeline Events", str(len(timeline_events))],
            ["Risk Level", risk_assessment.get("risk_level", "Not Assessed").upper() if risk_assessment else "Not Assessed"],
        ]
        summary_table = Table(summary_data, colWidths=[9*cm, 8*cm])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), DARK_BLUE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dee2e6")),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 0.5*cm))

    # ============================================================
    # FINDINGS
    # ============================================================
    if config.get("include_findings", True) and findings:
        story.append(Paragraph("2. Investigation Findings", styles["h1"]))
        story.append(HRFlowable(width="100%", thickness=1, color=TEAL, spaceAfter=8))

        for i, finding in enumerate(findings, 1):
            severity = finding.get("severity", "low")
            sev_color = SEVERITY_COLORS.get(severity, MID_GRAY)

            finding_block = []
            finding_block.append(Paragraph(
                f"{finding.get('finding_number', f'FN-{i:04d}')} — {finding.get('title', 'Untitled Finding')}",
                styles["h2"]
            ))

            # Severity badge row
            badge_data = [
                [
                    Paragraph(f"Severity: {severity.upper()}", ParagraphStyle("badge", fontSize=9, textColor=colors.white)),
                    Paragraph(f"Category: {finding.get('category', 'N/A')}", ParagraphStyle("badge2", fontSize=9, textColor=DARK_BLUE)),
                    Paragraph(f"Status: {finding.get('status', 'open').upper()}", ParagraphStyle("badge3", fontSize=9, textColor=DARK_BLUE)),
                ]
            ]
            badge_table = Table(badge_data, colWidths=[5*cm, 6*cm, 6*cm])
            badge_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (0, 0), sev_color),
                ("BACKGROUND", (1, 0), (-1, 0), LIGHT_GRAY),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ]))
            finding_block.append(badge_table)
            finding_block.append(Spacer(1, 4))
            finding_block.append(Paragraph(finding.get("description", ""), styles["body"]))

            if finding.get("recommendations"):
                finding_block.append(Paragraph("Recommendations:", styles["label"]))
                finding_block.append(Paragraph(finding["recommendations"], styles["body"]))

            if finding.get("mitre_technique"):
                finding_block.append(Paragraph(
                    f"MITRE ATT&CK: {finding.get('mitre_tactic', 'N/A')} / {finding['mitre_technique']}",
                    styles["small"]
                ))

            story.append(KeepTogether(finding_block))
            story.append(Spacer(1, 0.5*cm))

    # ============================================================
    # EVIDENCE LIST
    # ============================================================
    if config.get("include_evidence_list", True) and evidence_list:
        story.append(Paragraph("3. Evidence Inventory", styles["h1"]))
        story.append(HRFlowable(width="100%", thickness=1, color=TEAL, spaceAfter=8))

        ev_data = [["#", "File Name", "Type", "Size", "SHA256 (partial)", "Status"]]
        for ev in evidence_list:
            size_mb = round(ev.get("file_size", 0) / (1024 * 1024), 2)
            sha256 = ev.get("hash_sha256", "N/A")
            sha_short = f"{sha256[:8]}...{sha256[-8:]}" if sha256 and sha256 != "N/A" else "N/A"
            ev_data.append([
                ev.get("evidence_number", "EV-???"),
                ev.get("original_file_name", "Unknown")[:35],
                ev.get("evidence_type", "digital"),
                f"{size_mb} MB",
                sha_short,
                "✓ Verified" if ev.get("is_verified") else "Pending",
            ])

        ev_table = Table(ev_data, colWidths=[1.8*cm, 5.5*cm, 2.5*cm, 2*cm, 3.5*cm, 2.5*cm])
        ev_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), DARK_BLUE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#dee2e6")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(ev_table)
        story.append(Spacer(1, 0.5*cm))

    # ============================================================
    # TIMELINE
    # ============================================================
    if config.get("include_timeline", True) and timeline_events:
        story.append(Paragraph("4. Investigation Timeline", styles["h1"]))
        story.append(HRFlowable(width="100%", thickness=1, color=TEAL, spaceAfter=8))

        for event in timeline_events:
            event_time = _format_date(event.get("event_time"))
            title = event.get("title", "Unknown Event")
            description = event.get("description", "")
            source = event.get("source", "Manual")

            story.append(Paragraph(
                f"[{event_time}] {title}",
                ParagraphStyle("timeline_item", fontSize=11, textColor=DARK_BLUE, spaceBefore=8, fontName="Helvetica-Bold")
            ))
            if description:
                story.append(Paragraph(description, styles["body"]))
            story.append(Paragraph(f"Source: {source} | Type: {event.get('event_type', 'N/A')}", styles["small"]))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#dee2e6"), spaceAfter=4))

    # ============================================================
    # RISK ASSESSMENT
    # ============================================================
    if config.get("include_risk_assessment", True) and risk_assessment:
        story.append(Paragraph("5. Risk Assessment", styles["h1"]))
        story.append(HRFlowable(width="100%", thickness=1, color=TEAL, spaceAfter=8))

        risk_level = risk_assessment.get("risk_level", "unknown")
        risk_color = RISK_COLORS.get(risk_level, MID_GRAY)

        risk_summary = [
            ["Likelihood", str(risk_assessment.get("likelihood", "N/A")) + " / 5"],
            ["Impact", str(risk_assessment.get("impact", "N/A")) + " / 5"],
            ["Overall Risk Score", str(risk_assessment.get("overall_risk_score", "N/A")) + " / 25"],
            ["Risk Level", risk_level.upper()],
        ]
        risk_table = Table(risk_summary, colWidths=[8*cm, 9*cm])
        risk_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, LIGHT_GRAY]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dee2e6")),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("BACKGROUND", (1, 3), (1, 3), risk_color),
            ("TEXTCOLOR", (1, 3), (1, 3), colors.white),
            ("FONTNAME", (1, 3), (1, 3), "Helvetica-Bold"),
        ]))
        story.append(risk_table)

        if risk_assessment.get("analyst_notes"):
            story.append(Spacer(1, 0.5*cm))
            story.append(Paragraph("Analyst Notes:", styles["label"]))
            story.append(Paragraph(risk_assessment["analyst_notes"], styles["body"]))

    # ============================================================
    # FOOTER / SIGNATURE
    # ============================================================
    story.append(PageBreak())
    story.append(Paragraph("Report Authorization", styles["h1"]))
    story.append(HRFlowable(width="100%", thickness=1, color=TEAL, spaceAfter=16))

    story.append(Paragraph(
        f"This report was generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} "
        f"by {investigator.get('full_name', 'Unknown')} "
        f"({investigator.get('email', 'N/A')}).",
        styles["body"]
    ))

    story.append(Spacer(1, 2*cm))
    story.append(Paragraph("_" * 40, styles["body"]))
    story.append(Paragraph(f"Investigator: {investigator.get('full_name', '__________________')}", styles["label"]))
    story.append(Paragraph(f"Badge: {investigator.get('badge_number', 'N/A')}", styles["label"]))
    story.append(Paragraph(f"Date: {datetime.utcnow().strftime('%Y-%m-%d')}", styles["label"]))

    story.append(Spacer(1, 2*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#dee2e6"), spaceAfter=8))
    story.append(Paragraph(
        f"CCID Platform — Cyber Crime Investigation Dashboard | Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        styles["disclaimer"]
    ))

    doc.build(story)
    return buffer.getvalue()


def _format_date(date_val) -> str:
    if not date_val:
        return "N/A"
    if isinstance(date_val, datetime):
        return date_val.strftime("%Y-%m-%d %H:%M")
    if isinstance(date_val, str):
        try:
            dt = datetime.fromisoformat(date_val.replace("Z", "+00:00"))
            return dt.strftime("%Y-%m-%d %H:%M")
        except Exception:
            return date_val
    return str(date_val)


def _badge_text(value: str) -> str:
    return value.upper().replace("_", " ") if value else "N/A"
