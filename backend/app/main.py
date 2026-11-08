import os
import json
import logging
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import asyncio

from app.config import settings
from app.database import init_db, get_db, FieldLog, AuditTrail, Project, SessionLocal
from app.agents.voice_intake import transcribe_audio_riva, extract_entities_from_transcript
from app.agents.insight import run_insight_agent
from app.agents.report import generate_ngo_report, generate_corporate_annexure, validate_report_safety
from app.agents.compliance import run_compliance_agent, calculate_immutable_hash
from app.utils.document_generator import generate_compliance_package_text, generate_compliance_package_html

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# Initialize database
init_db()

app = FastAPI(
    title="Sarthi Field Intelligence API",
    description="Voice-First Agentic Compliance Platform for Corporate CSR",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "platform": "Sarthi API",
        "status": "active",
        "version": "1.1.0"
    }

@app.post("/api/projects", status_code=status.HTTP_201_CREATED)
def create_project(
    title: str = Form(...),
    mca_clause: str = Form("Clause (ii) Vocational Skills"),
    total_budget: float = Form(...),
    allocated_location: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Registers a new Corporate CSR project and sets the compliance budget cap.
    """
    try:
        project = Project(
            title=title,
            mca_clause=mca_clause,
            total_budget=total_budget,
            allocated_location=allocated_location,
            spent_budget=0.0
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        logger.info(f"Registered Project ID: {project.id} Title: {project.title}")
        return project
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create project: {e}")

@app.get("/api/projects")
def list_projects(db: Session = Depends(get_db)):
    """
    Returns registered CSR Projects.
    """
    return db.query(Project).all()

@app.post("/api/voice/upload", status_code=status.HTTP_201_CREATED)
async def upload_voice_log(
    audio: UploadFile = File(...),
    latitude: float = Form(None),
    longitude: float = Form(None),
    worker_id: str = Form("worker_01"),
    project_id: int = Form(None),
    client_transcript: str = Form(None),
    db: Session = Depends(get_db)
):
    """
    Accepts Hindi voice note upload. Connects to project mapping framework.
    """
    try:
        content = await audio.read()
        
        # Verify project exists if passed
        if project_id:
            p = db.query(Project).filter(Project.id == project_id).first()
            if not p:
                logger.warning(f"Associated Project ID {project_id} not found. Defaulting to standalone.")
                project_id = None
                
        # Create database log record
        log_record = FieldLog(
            worker_id=worker_id,
            project_id=project_id,
            raw_transcript=client_transcript or "Processing...",
            geo_latitude=latitude,
            geo_longitude=longitude,
            approved=False
        )
        db.add(log_record)
        db.commit()
        db.refresh(log_record)
        
        # Save temp audio file
        temp_dir = "./temp_audio"
        os.makedirs(temp_dir, exist_ok=True)
        
        # Save the raw uploaded file with correct extension
        temp_raw_path = os.path.join(temp_dir, f"audio_{log_record.id}.webm")
        with open(temp_raw_path, "wb") as f:
            f.write(content)
            
        temp_file_path = os.path.join(temp_dir, f"audio_{log_record.id}.wav")
        try:
            import subprocess
            # Transcode WebM to standard WAV PCM 16kHz Mono using ffmpeg
            cmd = ["ffmpeg", "-y", "-i", temp_raw_path, "-acodec", "pcm_s16le", "-ac", "1", "-ar", "16000", temp_file_path]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            logger.info(f"Transcoded raw upload to standard WAV PCM: {temp_file_path}")
        except Exception as e:
            logger.warning(f"Could not transcode audio file using ffmpeg: {e}. Falling back to raw write.")
            # Fallback to copy raw bytes to the wav path (backward-compatible)
            with open(temp_file_path, "wb") as f:
                f.write(content)
            
        logger.info(f"Received audio upload. Created log ID: {log_record.id}")
        return {
            "success": True,
            "log_id": log_record.id,
            "temp_file": temp_file_path
        }
    except Exception as e:
        logger.error(f"Failed to upload audio: {e}")
        raise HTTPException(status_code=500, detail=f"Audio upload failure: {e}")

@app.get("/api/voice/process-stream/{log_id}")
async def process_stream(log_id: int):
    """
    SSE stream orchestrating the multi-agent CSR compliance mapping flow.
    Integrates Project budgets and multi-fact validation guardrails.
    """
    init_db_session = SessionLocal()
    try:
        log_record = init_db_session.query(FieldLog).filter(FieldLog.id == log_id).first()
        if not log_record:
            raise HTTPException(status_code=404, detail="Log record not found")
            
        project_id = log_record.project_id
        project_constraints = None
        if project_id:
            project = init_db_session.query(Project).filter(Project.id == project_id).first()
            if project:
                project_constraints = {
                    "title": project.title,
                    "allocated_location": project.allocated_location,
                    "total_budget": project.total_budget
                }
    finally:
        init_db_session.close()
        
    temp_file_path = f"./temp_audio/audio_{log_id}.wav"
            
    async def sse_generator():
        generator_db = SessionLocal()
        try:
            # 1. Riva STT Transcribing
            yield f"data: {json.dumps({'step': 'Riva STT', 'status': 'processing', 'message': 'Checking voice transcription...'})}\n\n"
            await asyncio.sleep(1)
            
            log_rec = generator_db.query(FieldLog).filter(FieldLog.id == log_id).first()
            if not log_rec:
                raise Exception("Log record not found during processing")
            
            if log_rec.raw_transcript and log_rec.raw_transcript != "Processing...":
                transcript = log_rec.raw_transcript
                logger.info(f"Using client-provided voice transcription: {transcript}")
                yield f"data: {json.dumps({'step': 'Riva STT', 'status': 'completed', 'data': {'transcript': transcript}, 'message': 'Using real-time browser transcription.'})}\n\n"
            else:
                audio_bytes = b""
                if os.path.exists(temp_file_path):
                    with open(temp_file_path, "rb") as f:
                        audio_bytes = f.read()
                
                transcript = transcribe_audio_riva(audio_bytes)
                log_rec.raw_transcript = transcript
                generator_db.commit()
                yield f"data: {json.dumps({'step': 'Riva STT', 'status': 'completed', 'data': {'transcript': transcript}, 'message': 'Speech transcription finished.'})}\n\n"
            await asyncio.sleep(1)
            
            # 2. Entity Extraction
            yield f"data: {json.dumps({'step': 'Voice Intake Agent', 'status': 'processing', 'message': 'Extracting entities using NIM...'})}\n\n"
            await asyncio.sleep(1)
            
            structured_data = extract_entities_from_transcript(transcript)
            
            # Attach project tracking figures to the payload
            structured_data["project_id"] = log_rec.project_id
            # Simulated estimate cost of field vocational work: INR 60,000
            structured_data["estimated_cost"] = 60000.0
            
            log_rec.structured_json = structured_data
            generator_db.commit()
            
            yield f"data: {json.dumps({'step': 'Voice Intake Agent', 'status': 'completed', 'data': structured_data, 'message': 'Structured JSON field log generated.'})}\n\n"
            await asyncio.sleep(1)
            
            # 3. Anomaly Detection (Insight Agent)
            yield f"data: {json.dumps({'step': 'Insight Agent', 'status': 'processing', 'message': 'Running budget and statistical anomaly checks...'})}\n\n"
            await asyncio.sleep(1)
            
            insight_result = run_insight_agent(structured_data, generator_db)
            
            yield f"data: {json.dumps({'step': 'Insight Agent', 'status': 'completed', 'data': insight_result, 'message': 'Anomaly analysis complete.'})}\n\n"
            await asyncio.sleep(1)
            
            # 4. Report Agent (Drafts generation with Guardrails verification)
            yield f"data: {json.dumps({'step': 'Report Agent', 'status': 'processing', 'message': 'Drafting reports and executing compliance guardrails...'})}\n\n"
            await asyncio.sleep(1)
            
            ngo_report = generate_ngo_report(structured_data)
            corporate_annexure = generate_corporate_annexure(structured_data)
            
            # Run Guardrails validation with Project constraints
            validated_annexure, is_safe = validate_report_safety(corporate_annexure, structured_data, project_constraints)
            
            yield f"data: {json.dumps({'step': 'Report Agent', 'status': 'completed', 'data': {'ngo_report': ngo_report, 'corporate_annexure': validated_annexure, 'guardrails_triggered': not is_safe}, 'message': 'Draft reports finalized.'})}\n\n"
            await asyncio.sleep(1)
            
            yield f"data: {json.dumps({'step': 'Human Approval Gate', 'status': 'pending', 'message': 'Awaiting NGO Manager gate review.'})}\n\n"
            
        except Exception as e:
            logger.error(f"SSE pipeline crashed: {e}")
            yield f"data: {json.dumps({'step': 'Pipeline Error', 'status': 'failed', 'message': f'Failure: {str(e)}'})}\n\n"
        finally:
            generator_db.close()
            
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@app.post("/api/logs/{log_id}/approve")
def approve_field_log(log_id: int, db: Session = Depends(get_db)):
    """
    Approves the field entry and commits expenditure balances to the Project ledger.
    """
    log_record = db.query(FieldLog).filter(FieldLog.id == log_id).first()
    if not log_record:
        raise HTTPException(status_code=404, detail="Log record not found")
        
    if log_record.approved:
        return {"message": "Log already approved", "log": log_record}
        
    try:
        structured_json = log_record.structured_json or {}
        compliance_data = run_compliance_agent(structured_json)
        
        sdg_goals = compliance_data.get("sdg_goals", [])
        brsr_indicators = compliance_data.get("brsr_indicators", [])
        
        # Cryptographic link hash calculation
        prev_audit = db.query(AuditTrail).order_by(AuditTrail.id.desc()).first()
        prev_hash = prev_audit.block_hash if prev_audit else "0000000000000000000000000000000000000000000000000000000000000000"
        
        block_hash = calculate_immutable_hash(
            field_log_id=log_record.id,
            structured_json=structured_json,
            sdg_goals=sdg_goals,
            brsr_indicators=brsr_indicators,
            prev_hash=prev_hash
        )
        
        # Save Audit Trail block
        audit_record = AuditTrail(
            field_log_id=log_record.id,
            sdg_goals=sdg_goals,
            brsr_principles=brsr_indicators,
            block_hash=block_hash
        )
        
        # Commit log record approval
        log_record.approved = True
        import datetime
        log_record.approval_timestamp = datetime.datetime.utcnow()
        
        # Accrue project expenditures if mapped
        if log_record.project_id:
            project = db.query(Project).filter(Project.id == log_record.project_id).first()
            if project:
                est_cost = structured_json.get("estimated_cost", 60000.0)
                project.spent_budget += est_cost
                logger.info(f"Accrued INR {est_cost:,.2f} on Project ID: {project.id}")
        
        db.add(audit_record)
        db.commit()
        db.refresh(log_record)
        db.refresh(audit_record)
        
        return {
            "success": True,
            "compliance_mapping": compliance_data,
            "audit_trail": {
                "id": audit_record.id,
                "block_hash": audit_record.block_hash,
                "prev_hash": prev_hash
            }
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Approval gate failure for log {log_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Gate execution failed: {e}")

@app.get("/api/logs/{log_id}/export")
def export_compliance_document(
    log_id: int,
    format: str = "text",
    db: Session = Depends(get_db)
):
    """
    Generates and returns the compliance package document in Text or HTML formats.
    """
    log_record = db.query(FieldLog).filter(FieldLog.id == log_id).first()
    if not log_record:
        raise HTTPException(status_code=404, detail="Field log not found")
        
    if not log_record.approved:
        raise HTTPException(status_code=400, detail="Document cannot be exported. Ledger signature is missing (Pending approval).")
        
    audit_record = db.query(AuditTrail).filter(AuditTrail.field_log_id == log_id).first()
    if not audit_record:
        raise HTTPException(status_code=404, detail="Audit trail block not found")
        
    if format.lower() == "html":
        content = generate_compliance_package_html(log_record, audit_record)
        return Response(
            content=content,
            media_type="text/html",
            headers={"Content-Disposition": f"attachment; filename=Sarthi_Audit_Certificate_{log_id}.html"}
        )
    else:
        content = generate_compliance_package_text(log_record, audit_record)
        return Response(
            content=content,
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=Sarthi_Audit_Package_{log_id}.txt"}
        )

@app.get("/api/logs")
def list_logs(db: Session = Depends(get_db)):
    return db.query(FieldLog).order_by(FieldLog.timestamp.desc()).all()

@app.get("/api/audit")
def list_audit_trail(db: Session = Depends(get_db)):
    return db.query(AuditTrail).order_by(AuditTrail.id.desc()).all()
