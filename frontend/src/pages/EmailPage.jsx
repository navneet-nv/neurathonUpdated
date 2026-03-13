import React, { useState, useEffect, useRef } from 'react'
import { api, StatusBadge } from '../shared'
import { toast } from 'react-hot-toast'

export default function EmailPage() {
  const [template, setTemplate] = useState('Hi {name},\n\nWe noticed your role as {role} at {team_name}. We would like to invite you...')
  const [status, setStatus] = useState('idle')
  const [results, setResults] = useState(null)
  const [hasPrefill, setHasPrefill] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('swarm_event_config')
      if (saved) {
        const config = JSON.parse(saved)
        if (config.emailTemplate) setTemplate(config.emailTemplate)
        setHasPrefill(true)
      }
    } catch (e) {}
  }, [])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) setSelectedFile(file)
  }

  const handleGenerate = async () => {
    if (!selectedFile) return toast.error('Please upload a participants CSV file')

    setStatus('running')
    setResults(null)
    
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('email_template', template)

      const response = await api.post('/api/email', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      const parsed = response.data

      setResults({
        recipients: parsed.total_processed || 0,
        segments: Object.keys(parsed.segment_breakdown || {}).length || 0,
        raw: parsed
      })
      setStatus('done')
      toast.success('Emails Personalised')
    } catch (err) {
      console.error(err)
      setStatus('error')
      toast.error('Failed to process emails')
    }
  }

  return (
    <div>
      <div className="page-header-card">
        <div>
          <h2 className="page-header">Email Agent</h2>
          <p className="page-subtitle" style={{ margin: 0 }}>Draft and personalize outbound communications at scale.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <span className="badge" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>AGENT 2 OF 3</span>
          <StatusBadge status={status} />
        </div>
      </div>

      {hasPrefill && <div className="prefill-banner">✓ Pre-filled from your Event Setup — edit if needed</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.2fr)', gap: '32px' }}>
        <div className="agent-card">
          <label className="form-label">Participant Data</label>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept=".csv,.xlsx,.xls" 
              style={{ display: 'none' }} 
            />
            <div 
              className="file-drop-zone" 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              style={{ cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined file-drop-icon">{selectedFile ? 'check_circle' : 'cloud_upload'}</span>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                  {selectedFile ? selectedFile.name : 'Click to upload CSV or Excel'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Expected columns: name, email, role, team_name</div>
              </div>
            </div>
            <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>*Emails are processed in mock mode (not actually sent).</div>
        </div>

        <div className="agent-card">
          <div className="form-group">
            <label className="form-label">Base Email Template</label>
            <textarea 
              className="form-textarea" 
              style={{ minHeight: '200px' }}
              value={template} 
              onChange={e => setTemplate(e.target.value)} 
              placeholder="Available variables: {name}, {role}, {team_name}"
            />
          </div>

          <button 
            className="btn-primary" 
            style={{ width: '100%' }}
            onClick={handleGenerate}
            disabled={status === 'running'}
          >
            <span className="material-symbols-outlined">play_arrow</span>
            {status === 'running' ? 'Processing...' : 'Personalise Emails'}
          </button>
        </div>
      </div>

      {results && (
        <div style={{ marginTop: '32px' }}>
          <h3 className="section-title">Preparation Results</h3>
          <div className="metrics-row" style={{ marginTop: '16px', marginBottom: '24px' }}>
            <div className="metric-card">
              <div className="metric-value">{results.recipients}</div>
              <div className="metric-label">Recipients Processed</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{results.segments}</div>
              <div className="metric-label">Identified Segments</div>
            </div>
            <div className="metric-card">
              <div className="metric-value" style={{ color: 'var(--green)' }}>Active</div>
              <div className="metric-label">Mock Mode</div>
            </div>
          </div>

          <div className="output-terminal">
            <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginBottom: '12px', textTransform: 'uppercase' }}>Terminal Output Preview</div>
            {JSON.stringify(results.raw, null, 2)}
          </div>
        </div>
      )}
    </div>
  )
}
