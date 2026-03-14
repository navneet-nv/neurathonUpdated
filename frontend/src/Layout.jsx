import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useEventConfig } from './EventContext'

export default function Layout({ children }) {
  const location = useLocation()
  const { eventName } = useEventConfig()

  const getPageTitle = (path) => {
    switch (path) {
      case '/events': return 'Events Manager'
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
              <p>{eventName || 'No Active Event'}</p>
            </div>
          </div>
          <div className="system-status">
            <span className="status-dot"></span>
            System Live
          </div>
        </div>

        <nav className="nav-links">
          <NavLink 
            to="/events" 
            className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
          >
            <span className="material-symbols-outlined">event</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                Events
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)' }}></span>
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
            to="/setup" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">settings</span>
            Event Settings
          </NavLink>
          
          <NavLink 
            to="/content" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">note_stack</span>
            Content Agent
          </NavLink>
          
          <NavLink 
            to="/email" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">mail</span>
            Email Agent
          </NavLink>

          <NavLink 
            to="/scheduler" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">deployed_code</span>
            Scheduler
          </NavLink>

          <NavLink 
            to="/swarm" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">hub</span>
            Swarm
          </NavLink>

          <NavLink 
            to="/qa" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">forum</span>
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
