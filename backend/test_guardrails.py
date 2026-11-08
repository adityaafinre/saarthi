import os
import sys
import json

# Force environment variable override BEFORE importing SQLAlchemy engine / DB session
os.environ["DATABASE_URL"] = "sqlite:///./test_sarthi.db"

# Delete any existing test database file
test_db = "test_sarthi.db"
if os.path.exists(test_db):
    try:
        os.remove(test_db)
        print(f"Removed previous test database: {test_db}")
    except Exception as e:
        print(f"Warning: Could not remove previous test database file: {e}")

# Add project root to path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.database import init_db, SessionLocal, Project, FieldLog, AuditTrail
from app.agents.insight import run_insight_agent
from app.agents.report import validate_report_safety
from app.agents.compliance import calculate_immutable_hash
from app.utils.document_generator import generate_compliance_package_text, generate_compliance_package_html

def safe_print(text: str, prefix: str = "   "):
    clean_text = text.encode('ascii', errors='replace').decode('ascii')
    print(f"{prefix}{clean_text}")

def run_guardrails_tests():
    print("=" * 60)
    print("STARTING SARTHI PHASE 3 GUARDRAILS & PROJECT LEDGER TEST")
    print("=" * 60)
    
    init_db()
    db = SessionLocal()
    
    # 1. Register a Mock Corporate CSR Project
    print("\n[1/4] Registering Corporate CSR Project...")
    project = Project(
        title="Organic Agri-Vocational Training",
        mca_clause="Clause (ii) Education and Livelihoods",
        total_budget=100000.0,  # Budget: ₹1,00,000
        spent_budget=0.0,
        allocated_location="Bicholi Village"
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    print(f"[PASS] Project registered: '{project.title}' | ID: {project.id} | Budget: INR {project.total_budget:,.2f}")
    
    # 2. Test Case: Insight Agent Location & Budget Overrun Detection
    print("\n[2/4] Executing Insight Agent (Location & Budget checks)...")
    current_log = {
        "project_id": project.id,
        "beneficiaries_count": 25,
        "activities": ["Vocational Skills in Farming"],
        "location": "Rampur Village",      # Location Mismatch! (Expected Bicholi Village)
        "blockers": "None",
        "estimated_cost": 120000.0,        # Budget Overrun! (Exceeds ₹1,00,000)
        "translation": "Organic farming session conducted."
    }
    
    insights = run_insight_agent(current_log, db)
    print("   Detected Anomalies:")
    for anomaly in insights.get("anomalies", []):
        safe_print(anomaly, prefix="     - ")
        
    print("   Alert Flags:", insights.get("alerts"))
    
    # Assert alert flags are triggered
    assert "LOCATION_MISMATCH_ALERT" in insights.get("alerts")
    assert "BUDGET_OVERRUN_ALERT" in insights.get("alerts")
    print("[PASS] Insight agent successfully identified scope and budget overruns.")
    
    # 3. Test Case: Report Agent Guardrails Checks
    print("\n[3/4] Testing Report Agent Guardrail Checks...")
    # Simulate a generated draft with mismatches
    hallucinated_text = (
        "The project conducted organic training in Rampur Village. "
        "The total program expenses registered were INR 120,000 for 25 beneficiaries."
    )
    
    project_constraints = {
        "title": project.title,
        "allocated_location": project.allocated_location,
        "total_budget": project.total_budget
    }
    
    corrected_text, was_safe = validate_report_safety(
        hallucinated_text, 
        current_log, 
        project_constraints
    )
    
    print(f"   Safe validation check: {was_safe}")
    print("   Original Hallucinated Text:")
    safe_print(hallucinated_text, prefix="     ")
    print("   Corrected Guardrail Output:")
    safe_print(corrected_text, prefix="     ")
    
    # Assertions for budget limit correction and location substitution
    assert "INR 100,000.00 (budget capped)" in corrected_text
    assert "Bicholi Village (verified project area)" in corrected_text
    print("[PASS] Guardrails successfully scrubbed and corrected hallucinations.")
    
    # 4. Test Case: Human Approval & Compliance Documents Exports
    print("\n[4/4] Signing Off Audit and Exporting Compliance Package...")
    
    # Create Field Log
    field_log = FieldLog(
        worker_id="test_agent_3",
        project_id=project.id,
        raw_transcript="आज हमने रामपुर में ट्रेनिंग दी और १२०००० रूपये खर्च किये।",
        structured_json=current_log,
        geo_latitude=28.7041,
        geo_longitude=77.1025,
        approved=False
    )
    db.add(field_log)
    db.commit()
    db.refresh(field_log)
    
    # Create audit record
    prev_hash = "0000000000000000000000000000000000000000000000000000000000000000"
    block_hash = calculate_immutable_hash(
        field_log_id=field_log.id,
        structured_json=current_log,
        sdg_goals=[4, 8],
        brsr_indicators=["Principle 8 - Inclusive Development"],
        prev_hash=prev_hash
    )
    
    audit = AuditTrail(
        field_log_id=field_log.id,
        sdg_goals=[4, 8],
        brsr_principles=["Principle 8 - Inclusive Development"],
        block_hash=block_hash
    )
    db.add(audit)
    
    field_log.approved = True
    project.spent_budget += current_log["estimated_cost"]
    
    db.commit()
    db.refresh(project)
    db.refresh(audit)
    db.refresh(field_log)
    
    print(f"   [Ledger Update] Project Spent Budget: INR {project.spent_budget:,.2f}")
    print(f"   [Ledger Update] Audit Block Sealed Hash: {audit.block_hash}")
    
    # Generate certificate exports
    txt_doc = generate_compliance_package_text(field_log, audit)
    html_doc = generate_compliance_package_html(field_log, audit)
    
    # Save test certificates to disk specifying utf-8 encoding
    out_txt = "./test_audit_cert.txt"
    out_html = "./test_audit_cert.html"
    with open(out_txt, "w", encoding="utf-8") as f:
        f.write(txt_doc)
    with open(out_html, "w", encoding="utf-8") as f:
        f.write(html_doc)
        
    print(f"[PASS] Compliance certificate saved to '{out_txt}' and '{out_html}'")
    
    db.close()
    print("\n" + "=" * 60)
    print("ALL PHASE 3 ENHANCEMENTS AND GUARDRAILS SUCCESSFULLY VERIFIED!")
    print("=" * 60)

if __name__ == "__main__":
    run_guardrails_tests()
