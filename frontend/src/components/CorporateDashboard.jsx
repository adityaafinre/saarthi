import React, { useState, useEffect } from "react";
import { Shield, Users, Database, Lock, Globe, FileText, PlusCircle, Award } from "lucide-react";
import api from "../utils/api";

export const CorporateDashboard = () => {
  const [auditTrail, setAuditTrail] = useState([]);
  const [logs, setLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Project registration form state
  const [newTitle, setNewTitle] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [newClause, setNewClause] = useState("Clause (ii) Vocational Skills");
  const [submittingProject, setSubmittingProject] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const auditData = await api.getAuditTrail();
      const logsData = await api.getLogs();
      const projectsData = await api.getProjects();
      setAuditTrail(auditData);
      setLogs(logsData);
      setProjects(projectsData);
    } catch (err) {
      console.error("Failed to load corporate audit data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newTitle || !newLocation || !newBudget) {
      alert("Please fill in all project fields");
      return;
    }

    try {
      setSubmittingProject(true);
      const budgetFloat = parseFloat(newBudget);
      await api.createProject(newTitle, newClause, budgetFloat, newLocation);
      
      setNewTitle("");
      setNewLocation("");
      setNewBudget("");
      alert("Project Registered Successfully!");
      await fetchData();
    } catch (err) {
      alert(`Failed to register project: ${err.message}`);
    } finally {
      setSubmittingProject(false);
    }
  };

  // Compute metrics based on database records
  const approvedLogs = logs.filter((l) => l.approved);
  const totalBeneficiaries = approvedLogs.reduce((sum, log) => {
    return sum + (log.structured_json?.beneficiaries_count || 0);
  }, 0);
  
  const uniqueLocations = new Set(approvedLogs.map((log) => log.structured_json?.location)).size;

  return (
    <div className="corporate-view">
      {/* Metrics Row (Monochrome SaaS style) */}
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper">
            <Users size={18} />
          </div>
          <div className="stat-info">
            <span className="stat-val">{totalBeneficiaries || 0}</span>
            <span className="stat-label">Beneficiaries Mapped</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper">
            <Globe size={18} />
          </div>
          <div className="stat-info">
            <span className="stat-val">{uniqueLocations || 0}</span>
            <span className="stat-label">Active Rural Areas</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper">
            <Shield size={18} />
          </div>
          <div className="stat-info">
            <span className="stat-val">{auditTrail.length || 0}</span>
            <span className="stat-label">Audit Blocks Sealed</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper">
            <Award size={18} />
          </div>
          <div className="stat-info">
            <span className="stat-val">100%</span>
            <span className="stat-label">MCA VII Compliance</span>
          </div>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="corporate-main-layout">
        
        {/* Left Column: Register Project + Progress Indicators */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Register New Project Form */}
          <div className="glass-card">
            <h3 style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text)", borderBottom: "1px solid var(--border-soft)", paddingBottom: "8px" }}>
              <PlusCircle size={15} />
              Register CSR Program
            </h3>
            
            <form onSubmit={handleCreateProject} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase" }}>Project Title</label>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Tribal Women Livelihood"
                  style={{ width: "100%", padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--border-soft)", borderRadius: "6px", color: "var(--text)", fontSize: "13px" }}
                  disabled={submittingProject}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase" }}>MCA Schedule VII Category</label>
                <select
                  value={newClause}
                  onChange={(e) => setNewClause(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--border-soft)", borderRadius: "6px", color: "var(--text)", fontSize: "13px" }}
                  disabled={submittingProject}
                >
                  <option value="Clause (i) Health and Sanitation">Clause (i) Health and Sanitation</option>
                  <option value="Clause (ii) Education and Livelihoods">Clause (ii) Education and Livelihoods</option>
                  <option value="Clause (iv) Environmental Stability">Clause (iv) Environmental Stability</option>
                  <option value="Clause (x) Rural Development">Clause (x) Rural Development</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase" }}>Total Budget (INR)</label>
                  <input 
                    type="number" 
                    value={newBudget} 
                    onChange={(e) => setNewBudget(e.target.value)}
                    placeholder="e.g., 100000"
                    style={{ width: "100%", padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--border-soft)", borderRadius: "6px", color: "var(--text)", fontSize: "13px" }}
                    disabled={submittingProject}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase" }}>Target Location</label>
                  <input 
                    type="text" 
                    value={newLocation} 
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g., Bicholi Village"
                    style={{ width: "100%", padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--border-soft)", borderRadius: "6px", color: "var(--text)", fontSize: "13px" }}
                    disabled={submittingProject}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: "100%", justifyContent: "center", padding: "10px 14px", fontSize: "13px", marginTop: "8px" }}
                disabled={submittingProject}
              >
                Register Program
              </button>
            </form>
          </div>

          {/* CSR Program Budget Progress Meters */}
          <div className="glass-card">
            <h3 style={{ marginBottom: "16px", fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text)", borderBottom: "1px solid var(--border-soft)", paddingBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Shield size={15} />
              Program Budget Trackers
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {projects.length === 0 ? (
                <p style={{ fontSize: "13px", color: "var(--muted)", textAlign: "center" }}>No projects registered.</p>
              ) : (
                projects.map((proj) => {
                  const percent = proj.total_budget > 0 ? (proj.spent_budget / proj.total_budget) * 100 : 0;
                  const isOver = proj.spent_budget > proj.total_budget;
                  return (
                    <div key={proj.id} style={{ fontSize: "13px" }}>
                      <div style={{ display: "flex", justifycontent: "space-between", justifyContent: "space-between", fontWeight: "700", marginBottom: "6px" }}>
                        <span>{proj.title}</span>
                        <span style={{ color: isOver ? "rgb(239, 68, 68)" : "var(--green)" }}>
                          {percent.toFixed(0)}%
                        </span>
                      </div>
                      
                      <div className="budget-progress-container">
                        <div className="budget-progress-bar-bg">
                          <div 
                            className={`budget-progress-bar-fill ${isOver ? "overrun" : ""}`}
                            style={{ 
                              width: `${Math.min(percent, 100)}%`, 
                            }}
                          />
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--muted)", fontWeight: "500", marginTop: "4px" }}>
                        <span>Loc: {proj.allocated_location}</span>
                        <span>INR {proj.spent_budget.toLocaleString()} / {proj.total_budget.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Ledger table */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <h3 style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text)", borderBottom: "1px solid var(--border-soft)", paddingBottom: "8px" }}>
            <Database size={15} />
            MCA Schedule VII Immutable Evidence Ledger
          </h3>
          
          <div className="table-wrapper">
            {loading && auditTrail.length === 0 ? (
              <p style={{ textAlign: "center", padding: "24px", fontSize: "13px", color: "var(--muted)" }}>Loading ledger database...</p>
            ) : auditTrail.length === 0 ? (
              <div className="empty-state">
                <Lock size={32} />
                <p>No transactions registered in the ledger yet.</p>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Block</th>
                    <th>Location / SDGs</th>
                    <th>BRSR Indicators</th>
                    <th>Cryptographic Block Hash</th>
                    <th>Audit Evidence Export</th>
                  </tr>
                </thead>
                <tbody>
                  {auditTrail.map((block) => {
                    const relativeLog = logs.find((l) => l.id === block.field_log_id);
                    const location = relativeLog?.structured_json?.location || "Delhi";
                    const formattedSDGs = block.sdg_goals ? block.sdg_goals.join(", ") : "N/A";
                    
                    return (
                      <tr key={block.id}>
                        <td>
                          <span style={{ fontWeight: 800 }}>#{block.id}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: "700" }}>{location}</div>
                          <span className="badge approved" style={{ marginTop: "4px", display: "inline-block", fontSize: "9px" }}>
                            SDG {formattedSDGs}
                          </span>
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--muted)", maxWidth: "160px", lineHeight: "1.4" }}>
                          {block.brsr_principles ? block.brsr_principles.join(", ") : "Principle 8"}
                        </td>
                        <td>
                          <div className="hash-cell" title={block.block_hash}>
                            <Lock size={11} style={{ color: "var(--text)", marginRight: "4px", display: "inline-block", verticalAlign: "middle" }} />
                            {block.block_hash ? `${block.block_hash.substring(0, 10)}...` : "N/A"}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <a 
                              href={`http://localhost:8000/api/logs/${block.field_log_id}/export?format=text`}
                              target="_blank"
                              rel="noreferrer"
                              className="card-nav-btn"
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 12px", fontSize: "11px", margin: 0, fontWeight: "600", textDecoration: "none" }}
                            >
                              <FileText size={12} /> Text
                            </a>
                            <a 
                              href={`http://localhost:8000/api/logs/${block.field_log_id}/export?format=html`}
                              target="_blank"
                              rel="noreferrer"
                              className="card-nav-btn"
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 12px", fontSize: "11px", margin: 0, fontWeight: "600", textDecoration: "none" }}
                            >
                              <FileText size={12} /> HTML
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorporateDashboard;
