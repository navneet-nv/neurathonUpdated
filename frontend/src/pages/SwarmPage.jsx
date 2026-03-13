import React, { useState, useRef, useEffect } from 'react'
import { api, StatusBadge } from '../shared'
import { toast } from 'react-hot-toast'

export default function SwarmPage() {
  const [eventName, setEventName] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [rawText, setRawText] = useState('')
  const [eventsText, setEventsText] = useState('[]')
  const [emailTemplate, setEmailTemplate] = useState('')
  const [csvPath, setCsvPath] = useState('')

  const [status, setStatus] = useState('idle')
  const [activityLog, setActivityLog] = useState([])
  const [results, setResults] = useState(null)
  
  const [showModal, setShowModal] = useState(false)
  const [hasPrefill, setHasPrefill] = useState(false)
  const logEndRef = useRef(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('swarm_event_config')
      if (saved) {
        const config = JSON.parse(saved)
        setEventName(config.eventName || '')
        setTargetAudience(config.targetAudience || '')
        setRawText(config.description || '')
        setEventsText(config.scheduleJson || '[]')
        setEmailTemplate(config.emailTemplate || '')
        setCsvPath(config.csvPath || '')
        setHasPrefill(true)
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activityLog])

  const handleRunSwarm = async () => {
    let events
    try {
      events = JSON.parse(eventsText || '[]')
    } catch {
      return toast.error('Invalid events JSON')
    }

    if (!eventName || !rawText || !targetAudience) {
      return toast.error('Fill in event name, audience, and brief')
    }

    setStatus('running')
    setActivityLog([])
    setResults(null)

    try {
      const payload = {
        event_name: eventName,
        raw_text: rawText,
        target_audience: targetAudience,
        csv_path: csvPath,
        email_template: emailTemplate,
        events,
      }

      const response = await api.post('/api/swarm/run', payload)
      const data = response.data || {}

      setActivityLog(data.activity_log || [])
      setResults(data)
      setStatus('done')
      toast.success('Swarm pipeline finished')
      
      if (data.email_results?.total_processed > 0 || Object.keys(data.email_results || {}).length > 0) {
        setShowModal(true)
      }
    } catch (err) {
      console.error(err)
      setStatus('error')
      toast.error('Failed to run swarm orchestrator')
    }
  }

  const handleApprove = () => {
    setShowModal(false)
    toast.success('Emails dispatched!')
  }

  return (
    <div>
      <div className="page-header-card" style={{ marginBottom: '16px' }}>
        <div>
          <h2 className="page-header" style={{ background: 'linear-gradient(135deg, var(--blue), var(--purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Swarm Orchestrator
          </h2>
          <p className="page-subtitle" style={{ margin: 0 }}>Run the full LangGraph logistics pipeline.</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="pipeline-flow">
        <div className="flow-node active">
          <span className="material-symbols-outlined">note_stack</span>
          Content
        </div>
        <div className="flow-arrow">
          <span className="material-symbols-outlined">arrow_forward</span>
        </div>
        <div className="flow-node active">
          <span className="material-symbols-outlined">deployed_code</span>
          Scheduler
        </div>
        <div className="flow-arrow">
          <span className="flow-arrow-label">if conflict</span>
          <span className="material-symbols-outlined">arrow_forward</span>
        </div>
        <div className="flow-node active">
          <span className="material-symbols-outlined">mail</span>
          Email
        </div>
      </div>

      {hasPrefill && <div className="prefill-banner">✓ Pre-filled from your Event Setup — edit if needed</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.2fr)', gap: '32px' }}>
        
        {/* Left Col: Setup */}
        <div className="agent-card">
          <h3 className="section-title">Context Injection</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Event Name</label>
              <input className="form-input" value={eventName} onChange={e => setEventName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Target Audience</label>
              <input className="form-input" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Event Description / Brief</label>
            <textarea className="form-textarea" value={rawText} onChange={e => setRawText(e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Events (JSON)</label>
              <textarea className="form-textarea" style={{ fontFamily: 'monospace', fontSize: '11px' }} value={eventsText} onChange={e => setEventsText(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Template</label>
              <textarea className="form-textarea" value={emailTemplate} onChange={e => setEmailTemplate(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">CSV Path (Participants)</label>
            <input className="form-input" value={csvPath} onChange={e => setCsvPath(e.target.value)} placeholder="backend/uploads/participants.csv" />
          </div>

          <button 
            className="btn-swarm" 
            onClick={handleRunSwarm}
            disabled={status === 'running'}
          >
            <span className="material-symbols-outlined">rocket_launch</span>
            {status === 'running' ? 'Igniting Swarm...' : 'Run Full Swarm'}
          </button>
        </div>

        {/* Right Col: Timeline & Outputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="agent-card" style={{ flexGrow: 1 }}>
            <h3 className="section-title">Activity Feed</h3>
            {activityLog.length === 0 ? (
               <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                 Awaiting orchestration...
               </div>
            ) : (
                <div style={{ maxHeight: '380px', overflowY: 'auto' }} className="output-terminal">
                  {activityLog.map((log, i) => (
                    <div key={i} style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                       <span style={{ color: 'var(--text-muted)', width: '60px' }}>{log.timestamp?.split(' ')[1] || '00:00'}</span>
                       <div>
                         <div style={{ color: 'var(--blue)', fontWeight: '600' }}>[{log.agent}] {log.status}</div>
                         <div style={{ color: 'var(--text-primary)' }}>{log.summary}</div>
                       </div>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
            )}
          </div>

          {results && (
            <>
               {typeof results.conflicts_found !== 'undefined' && (
                 <div className={`banner-conflict ${results.conflicts_found ? 'error' : 'success'}`} style={{ margin: 0 }}>
                   <span className="material-symbols-outlined">{results.conflicts_found ? 'warning' : 'check_circle'}</span>
                   {results.conflicts_found ? 'Scheduler detected and resolved conflicts.' : 'No schedule conflicts found.'}
                 </div>
               )}

               <div className="agent-card">
                  <h3 className="section-title">Generated Posts</h3>
                  <div className="output-terminal" style={{ margin: 0, maxHeight: '200px' }}>
                     {Object.keys(results.generated_posts || {}).length > 0 
                        ? JSON.stringify(results.generated_posts, null, 2)
                        : <span style={{ color: 'var(--text-muted)' }}>No social content generated.</span>
                     }
                  </div>
               </div>

               <div className="agent-card">
                  <h3 className="section-title">Email Results</h3>
                  <div className="output-terminal" style={{ margin: 0, maxHeight: '200px' }}>
                     {Object.keys(results.email_results || {}).length > 0 
                        ? JSON.stringify(results.email_results, null, 2)
                        : <span style={{ color: 'var(--text-muted)' }}>No emails generated.</span>
                     }
                  </div>
               </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Approve Dispatch</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', paddingBottom: '24px', borderBottom: '1px solid var(--border)' }}>
              Authorize sending of <span style={{ color: 'white' }}>{results?.email_results?.total_processed || 0}</span> templated emails?
            </p>
            <div className="modal-actions">
              <button className="btn-primary" style={{ background: 'var(--bg-input)' }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleApprove}>Approve & Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
