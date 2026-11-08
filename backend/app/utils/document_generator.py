import os
import json
from typing import Any

def generate_compliance_package_text(log_record: Any, audit_record: Any) -> str:
    """
    Compiles a comprehensive compliance audit report into a formatted, structured text document.
    """
    structured_json = log_record.structured_json or {}
    location = structured_json.get("location", "N/A")
    beneficiaries = structured_json.get("beneficiaries_count", "N/A")
    
    activities_list = structured_json.get("activities", [])
    activities = ", ".join(activities_list) if isinstance(activities_list, list) else str(activities_list)
    blockers = structured_json.get("blockers", "None")
    translation = structured_json.get("translation", "")
    
    report = []
    report.append("=" * 80)
    report.append("                    SARTHI CSR AUDIT & COMPLIANCE PROOF PACKAGE")
    report.append("=" * 80)
    report.append(f"Audit Package ID:      SECURE-AUDIT-{audit_record.id}")
    report.append(f"Sealing Timestamp:     {audit_record.created_at.strftime('%Y-%m-%d %H:%M:%S')} UTC")
    report.append(f"Audit Evidence Status:  CRYPTOGRAPHICALLY SEALED (APPROVED)")
    report.append("-" * 80)
    report.append("1. FIELD INTELLIGENCE EVIDENCE METRICS")
    report.append(f"   Field Worker ID:        {log_record.worker_id}")
    report.append(f"   Log Submission:         {log_record.timestamp.strftime('%Y-%m-%d %H:%M:%S')} UTC")
    report.append(f"   Geographic Coordinates: {log_record.geo_latitude} N, {log_record.geo_longitude} E")
    report.append(f"   Beneficiaries Mapped:   {beneficiaries} (verified)")
    report.append(f"   Activities Catalogued:  {activities}")
    report.append(f"   Field Blockers Logged:  {blockers}")
    report.append("-" * 80)
    report.append("2. RAW SPEECH INTEL TRANSCRIPT")
    report.append(f"   Hindi Input:            \"{log_record.raw_transcript}\"")
    report.append(f"   English Translation:    \"{translation}\"")
    report.append("-" * 80)
    report.append("3. COMPLIANCE STANDARDS CLASSIFICATION")
    report.append(f"   UN Sustainable Development Goals (SDG): Goals {audit_record.sdg_goals}")
    report.append(f"   SEBI BRSR Principle 8 Indicators:        {audit_record.brsr_principles}")
    report.append("-" * 80)
    report.append("4. CRYPTOGRAPHIC PROOF CHAIN BLOCK")
    report.append(f"   CURRENT BLOCK HASH:  {audit_record.block_hash}")
    report.append("=" * 80)
    
    return "\n".join(report)

def generate_compliance_package_html(log_record: Any, audit_record: Any) -> str:
    """
    Renders an audit-ready compliance certificate formatted in print-friendly HTML.
    """
    structured_json = log_record.structured_json or {}
    location = structured_json.get("location", "N/A")
    beneficiaries = structured_json.get("beneficiaries_count", "N/A")
    
    activities_list = structured_json.get("activities", [])
    activities = ", ".join(activities_list) if isinstance(activities_list, list) else str(activities_list)
    blockers = structured_json.get("blockers", "None")
    translation = structured_json.get("translation", "")

    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Sarthi Compliance Certificate - Audit #{audit_record.id}</title>
    <style>
        body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; margin: 40px; line-height: 1.6; }}
        .certificate {{ border: 4px double #2563eb; padding: 30px; max-width: 800px; margin: auto; background-color: #fafbfc; }}
        .header {{ text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 25px; }}
        .header h1 {{ font-size: 24px; color: #1e3a8a; margin: 0; text-transform: uppercase; letter-spacing: 1px; }}
        .header p {{ font-size: 12px; color: #666; margin: 5px 0 0 0; font-weight: bold; }}
        .meta-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; font-size: 14px; }}
        .meta-item {{ padding: 10px; background-color: #fff; border: 1px solid #e5e7eb; border-radius: 4px; }}
        .section-title {{ font-size: 16px; color: #1e3a8a; border-left: 4px solid #2563eb; padding-left: 10px; margin-top: 25px; margin-bottom: 15px; text-transform: uppercase; font-weight: bold; }}
        .content-box {{ padding: 12px; background-color: #fff; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 14px; }}
        .hash-box {{ padding: 15px; background-color: #1e293b; color: #10b981; font-family: monospace; font-size: 13px; border-radius: 4px; text-align: center; border: 1px solid #0f172a; word-break: break-all; margin-top: 30px; }}
        .badge {{ font-size: 11px; background-color: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase; display: inline-block; margin-right: 5px; }}
    </style>
</head>
<body>
    <div class="certificate">
        <div class="header">
            <h1>CSR Audit Compliance Proof Package</h1>
            <p>Sealed Certificate ID: SECURE-AUDIT-{audit_record.id} | Status: CRYPTOGRAPHICALLY SEALED</p>
        </div>
        
        <div class="meta-grid">
            <div class="meta-item"><strong>Field Worker ID:</strong> {log_record.worker_id}</div>
            <div class="meta-item"><strong>Sealing Date:</strong> {audit_record.created_at.strftime('%Y-%m-%d %H:%M:%S')} UTC</div>
            <div class="meta-item"><strong>Location:</strong> {location}</div>
            <div class="meta-item"><strong>Geotag Coords:</strong> {log_record.geo_latitude}N, {log_record.geo_longitude}E</div>
        </div>

        <div class="section-title">1. Field Verification Metrics</div>
        <div class="content-box">
            <strong>Beneficiaries Mapped:</strong> {beneficiaries} (verified)<br>
            <strong>Activities Logged:</strong> {activities}<br>
            <strong>Blockers Highlighted:</strong> {blockers}
        </div>

        <div class="section-title">2. Speech Translation Summary</div>
        <div class="content-box">
            <strong>Hindi Worker Input:</strong> <em>"{log_record.raw_transcript}"</em><br><br>
            <strong>English Mapping:</strong> <em>"{translation}"</em>
        </div>

        <div class="section-title">3. Compliance Framework Mapping</div>
        <div class="content-box">
            <strong>Sustainable Development Goals (SDG):</strong> 
            {", ".join([f"<span class='badge'>SDG {goal}</span>" for goal in (audit_record.sdg_goals or [])])}
            <br><br>
            <strong>BRSR Indicator Mappings:</strong> {", ".join(audit_record.brsr_principles or [])}
        </div>

        <div class="hash-box">
            🔒 LEDGER BLOCK CRYPTOGRAPHIC SIGNATURE<br>
            {audit_record.block_hash}
        </div>
    </div>
</body>
</html>
"""
    return html
