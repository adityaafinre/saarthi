import React, { useState, useRef } from "react";
import { ChevronUp, ChevronDown, Briefcase, Lock, UserCheck, ShieldAlert, Award, FileText, Mic } from "lucide-react";
import FieldWorkerDashboard from "./components/FieldWorkerDashboard";
import ManagerDashboard from "./components/ManagerDashboard";
import CorporateDashboard from "./components/CorporateDashboard";
import "./App.css";

function App() {
  const [activeRole, setActiveRole] = useState("worker"); // default role: worker
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const dashboardRef = useRef(null);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleRoleSelect = (role) => {
    setActiveRole(role);
    setMenuOpen(false);
    
    if (role === "worker") {
      setModalOpen(true);
    }
  };

  const openBookingAlert = () => {
    alert("Calendar integration coming soon!\nSarthi scheduling agent is currently initializing.");
  };

  const isDashboardView = activeRole !== "worker";

  return (
    <div className={`app-container ${isDashboardView ? "dashboard-view-mode" : ""}`}>
      {/* 1. Navbar */}
      <header className={`app-header ${isDashboardView ? "dashboard-mode" : ""}`}>
        <div className="app-header-inner">
          <div className="brand" onClick={() => handleRoleSelect("worker")}>
            <h1>Sarthi</h1>
            <span className="brand-badge">®</span>
          </div>

          <button className="menu-toggle-btn" onClick={toggleMenu}>
            Menu
            {menuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </header>

      {/* 2. Full-screen Drawer Overlay */}
      <div className={`drawer-overlay ${menuOpen ? "open" : ""}`}>
        <div className="drawer-links">
          <button className="drawer-link-btn" onClick={() => handleRoleSelect("worker")}>
            Field Worker Ingest Gate
          </button>
          <button className="drawer-link-btn" onClick={() => handleRoleSelect("manager")}>
            NGO Manager Review
          </button>
          <button className="drawer-link-btn" onClick={() => handleRoleSelect("corporate")}>
            Corporate Head Ledger
          </button>
          <button className="drawer-link-btn" onClick={() => { setMenuOpen(false); openBookingAlert(); }}>
            Book Consultation
          </button>
        </div>
        <div className="drawer-footer">
          <p>© {new Date().getFullYear()} Sarthi Compliance. All rights reserved.</p>
        </div>
      </div>

      {/* 3. Hero Section (Render ONLY on Worker landing page) */}
      {!isDashboardView && (
        <section className="hero-section">
          {/* Curved Left Lines (20 lines) */}
          {[...Array(20)].map((_, i) => (
            <div
              key={`left-${i}`}
              className="curved-line left"
              style={{
                width: `${60 + i * 10}px`,
                animationDelay: `${i * 0.25}s`,
                "--tx": "0",
                "--ty": "-50%"
              }}
            />
          ))}

          {/* Curved Right Lines (20 lines) */}
          {[...Array(20)].map((_, i) => (
            <div
              key={`right-${i}`}
              className="curved-line right"
              style={{
                width: `${60 + i * 10}px`,
                animationDelay: `${i * 0.25}s`,
                "--tx": "0",
                "--ty": "-50%"
              }}
            />
          ))}

          {/* Curved Top Lines for Mobile (<810px) (20 lines) */}
          {[...Array(20)].map((_, i) => (
            <div
              key={`top-${i}`}
              className="curved-line top-mobile"
              style={{
                width: "100%",
                maxWidth: "600px",
                height: `${60 + i * 10}px`,
                animationDelay: `${i * 0.25}s`,
                "--tx": "-50%",
                "--ty": "0"
              }}
            />
          ))}

          {/* Scrolling Ticker Row */}
          <div className="ticker-row-wrapper">
            <div className="ticker-marquee">
              {[...Array(4)].map((_, loopIdx) => (
                <React.Fragment key={loopIdx}>
                  <span className="ticker-item">MCA Compliance</span>
                  <span className="ticker-item">SDG Mapping</span>
                  <span className="ticker-item">Audit Ledger</span>
                  <span className="ticker-item">Voice Intake</span>
                  <span className="ticker-item">RAG Agent</span>
                  <span className="ticker-item">Immutable Hash</span>
                  <span className="ticker-item">Guardrails Shield</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Hero Title */}
          <h2 className="hero-title">
            Premium CSR compliance <span className="serif italic">alwayzz</span><sup>®</sup> on demand.
          </h2>

          {/* Centered Voice Intake Recording Trigger */}
          <div className="hero-rec-trigger-container">
            <button className="hero-mic-trigger" onClick={() => setModalOpen(true)}>
              <Mic size={40} />
            </button>
            <span className="hero-mic-trigger-label">Record Voice Ingest</span>
          </div>

          {/* CTA Button Row */}
          <div className="cta-row">
            <button className="primary-cta-btn" onClick={() => setModalOpen(true)}>
              Launch Dashboard
            </button>
            
            <button className="book-cta-btn" onClick={openBookingAlert}>
              <img 
                className="book-avatar" 
                src="https://framerusercontent.com/images/hfneFL6CHBi5BnNvCeOaqU9HqE4.png" 
                alt="Compliance Consultant" 
              />
              <div className="book-text-stack">
                <span className="book-primary-text">Chat for 15 minutes</span>
                <span className="book-secondary-text">
                  Pick a slot
                  <span className="status-dot"></span>
                </span>
              </div>
            </button>
          </div>

          {/* Progressive Bottom Blur */}
          <div className="progressive-blur" />
        </section>
      )}

      {/* 4. 3D Perspective Modal Popup (Field Worker Intake) */}
      <div className={`perspective-container ${modalOpen ? "open" : ""}`}>
        <div className="modal-3d-card">
          <div className="modal-header">
            <h3>Voice Compliance Workspace</h3>
            <button className="modal-close-btn" onClick={() => setModalOpen(false)}>
              Close Workspace
            </button>
          </div>
          <FieldWorkerDashboard onClose={() => setModalOpen(false)} />
        </div>
      </div>

      {/* 5. Trusted By Section (Render ONLY on Worker landing page) */}
      {!isDashboardView && (
        <section className="trusted-section">
          <div className="trusted-label">
            Partnered with top-tier companies globally
          </div>
          <div className="trusted-marquee-wrapper">
            <div className="trusted-marquee">
              {[...Array(2)].map((_, loopIdx) => (
                <React.Fragment key={loopIdx}>
                  <span className="logo-item airbnb">Airbnb</span>
                  <span className="logo-item shopify">Shopify</span>
                  <span className="logo-item notion">Notion</span>
                  <span className="logo-item linear">Linear</span>
                  <span className="logo-item webflow">Webflow</span>
                  <span className="logo-item figma">Figma</span>
                  <span className="logo-item slack">Slack</span>
                  <span className="logo-item stripe">Stripe</span>
                  <span className="logo-item vercel">Vercel</span>
                  <span className="logo-item framer">Framer</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. Dynamic Dashboard View Area (Full screen width) */}
      <main className="dashboard-content" ref={dashboardRef}>
        <div style={{ width: "100%" }}>
          {activeRole === "worker" && (
            <div className="glass-card empty-state" style={{ minHeight: "300px" }}>
              <Mic size={48} />
              <h3>Field Worker Intake Active</h3>
              <p style={{ color: "var(--muted)", maxWidth: "480px" }}>
                Use the centered voice trigger above in the hero section to open the 3D Compliance Workspace and record daily logs.
              </p>
              <button className="primary-cta-btn" onClick={() => setModalOpen(true)} style={{ marginTop: "16px", height: "48px", padding: "12px 24px" }}>
                Open Workspace
              </button>
            </div>
          )}
          
          {activeRole === "manager" && (
            <>
              <div className="dashboard-header">
                <div className="dashboard-header-left">
                  <h2 className="dashboard-header-title">NGO Manager Workspace</h2>
                  <span className="dashboard-header-subtitle">Review worker recordings, inspect automated drafts, and seal ledger entries.</span>
                </div>
              </div>
              <ManagerDashboard />
            </>
          )}

          {activeRole === "corporate" && (
            <>
              <div className="dashboard-header">
                <div className="dashboard-header-left">
                  <h2 className="dashboard-header-title">Corporate Ledger Workspace</h2>
                  <span className="dashboard-header-subtitle">Monitor budgets, audit Schedule VII compliance, and review cryptographic evidence blocks.</span>
                </div>
              </div>
              <CorporateDashboard />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
