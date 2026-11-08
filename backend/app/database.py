import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from app.config import settings

# For SQLite compatibility with JSON, we configure the database connection
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    mca_clause = Column(String, nullable=True)
    total_budget = Column(Float, default=0.0)
    spent_budget = Column(Float, default=0.0)
    allocated_location = Column(String, nullable=True)  # e.g., "Bicholi Village"
    
    field_logs = relationship("FieldLog", back_populates="project")

class FieldLog(Base):
    __tablename__ = "field_logs"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(String, index=True, default="unknown_worker")
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    raw_transcript = Column(String, nullable=True)
    structured_json = Column(JSON, nullable=True)  # {beneficiaries_count: int, activities: List[str], location: str, blockers: str, estimated_cost: float}
    geo_latitude = Column(Float, nullable=True)
    geo_longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Human Approval Gate
    approved = Column(Boolean, default=False)
    approval_timestamp = Column(DateTime, nullable=True)
    
    project = relationship("Project", back_populates="field_logs")
    audit_trails = relationship("AuditTrail", back_populates="field_log", cascade="all, delete-orphan")

class AuditTrail(Base):
    __tablename__ = "audit_trails"

    id = Column(Integer, primary_key=True, index=True)
    field_log_id = Column(Integer, ForeignKey("field_logs.id", ondelete="CASCADE"), nullable=False)
    sdg_goals = Column(JSON, nullable=True)          # e.g., [1, 3, 6]
    brsr_principles = Column(JSON, nullable=True)    # e.g., ["Principle 8"]
    block_hash = Column(String, unique=True, index=True) # Immutable link hash (SHA-256 of log contents + previous hash)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    field_log = relationship("FieldLog", back_populates="audit_trails")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
