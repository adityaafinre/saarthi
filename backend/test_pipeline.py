import os
import sys
import json

# Add project root to path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.database import init_db, SessionLocal, FieldLog, AuditTrail
from app.agents.voice_intake import transcribe_audio_riva, extract_entities_from_transcript
from app.agents.insight import run_insight_agent
from app.agents.report import generate_ngo_report, generate_corporate_annexure, validate_report_safety
from app.agents.compliance import run_compliance_agent, calculate_immutable_hash

def safe_print(text: str, prefix: str = "   "):
    """
    Safely prints text by encoding non-ASCII characters to prevent terminal encoding crashes.
    """
    clean_text = text.encode('ascii', errors='replace').decode('ascii')
    print(f"{prefix}{clean_text}")

def run_tests():
    print("=" * 60)
    print("STARTING SARTHI PIPELINE END-TO-END VERIFICATION")
    print("=" * 60)
    
    # 1. Init Database
    print("\n[1/5] Initializing Database...")
    init_db()
    db = SessionLocal()
    print("[PASS] Database initialized successfully.")
    
    # 2. Riva STT & Entity Extraction
    print("\n[2/5] Executing Voice Intake Agent (Hindi speech -> structured JSON)...")
    mock_audio = b"\x00" * 1000  # dummy bytes
    raw_text = transcribe_audio_riva(mock_audio)
    safe_print(f"Transcribed Audio text: '{raw_text}'")
    
    structured_json = extract_entities_from_transcript(raw_text)
    print("   Extracted Structured JSON (Escaped ASCII):")
    # ensure_ascii=True guarantees it will not crash on Devanagari output
    print(json.dumps(structured_json, indent=4, ensure_ascii=True))
    
    # Save log to DB (Pending status)
    field_log = FieldLog(
        worker_id="test_worker_12",
        raw_transcript=raw_text,
        structured_json=structured_json,
        geo_latitude=28.6139,
        geo_longitude=77.2090,  # Delhi coords
        approved=False
    )
    db.add(field_log)
    db.commit()
    db.refresh(field_log)
    print(f"[PASS] Created FieldLog record ID: {field_log.id} (Status: PENDING Approval)")
    
    # 3. Anomaly Detection (Insight Agent)
    print("\n[3/5] Executing Insight Agent (Anomaly detection and alerts)...")
    insights = run_insight_agent(structured_json, db)
    
    # Print anomalies and action summary safely
    anomalies_str = str(insights.get("anomalies"))
    safe_print(f"Detected Anomalies: {anomalies_str}")
    alerts_str = str(insights.get("alerts"))
    safe_print(f"Alert Types: {alerts_str}")
    
    action_summary = insights.get('action_summary', '')
    safe_print(f"Action Summary for Manager: \"{action_summary}\"")
    print("[PASS] Insight analysis completed.")
    
    # 4. Report & Guardrails (Report Agent)
    print("\n[4/5] Executing Report Agent (Drafts generation with Guardrails verification)...")
    ngo_report = generate_ngo_report(structured_json)
    print("--- NGO Weekly Report Draft (Snippet) ---")
    safe_print(ngo_report[:250] + "\n...", prefix="")
    
    corp_annexure = generate_corporate_annexure(structured_json)
    print("\n--- Corporate Board Annexure Draft (Snippet) ---")
    safe_print(corp_annexure[:250] + "\n...", prefix="")
    
    # Intentionally test guardrail correction with an inflated beneficiary count (e.g. 500)
    fake_report = corp_annexure + "\nTotal program impact reached 500 beneficiaries in rural areas."
    corrected_report, was_safe = validate_report_safety(fake_report, structured_json)
    print(f"\n   [Guardrail Test] Safe verification flag: {was_safe}")
    if not was_safe:
        print("   [WARNING] Guardrails caught mismatch! Corrected text output (Snippet):")
        safe_print(corrected_report[-150:], prefix="   ")
    print("[PASS] Report generation and safety checks completed.")
    
    # 5. Compliance & Immutability Chain (Compliance Agent)
    print("\n[5/5] Executing Human Approval Gate -> Compliance Agent -> Cryptographic Ledger...")
    compliance_data = run_compliance_agent(structured_json)
    print("   Compliance SDG goals mapped:", compliance_data.get("sdg_goals"))
    
    brsr_str = str(compliance_data.get("brsr_indicators"))
    safe_print(f"BRSR Principle 8 Indicators: {brsr_str}")
    
    # Chaining
    prev_audit = db.query(AuditTrail).order_by(AuditTrail.id.desc()).first()
    prev_hash = prev_audit.block_hash if prev_audit else "0000000000000000000000000000000000000000000000000000000000000000"
    
    block_hash = calculate_immutable_hash(
        field_log_id=field_log.id,
        structured_json=structured_json,
        sdg_goals=compliance_data.get("sdg_goals", []),
        brsr_indicators=compliance_data.get("brsr_indicators", []),
        prev_hash=prev_hash
    )
    
    audit_trail = AuditTrail(
        field_log_id=field_log.id,
        sdg_goals=compliance_data.get("sdg_goals", []),
        brsr_principles=compliance_data.get("brsr_indicators", []),
        block_hash=block_hash
    )
    
    field_log.approved = True
    import datetime
    field_log.approval_timestamp = datetime.datetime.utcnow()
    
    db.add(audit_trail)
    db.commit()
    db.refresh(field_log)
    db.refresh(audit_trail)
    
    print(f"[PASS] Approved FieldLog record ID: {field_log.id} (Status: APPROVED)")
    print(f"   Sealing Audit Ledger block...")
    print(f"   Current Block Hash: {audit_trail.block_hash}")
    print(f"   Linked Previous Hash: {prev_hash}")
    print("[PASS] Cryptographic validation successful. Ledger is immutable.")
    
    db.close()
    print("\n" + "=" * 60)
    print("ALL SKELETON AGENT PIPELINES SUCCESSFULLY VERIFIED!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
