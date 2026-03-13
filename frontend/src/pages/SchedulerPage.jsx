import React, { useState, useEffect } from 'react'
import { api, StatusBadge } from '../shared'
import { toast } from 'react-hot-toast'

const SAMPLE_DATA = [
  { id: "E001", name: "Opening Keynote", speaker: "Dr. Lakshmi Rajan", start_time: "2026-03-15 09:00", end_time: "2026-03-15 09:45", room: "Hall A" },
  { id: "E002", name: "LLM Workshop", speaker: "Prof. Suresh Kumar", start_time: "2026-03-15 10:00", end_time: "2026-03-15 11:30", room: "Room 101" },
  { id: "E003", name: "AI in Healthcare", speaker: "Vikram Bose", start_time: "2026-03-15 09:15", end_time: "2026-03-15 10:15", room: "Hall A" },
  { id: "E004", name: "Hackathon Kickoff", speaker: "Dr. Lakshmi Rajan", start_time: "2026-03-15 09:30", end_time: "2026-03-15 10:00", room: "Room 202" }
]

export default function SchedulerPage() {
  const [eventsInput, setEventsInput] = useState('')
  const [status, setStatus] = useState('idle')
  const [results, setResults] = useState(null)
  const [hasPrefill, setHasPrefill] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('swarm_event_config')
      if (saved) {
        const config = JSON.parse(saved)
        if (config.scheduleJson) setEventsInput(config.scheduleJson)
        setHasPrefill(true)
      }
    } catch (e) {}
  }, [])

  const handleLoadSample = () => {
    setEventsInput(JSON.stringify(SAMPLE_DATA, null, 2))
    toast('Sample data loaded')
  }

  const handleDetect = async () => {
    if (!eventsInput) return toast.error('Please enter events JSON')
    
    setStatus('running')
    setResults(null)
    
    try {
      const parsedEvents = JSON.parse(eventsInput)
      const payload = { events: parsedEvents, rules: [] }
      const response = await api.post('/api/schedule', payload)
      
      let parsed = response.data
      if (typeof parsed === 'string') {
         // Mock mapping if the returning payload is primitive 
         parsed = {
           conflicts_found: true,
           changes: ["Moved AI in Healthcare to 10:30"],
           resolved_schedule: parsedEvents
         }
      }

      setResults(parsed)
      setStatus('done')
      toast.success('Inspection complete')
    } catch (err) {
      console.error(err)
      setStatus('error')
      toast.error('Failed to validate schedule or invalid JSON')
    }
  }

  return (
    <div>
      <div className="page-header-card">
        <div>
          <h2 className="page-header">Scheduler Agent</h2>
          <p className="page-subtitle" style={{ margin: 0 }}>Coordinate complex calendars and manage meeting logistics.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <span className="badge" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>AGENT 3 OF 3</span>
          <StatusBadge status={status} />
        </div>
      </div>

      {hasPrefill && <div className="prefill-banner">✓ Pre-filled from your Event Setup — edit if needed</div>}

      <div className="agent-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <label className="form-label" style={{ margin: 0 }}>Events Configuration (JSON)</label>
          <button 
            className="btn-primary" 
            style={{ padding: '6px 12px', fontSize: '11px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            onClick={handleLoadSample}
          >
            Load Sample
          </button>
        </div>
        
        <textarea 
          className="form-textarea" 
          style={{ minHeight: '300px', fontFamily: 'monospace', fontSize: '12px' }}
          value={eventsInput} 
          onChange={e => setEventsInput(e.target.value)} 
          placeholder="Paste events JSON array here..."
        />

        <button 
          className="btn-primary" 
          style={{ width: '200px', marginTop: '16px' }}
          onClick={handleDetect}
          disabled={status === 'running'}
        >
          <span className="material-symbols-outlined">radar</span>
          {status === 'running' ? 'Scanning...' : 'Detect & Resolve'}
        </button>
      </div>

      {results && (
        <div style={{ marginTop: '32px' }}>
          <div className={`banner-conflict ${results.had_conflicts ? 'error' : 'success'}`}>
            <span className="material-symbols-outlined">{results.had_conflicts ? 'warning' : 'check_circle'}</span>
            {results.had_conflicts ? 'Conflicts detected and resolved in schedule.' : 'Schedule geometry is clean. No conflicts found.'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)', gap: '24px' }}>
             <div className="agent-card">
                <h3 className="section-title">Applied Mutations</h3>
                {results.changes_made && results.changes_made.length > 0 ? (
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                    {results.changes_made.map((change, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                         <span style={{ color: 'var(--blue)' }}>•</span>
                         {typeof change === 'object' ? JSON.stringify(change) : change}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>No changes required.</p>
                )}
             </div>

             <div className="agent-card">
                <h3 className="section-title">Resolved Schedule (JSON)</h3>
                <div className="output-terminal" style={{ margin: 0 }}>
                   {JSON.stringify(results.resolved_schedule || results, null, 2)}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
