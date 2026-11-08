import React, { useState, useEffect, useRef } from "react";
import { Mic, FileAudio, CheckCircle, AlertCircle, RefreshCw, Navigation, FolderOpen, StopCircle, ArrowLeft, ArrowRight, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../utils/api";

export const FieldWorkerDashboard = ({ onClose }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  
  // Real recording states
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [streamSteps, setStreamSteps] = useState([]);
  const [geoCoords, setGeoCoords] = useState({ lat: 28.6139, lon: 77.2090 }); // Default to Delhi coordinates
  
  // Selected agent index in horizontal pipeline deck
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);
  // Direction of rotation (1 for right-to-left, -1 for left-to-right)
  const [rotationDirection, setRotationDirection] = useState(1);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  // Load location & projects on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        (err) => {
          console.warn("Geolocation permission denied. Using default coordinates.");
        }
      );
    }
    
    const loadProjects = async () => {
      try {
        const data = await api.getProjects();
        setProjects(data);
        if (data.length > 0) {
          setSelectedProjectId(data[0].id.toString());
        }
      } catch (err) {
        console.error("Failed to load projects list:", err);
      }
    };
    loadProjects();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Web Speech API not supported in this browser.");
      return null;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "hi-IN";

    rec.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptText + " ";
        } else {
          interimTranscript += transcriptText;
        }
      }

      setLiveTranscript(finalTranscript || interimTranscript);
    };

    rec.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
    };

    return rec;
  };

  const startVoiceRecording = async () => {
    try {
      setLiveTranscript("");
      setStreamSteps([]);
      audioChunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        uploadRecordedData(audioBlob);
      };

      const rec = initSpeechRecognition();
      if (rec) {
        recognitionRef.current = rec;
        rec.start();
      }

      mediaRecorder.start(250);
      setRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
    } catch (err) {
      alert(`Could not start voice recording: ${err.message}. Please check microphone permissions.`);
    }
  };

  const stopVoiceRecording = () => {
    if (!recording) return;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    
    setRecording(false);
  };

  const uploadRecordedData = async (audioBlob, optionalTranscript = null) => {
    try {
      setProcessing(true);
      setUploadProgress("Uploading voice note and transcript details...");
      
      const transcriptToSend = optionalTranscript !== null ? optionalTranscript : liveTranscript;
      const projId = selectedProjectId ? parseInt(selectedProjectId) : null;
      
      const result = await api.uploadAudio(audioBlob, geoCoords.lat, geoCoords.lon, projId, transcriptToSend);
      
      setUploadProgress("Upload complete. Connecting to agent workspace...");
      startPipelineStream(result.log_id);
    } catch (err) {
      setUploadProgress(`Error: ${err.message}`);
      setProcessing(false);
    }
  };

  const handleSimulatedUpload = () => {
    const simulatedTranscript =
      "आज हमने बिचोली गांव में 25 महिलाओं को जैविक खेती की ट्रेनिंग दी। " +
      "ट्रेनिंग बहुत अच्छी रही लेकिन भारी बारिश के कारण कुछ महिलाएं समय पर नहीं आ पाईं।";
    
    const buffer = new ArrayBuffer(44 + 4000);
    const view = new DataView(buffer);
    view.setUint32(0, 0x52494646, false);
    view.setUint32(4, 36 + 4000, true);
    view.setUint32(8, 0x57415645, false);
    view.setUint32(12, 0x666d7420, false);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    
    const mockBlob = new Blob([buffer], { type: "audio/wav" });
    setLiveTranscript(simulatedTranscript);
    uploadRecordedData(mockBlob, simulatedTranscript);
  };

  const startPipelineStream = (logId) => {
    const sseUrl = api.getSSEUrl(logId);
    const eventSource = new EventSource(sseUrl);
    
    eventSource.onmessage = (event) => {
      const stepData = JSON.parse(event.data);
      console.log("SSE Pipeline Stream:", stepData);
      
      setStreamSteps((prev) => {
        const filtered = prev.filter((item) => item.step !== stepData.step);
        return [...filtered, stepData];
      });

      // Find index of incoming step and switch the card view to focus it
      const targetIdx = pipelineSteps.findIndex(s => s.name === stepData.step);
      if (targetIdx !== -1) {
        setRotationDirection(1);
        setSelectedAgentIndex(targetIdx);
      }

      if (stepData.status === "pending" || stepData.status === "failed") {
        eventSource.close();
        setProcessing(false);
        setUploadProgress("");
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
      eventSource.close();
      setProcessing(false);
    };
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const pipelineSteps = [
    { name: "Riva STT", label: "Speech Engine" },
    { name: "Voice Intake Agent", label: "Intake Agent" },
    { name: "Insight Agent", label: "Insight Agent" },
    { name: "Report Agent", label: "Report Agent" },
    { name: "Human Approval Gate", label: "Manager Review" }
  ];

  const handleNavClick = (idx) => {
    setRotationDirection(idx > selectedAgentIndex ? 1 : -1);
    setSelectedAgentIndex(idx);
  };

  const handlePrev = () => {
    if (selectedAgentIndex > 0) {
      setRotationDirection(-1);
      setSelectedAgentIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (selectedAgentIndex < pipelineSteps.length - 1) {
      setRotationDirection(1);
      setSelectedAgentIndex(prev => prev + 1);
    }
  };

  const getStepData = (stepName) => {
    return streamSteps.find((s) => s.step === stepName);
  };

  const currentStepInfo = pipelineSteps[selectedAgentIndex];
  const activeStepData = getStepData(currentStepInfo.name);

  // Animation values for 3D card flips (dependent on direction)
  const slideVariants = {
    enter: (direction) => ({
      rotateY: direction > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.9
    }),
    center: {
      rotateY: 0,
      opacity: 1,
      scale: 1,
      zIndex: 1
    },
    exit: (direction) => ({
      rotateY: direction > 0 ? -80 : 80,
      opacity: 0,
      scale: 0.9,
      zIndex: 0
    })
  };

  return (
    <div className="modal-body-scroll">
      <div className="mic-card" style={{ border: "none", padding: "0 0 16px 0" }}>
        <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "16px" }}>
          Speak in Hindi to log activities, beneficiary counts, and blocker details.
        </p>

        {/* Project Selector dropdown */}
        <div style={{ width: "100%", maxWidth: "480px", marginBottom: "20px", textAlign: "left", margin: "0 auto" }}>
          <label style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>
            <FolderOpen size={14} /> Target CSR Project
          </label>
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={processing || recording}
            style={{
              width: "100%",
              background: "var(--bg)",
              border: "1px solid var(--border-soft)",
              color: "var(--text)",
              padding: "10px 14px",
              borderRadius: "9999px",
              fontSize: "13px",
              fontWeight: "500",
              outline: "none"
            }}
          >
            <option value="">-- Standalone (No Project Mapped) --</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.title} ({proj.allocated_location})
              </option>
            ))}
          </select>
        </div>

        <div className="mic-btn-container">
          {recording && <div className="pulse-ring"></div>}
          <button 
            className={`mic-btn ${recording ? "recording" : ""}`}
            onClick={recording ? stopVoiceRecording : startVoiceRecording}
            disabled={processing}
          >
            {recording ? <StopCircle size={36} /> : <Mic size={36} />}
          </button>
        </div>

        <span style={{ fontSize: "13px", color: recording ? "rgb(239, 68, 68)" : "var(--muted)", fontWeight: "600", display: "block", marginBottom: "12px" }}>
          {recording ? `Recording: ${formatTime(recordingTime)} | Click to Upload` : "Tap microphone to record update"}
        </span>

        {/* Live Transcription box */}
        {liveTranscript && (
          <div style={{ width: "100%", maxWidth: "480px", margin: "0 auto 12px", textAlign: "left", background: "rgb(251,251,251)", border: "1px solid var(--border-soft)", borderRadius: "8px", padding: "12px" }}>
            <label style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px", fontWeight: "700", textTransform: "uppercase" }}>Live Transcription:</label>
            <p style={{ fontSize: "13px", color: "var(--text)", fontWeight: "500" }}>{liveTranscript}</p>
          </div>
        )}

        <button 
          className="simulate-btn" 
          onClick={handleSimulatedUpload}
          disabled={processing || recording}
          style={{ width: "100%", maxWidth: "320px", fontWeight: "600", margin: "0 auto" }}
        >
          Simulate Hindi Voice Note
        </button>

        {/* Geo-tag status */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "16px", fontSize: "12px", color: "var(--green)", fontWeight: "600" }}>
          <Navigation size={14} />
          <span>Geo-Tagged: {geoCoords.lat.toFixed(4)}N, {geoCoords.lon.toFixed(4)}E</span>
        </div>
      </div>

      {/* Upload/Processing loader */}
      {uploadProgress && (
        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px", marginBottom: "16px" }}>
          <RefreshCw size={16} className="step-icon spinning" />
          <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--muted)" }}>{uploadProgress}</span>
        </div>
      )}

      {/* 3D Flipping Card Pipeline */}
      {streamSteps.length > 0 && (
        <div className="pipeline-wrapper">
          <div className="stream-title" style={{ marginBottom: "16px" }}>Compliance Agent Pipeline</div>
          
          {/* Timeline Indicators */}
          <div className="pipeline-steps-nav">
            {pipelineSteps.map((step, idx) => {
              const stepData = getStepData(step.name);
              const isActive = selectedAgentIndex === idx;
              
              let navClass = "";
              if (isActive) navClass = "active";
              else if (stepData?.status === "completed") navClass = "completed";
              else if (stepData?.status === "failed") navClass = "failed";
              
              return (
                <div 
                  key={step.name} 
                  className={`pipeline-nav-item ${navClass}`}
                  onClick={() => handleNavClick(idx)}
                >
                  <div className="pipeline-nav-dot" />
                  <span className="pipeline-nav-label">{step.label}</span>
                </div>
              );
            })}
          </div>

          {/* The 3D Flipping Card Stage */}
          <div className="card-3d-deck-container">
            <AnimatePresence initial={false} custom={rotationDirection} mode="wait">
              <motion.div
                key={currentStepInfo.name}
                custom={rotationDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="agent-flip-card"
              >
                {/* Card Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-soft)", paddingBottom: "12px", marginBottom: "16px" }}>
                  <div>
                    <h4 style={{ fontSize: "16px", fontWeight: "700" }}>{currentStepInfo.name}</h4>
                    <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>
                      {currentStepInfo.label}
                    </span>
                  </div>
                  
                  {/* Step status badge */}
                  {activeStepData ? (
                    <span className={`badge ${activeStepData.status}`} style={{ fontSize: "10px", padding: "4px 8px" }}>
                      {activeStepData.status === "processing" && (
                        <RefreshCw size={10} className="step-icon spinning" style={{ marginRight: "4px", display: "inline-block", verticalAlign: "middle" }} />
                      )}
                      {activeStepData.status}
                    </span>
                  ) : (
                    <span className="badge pending" style={{ fontSize: "10px", padding: "4px 8px" }}>pending</span>
                  )}
                </div>

                {/* Card Body */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", textAlign: "left", fontSize: "13px", lineHeight: "1.4" }}>
                  {activeStepData ? (
                    <>
                      <p style={{ fontWeight: "700" }}>{activeStepData.message}</p>
                      
                      {/* Riva transcription output */}
                      {currentStepInfo.name === "Riva STT" && activeStepData.data?.transcript && (
                        <div className="step-output">
                          "{activeStepData.data.transcript}"
                        </div>
                      )}

                      {/* Entity extraction JSON */}
                      {currentStepInfo.name === "Voice Intake Agent" && activeStepData.data && (
                        <div className="step-output">
                          {JSON.stringify(activeStepData.data, null, 2)}
                        </div>
                      )}

                      {/* Insight Agent Warnings */}
                      {currentStepInfo.name === "Insight Agent" && activeStepData.data && (
                        <div className="step-output" style={{ color: activeStepData.data.anomalies?.length ? "rgb(239, 68, 68)" : "var(--text)" }}>
                          <strong>Anomalies Checked:</strong>
                          {"\n"}{JSON.stringify(activeStepData.data.anomalies || [], null, 2)}
                          {"\n\n"}<strong>Alert Flags:</strong>
                          {"\n"}{JSON.stringify(activeStepData.data.alerts || [], null, 2)}
                          {"\n\n"}<strong>LLM Insight Audit:</strong>
                          {"\n"}{activeStepData.data.action_summary}
                        </div>
                      )}

                      {/* Draft weekly compliance records */}
                      {currentStepInfo.name === "Report Agent" && activeStepData.data && (
                        <div className="step-output" style={{ maxHeight: "180px", overflowY: "auto" }}>
                          <strong>NGO Weekly report:</strong>
                          {"\n"}{activeStepData.data.ngo_report}
                          {"\n\n"}<strong>Corporate Board Annexure:</strong>
                          {"\n"}{activeStepData.data.corporate_annexure}
                          {"\n\n"}<strong>Program Guardrail:</strong> {activeStepData.data.guardrails_triggered ? "COMPLIANCE WARNING: Mismatches auto-corrected." : "Passed cleanly."}
                        </div>
                      )}

                      {/* Manager Sign off Gate */}
                      {currentStepInfo.name === "Human Approval Gate" && (
                        <p style={{ fontStyle: "italic", color: "var(--muted)", marginTop: "10px", lineHeight: "1.5" }}>
                          This compliant draft has been routed to the NGO Manager review queue. Switch to the NGO Manager View in the header menu to approve the block and seal the cryptographic ledger.
                        </p>
                      )}
                    </>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--border-soft)", gap: "10px" }}>
                      <Play size={24} />
                      <p style={{ fontSize: "13px", fontWeight: "600" }}>Waiting for pipeline stream to reach this agent...</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation buttons below card */}
          <div className="card-nav-buttons">
            <button 
              className="card-nav-btn"
              onClick={handlePrev}
              disabled={selectedAgentIndex === 0}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <ArrowLeft size={12} /> Prev Agent
              </span>
            </button>
            
            <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "700" }}>
              Agent {selectedAgentIndex + 1} of {pipelineSteps.length}
            </span>

            <button 
              className="card-nav-btn"
              onClick={handleNext}
              disabled={selectedAgentIndex === pipelineSteps.length - 1}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                Next Agent <ArrowRight size={12} />
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldWorkerDashboard;
