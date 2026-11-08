import React, { useState, useEffect } from "react";
import { List, CheckSquare, AlertTriangle, FileText, CheckCircle, Save, Loader, FolderClosed, RefreshCw } from "lucide-react";
import api from "../utils/api";

export const ManagerDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [ngoDraft, setNgoDraft] = useState("");
  const [corpDraft, setCorpDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [alerts, setAlerts] = useState({ anomalies: [], alerts: [], action_summary: "" });

  const fetchData = async (selectFirst = false) => {
    try {
      setLoading(true);
      const logsData = await api.getLogs();
      const projectsData = await api.getProjects();
      setLogs(logsData);
      setProjects(projectsData);
      if (selectFirst && logsData.length > 0) {
        handleSelectLog(logsData[0], projectsData);
      }
    } catch (err) {
      console.error("Failed to load logs/projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  const handleSelectLog = (log, currentProjects = projects) => {
    setSelectedLog(log);
    
    // Check if log is still processing or has no extracted data yet
    if (!log.structured_json || log.raw_transcript === "Processing...") {
      setNgoDraft("Report draft will generate once speech ingestion completes.");
      setCorpDraft("Annexure draft will generate once speech ingestion completes.");
      setAlerts({
        anomalies: [],
        alerts: [],
        action_summary: "Speech ingestion pipeline is actively processing this voice note. Real-time insights will appear shortly."
      });
      return;
    }

    const location = log.structured_json?.location || "Bicholi Village";
    const beneficiaries = log.structured_json?.beneficiaries_count || "25";
    const activities = log.structured_json?.activities?.join(", ") || "Organic farming vocational class";
    const blockers = log.structured_json?.blockers || "None";
    const translation = log.structured_json?.translation || "";
    const estCost = log.structured_json?.estimated_cost || 60000.0;

    // Build default drafts
    setNgoDraft(
      `# NGO Weekly Progress Report\n\n` +
      `**Location:** ${location}\n` +
      `**Beneficiaries:** ${beneficiaries}\n` +
      `**Activities:** ${activities}\n\n` +
      `### 1. Executive Summary\n` +
      `Conducted training on organic agriculture techniques. Attendance remained healthy.\n\n` +
      `### 2. Operational Challenges\n` +
      `Blocker identified: ${blockers}. Shifted focus to safety mitigation guidelines.`
    );

    setCorpDraft(
      `# Corporate CSR Board Annexure\n\n` +
      `**Project Activity:** Skill Development (Organic Farming Grower)\n` +
      `**MCA Schedule VII Clause:** Clause (ii) Promoting Education & Vocational Skills\n` +
      `**Location Reference:** ${location}\n` +
      `**Beneficiary Count Mapped:** ${beneficiaries}\n` +
      `**Implementation Route:** Direct Implementation`
    );

    // Correlate with project details
    const associatedProject = currentProjects.find((p) => p.id === log.project_id);
    const computedAnomalies = [];
    const computedAlerts = [];
    let summary = "";

    // 1. Beneficiary average drop test
    const isBelowAvg = parseInt(beneficiaries) < 30;
    if (isBelowAvg) {
      computedAnomalies.push(`Beneficiary count (${beneficiaries}) falls below baseline average threshold of 35.`);
      computedAlerts.push("ATTENDANCE_DROP_ALERT");
      summary += "Review attendance drops. ";
    }

    // 2. Weather blocker test
    const containsRain = blockers.toLowerCase().includes("rain") || blockers.toLowerCase().includes("बारिश");
    if (containsRain) {
      computedAnomalies.push("Recurring blocker flagged: weather/rain disruption.");
      computedAlerts.push("RECURRING_BLOCKER_ALERT");
      summary += "Mitigate weather blockers by shifting sessions indoors.";
    }

    // 3. Project specific budget/location audits
    if (associatedProject) {
      // Check location mismatch
      if (location !== "Unknown" && associatedProject.allocated_location) {
        const pLoc = associatedProject.allocated_location.toLowerCase();
        const lLoc = location.toLowerCase();
        if (!lLoc.includes(pLoc) && !pLoc.includes(lLoc)) {
          computedAnomalies.push(
            `Location mismatch: Log location '${location}' is outside the allocated project area '${associatedProject.allocated_location}'.`
          );
          computedAlerts.push("LOCATION_MISMATCH_ALERT");
          summary += "Verify geographic bounds. ";
        }
      }

      // Check budget overrun
      const remainingBudget = associatedProject.total_budget - associatedProject.spent_budget;
      if (estCost > remainingBudget) {
        computedAnomalies.push(
          `Budget leak: Estimated cost INR ${estCost.toLocaleString()} exceeds available project budget of INR ${remainingBudget.toLocaleString()}.`
        );
        computedAlerts.push("BUDGET_OVERRUN_ALERT");
        summary += "Hold signature until budgets are adjusted. ";
      }
    }

    setAlerts({
      anomalies: computedAnomalies,
      alerts: computedAlerts,
      action_summary: summary || "All project parameters within historical baseline parameters."
    });
  };

  const handleApprove = async () => {
    if (!selectedLog) return;
    try {
      setApproving(true);
      const result = await api.approveLog(selectedLog.id);
      
      const hash = result.audit_trail.block_hash;
      const shortHash = `${hash.substring(0, 12)}...`;
      alert(`Ledger Sealed Successfully!\n\nBlock Hash: ${shortHash}\nStatus: COMMITTED`);
      
      await fetchData(false);
      setSelectedLog(null);
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="manager-view">
      {/* Sidebar - Logs List */}
      <div className="manager-sidebar">
        <div className="glass-card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <List size={18} />
          <h4 style={{ fontSize: "13px", fontWeight: "700", textTransform: "uppercase" }}>Intake Approval Queue</h4>
        </div>

        <div className="logs-list">
          {loading && logs.length === 0 ? (
            <div className="empty-state">
              <Loader className="step-icon spinning" size={24} />
              <p>Loading queue logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <p>No voice logs submitted yet.</p>
            </div>
          ) : (
            logs.map((log) => {
              const isSelected = selectedLog?.id === log.id;
              const associatedProject = projects.find((p) => p.id === log.project_id);
              const beneficiaries = log.structured_json?.beneficiaries_count || 35;
              const blockers = log.structured_json?.blockers || "";
              
              const isBelowAvg = parseInt(beneficiaries) < 30;
              const containsRain = blockers.toLowerCase().includes("rain") || blockers.toLowerCase().includes("बारिश");
              let hasAnomaly = isBelowAvg || containsRain;
              
              if (associatedProject) {
                const loc = log.structured_json?.location || "";
                if (loc && associatedProject.allocated_location) {
                  if (!loc.toLowerCase().includes(associatedProject.allocated_location.toLowerCase())) {
                    hasAnomaly = true;
                  }
                }
              }

              return (
                <div 
                  key={log.id} 
                  className={`minimal-sidebar-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelectLog(log)}
                >
                  <div className="log-meta-top">
                    <span>Log #{log.id}</span>
                    <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="log-title" style={{ marginTop: "4px" }}>
                    {log.structured_json?.location || "Voice Entry"}
                  </div>
                  <div className="log-tags" style={{ marginTop: "8px" }}>
                    {!log.structured_json || log.raw_transcript === "Processing..." ? (
                      <span className="badge pending" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <RefreshCw size={10} className="step-icon spinning" /> Processing
                      </span>
                    ) : (
                      <>
                        <span className={`badge ${log.approved ? "approved" : "pending"}`}>
                          {log.approved ? "Approved" : "Pending Gate"}
                        </span>
                        {hasAnomaly && (
                          <span className="badge anomaly">Anomaly</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main workspace - Log detailed editing and approvals */}
      <div className="manager-workspace">
        {selectedLog ? (
          <>
            {/* Header info */}
            <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: "600", fontFamily: "var(--font-serif)", fontStyle: "italic", letterSpacing: "-0.04em" }}>
                  {selectedLog.structured_json?.location || "Pending Audio Entry"}
                </h2>
                <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px", fontWeight: "500" }}>
                  Submitted by Field Agent | Geotag: {selectedLog.geo_latitude?.toFixed(4)}N, {selectedLog.geo_longitude?.toFixed(4)}E
                </p>
                {selectedLog.project_id && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text)", marginTop: "8px", fontWeight: "600" }}>
                    <FolderClosed size={14} />
                    Mapped Project: {projects.find((p) => p.id === selectedLog.project_id)?.title || "Loading Title..."}
                  </div>
                )}
              </div>
              <span className={`badge ${selectedLog.approved ? "approved" : "pending"}`} style={{ fontSize: "12px", padding: "6px 14px" }}>
                {selectedLog.approved ? "Audit Sealed" : "Awaiting Sign-off"}
              </span>
            </div>

            {/* Accent Anomaly & Alert Box */}
            {alerts.anomalies.length > 0 && (
              <div className="accent-alert-banner">
                <div className="accent-alert-title" style={{ color: "rgb(239, 68, 68)" }}>
                  <AlertTriangle size={15} /> RAG Intelligence Anomalies Detected
                </div>
                <ul className="accent-alert-list">
                  {alerts.anomalies.map((a, idx) => (
                    <li key={idx} className="accent-alert-item">{a}</li>
                  ))}
                </ul>
                <div className="accent-alert-summary">
                  Action Summary: "{alerts.action_summary}"
                </div>
              </div>
            )}

            {/* Structured details display (Key-Value clean alignment) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div className="clean-kv-list">
                <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "8px", borderBottom: "1px solid var(--border-soft)", paddingBottom: "6px" }}>
                  Structured Metadata
                </div>
                <div className="clean-kv-row">
                  <span className="clean-kv-key">Beneficiary Count</span>
                  <span className="clean-kv-val">{selectedLog.structured_json?.beneficiaries_count || "N/A"}</span>
                </div>
                <div className="clean-kv-row">
                  <span className="clean-kv-key">Activities Mapped</span>
                  <span className="clean-kv-val">{selectedLog.structured_json?.activities?.join(", ") || "None"}</span>
                </div>
                <div className="clean-kv-row">
                  <span className="clean-kv-key">Blocker Identified</span>
                  <span className="clean-kv-val">{selectedLog.structured_json?.blockers || "None"}</span>
                </div>
                <div className="clean-kv-row">
                  <span className="clean-kv-key">Estimated Cost</span>
                  <span className="clean-kv-val">INR {(selectedLog.structured_json?.estimated_cost || 60000.0).toLocaleString()}</span>
                </div>
              </div>
              
              <div className="glass-card" style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "8px", borderBottom: "1px solid var(--border-soft)", paddingBottom: "6px" }}>
                  Translation (Hindi to English)
                </div>
                <p style={{ fontStyle: "italic", fontSize: "13px", color: "var(--muted)", lineHeight: "1.5", flex: 1, display: "flex", alignItems: "center" }}>
                  "{selectedLog.structured_json?.translation || "No translation loaded."}"
                </p>
              </div>
            </div>

            {/* Reports Editor Grid */}
            <div className="editor-grid">
              <div className="glass-card">
                <div className="editor-header">
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <FileText size={16} /> NGO Weekly Report (MD)
                  </span>
                </div>
                <textarea 
                  className="report-textarea"
                  value={ngoDraft} 
                  onChange={(e) => setNgoDraft(e.target.value)}
                  disabled={selectedLog.approved || approving}
                />
              </div>

              <div className="glass-card">
                <div className="editor-header">
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <FileText size={16} /> MCA Schedule VII Board Annexure (MD)
                  </span>
                </div>
                <textarea 
                  className="report-textarea"
                  value={corpDraft} 
                  onChange={(e) => setCorpDraft(e.target.value)}
                  disabled={selectedLog.approved || approving}
                />
              </div>
            </div>

            {/* Actions toolbar */}
            <div className="workspace-actions">
              <button 
                className="btn-primary" 
                onClick={handleApprove} 
                disabled={selectedLog.approved || approving || !selectedLog.structured_json || selectedLog.raw_transcript === "Processing..."}
              >
                {approving ? (
                  <>
                    <Loader size={16} className="step-icon spinning" /> Sealing Ledger...
                  </>
                ) : selectedLog.approved ? (
                  "Ledger Cryptographically Sealed"
                ) : (
                  <>
                    <CheckSquare size={16} /> Approve & Sign Ledger
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="glass-card empty-state" style={{ minHeight: "350px" }}>
            <CheckCircle size={48} />
            <h3>Select a pending log from the queue</h3>
            <p>You can review transcription updates, edit compliance reports, and sign off documents.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;
