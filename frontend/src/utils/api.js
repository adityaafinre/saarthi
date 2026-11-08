const API_BASE_URL = "http://localhost:8000";

export const api = {
  getLogs: async () => {
    const response = await fetch(`${API_BASE_URL}/api/logs`);
    if (!response.ok) throw new Error("Failed to fetch logs");
    return response.json();
  },

  getAuditTrail: async () => {
    const response = await fetch(`${API_BASE_URL}/api/audit`);
    if (!response.ok) throw new Error("Failed to fetch audit trail");
    return response.json();
  },

  getProjects: async () => {
    const response = await fetch(`${API_BASE_URL}/api/projects`);
    if (!response.ok) throw new Error("Failed to fetch projects");
    return response.json();
  },

  createProject: async (title, mcaClause, totalBudget, allocatedLocation) => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("mca_clause", mcaClause);
    formData.append("total_budget", totalBudget.toString());
    formData.append("allocated_location", allocatedLocation);

    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Failed to create CSR project");
    return response.json();
  },

  uploadAudio: async (audioFile, lat, lon, projectId = null, clientTranscript = null) => {
    const formData = new FormData();
    formData.append("audio", audioFile);
    if (lat !== null && lat !== undefined) formData.append("latitude", lat.toString());
    if (lon !== null && lon !== undefined) formData.append("longitude", lon.toString());
    formData.append("worker_id", "worker_mobile_app");
    if (projectId) formData.append("project_id", projectId.toString());
    if (clientTranscript) formData.append("client_transcript", clientTranscript);

    const response = await fetch(`${API_BASE_URL}/api/voice/upload`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Audio upload failed");
    return response.json();
  },

  approveLog: async (logId) => {
    const response = await fetch(`${API_BASE_URL}/api/logs/${logId}/approve`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to approve field log");
    return response.json();
  },

  getSSEUrl: (logId) => {
    return `${API_BASE_URL}/api/voice/process-stream/${logId}`;
  }
};
export default api;
