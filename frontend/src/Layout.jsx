import React, { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isSetupComplete, setIsSetupComplete] = useState(false)

  // We re-check localStorage on mount and whenever location changes 
  // to ensure Layout reflects the latest setup state.
  useEffect(() => {
    try {
      const config = localStorage.getItem('swarm_event_config')
      setIsSetupComplete(Boolean(config))
    } catch {
      setIsSetupComplete(false)
    }
  }, [location.pathname])
  
  const getPageTitle = (path) => {
    switch (path) {
      case '/': return 'Dashboard'
      case '/setup': return 'Event Setup'
      case '/content': return 'Content Strategist'
      case '/email': return 'Email Agent'
      case '/scheduler': return 'Scheduler Agent'
      case '/swarm': return 'Swarm Orchestrator'
      case '/qa': return 'Participant Q&A'
      default: return 'Event Logistics Swarm'
    }
  }

  const handleLockedClick = (e) => {
    if (!isSetupComplete) {
      e.preventDefault()
      toast('Complete Event Setup first to unlock agents', { icon: '🔒' })
    }
  }

  return (
    <div className="layout-root">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-section">
            <div className="brand-icon">
              <span className="material-symbols-outlined">bolt</span>
            </div>
            <div className="brand-text">
              <h1>EL Swarm</h1>
              <p>Neurathon '26</p>
            </div>
          </div>
          <div className="system-status">
            <span className="status-dot"></span>
            System Live
          </div>
        </div>

        <nav className="nav-links">
          <NavLink 
            to="/setup" 
            className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
          >
            <span className="material-symbols-outlined">rocket_launch</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                Event Setup
                {isSetupComplete && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)' }}></span>}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Start here</span>
            </div>
          </NavLink>

          <NavLink 
            to="/" 
            className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
            end
          >
            <span className="material-symbols-outlined">dashboard</span>
            Dashboard
          </NavLink>
          
          <NavLink 
            to="/content" 
            onClick={handleLockedClick}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${!isSetupComplete ? 'lock-overlay-nav' : ''}`}
          >
            <span className="material-symbols-outlined">{isSetupComplete ? 'note_stack' : 'lock'}</span>
            Content Agent
          </NavLink>
          
          <NavLink 
            to="/email" 
            onClick={handleLockedClick}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${!isSetupComplete ? 'lock-overlay-nav' : ''}`}
          >
            <span className="material-symbols-outlined">{isSetupComplete ? 'mail' : 'lock'}</span>
            Email Agent
          </NavLink>

          <NavLink 
            to="/scheduler" 
            onClick={handleLockedClick}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${!isSetupComplete ? 'lock-overlay-nav' : ''}`}
          >
            <span className="material-symbols-outlined">{isSetupComplete ? 'deployed_code' : 'lock'}</span>
            Scheduler
          </NavLink>

          <NavLink 
            to="/swarm" 
            onClick={handleLockedClick}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${!isSetupComplete ? 'lock-overlay-nav' : ''}`}
          >
            <span className="material-symbols-outlined">{isSetupComplete ? 'hub' : 'lock'}</span>
            Swarm
          </NavLink>

          <NavLink 
            to="/qa" 
            onClick={handleLockedClick}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${!isSetupComplete ? 'lock-overlay-nav' : ''}`}
          >
            <span className="material-symbols-outlined">{isSetupComplete ? 'forum' : 'lock'}</span>
            Q&A Bot
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          GPT-4o · LangGraph
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="page-title">{getPageTitle(location.pathname)}</div>
          <div className="api-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--green)' }}>check_circle</span>
            Backend Connected
          </div>
        </header>

        <div className="page-body">
          {children}
        </div>
      </main>
    </div>
  )
}
