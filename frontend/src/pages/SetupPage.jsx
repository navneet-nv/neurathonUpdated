import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'

export default function SetupPage() {
  const navigate = useNavigate()

  // Form State
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [venue, setVenue] = useState('')
  const [expectedParticipants, setExpectedParticipants] = useState('')
  const [description, setDescription] = useState('')
  const [targetAudience, setTargetAudience] = useState('')

  const [socialPlatform, setSocialPlatform] = useState('All Three')
  const [eventHashtag, setEventHashtag] = useState('')
  const [keySpeakers, setKeySpeakers] = useState('')

  const [scheduleJson, setScheduleJson] = useState('')
  
  // Note: For files, we usually just store the path string in config
  const [csvFile, setCsvFile] = useState(null)
  const [emailTemplate, setEmailTemplate] = useState('')
  const [senderName, setSenderName] = useState('')

  const [showHelper, setShowHelper] = useState(false)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)

  // Complete Checks by Section
  // Step 1: Basic Info (All strings required)
  const step1Complete = Boolean(eventName && eventDate && venue && expectedParticipants && description && targetAudience)
  const step1InProgress = Boolean(!step1Complete && (eventName || eventDate || venue || expectedParticipants || description || targetAudience))

  // Step 2: Audience & Content (Audience is in S1, here we check social & speakers)
  const step2Complete = Boolean(socialPlatform && eventHashtag)
  const step2InProgress = Boolean(!step2Complete && (socialPlatform !== 'All Three' || eventHashtag))

  // Step 3: Speaker Details
  const step3Complete = Boolean(keySpeakers)
  const step3InProgress = Boolean(false) // Textarea is either empty or not

  // Step 4: Schedule Upload
  const step4Complete = Boolean(scheduleJson)
  
  // Step 5: Participant CSV
  const step5Complete = Boolean(csvFile)

  // Step 6: Email Template
  const step6Complete = Boolean(emailTemplate && senderName)
  const step6InProgress = Boolean(!step6Complete && (emailTemplate || senderName))

  const totalSteps = 6
  const completedStepsCount = [step1Complete, step2Complete, step3Complete, step4Complete, step5Complete, step6Complete].filter(Boolean).length
  const progressPercent = Math.round((completedStepsCount / totalSteps) * 100)

  // Agent Readiness Map
  const agents = {
    content: { 
      ready: step1Complete && step2Complete && step3Complete,
      needs: 'basic info, social fields, speakers'
    },
    email: {
      ready: step5Complete && step6Complete,
      needs: 'CSV path, template, sender'
    },
    scheduler: {
      ready: step4Complete,
      needs: 'schedule JSON'
    }
  }
  const swarmReady = agents.content.ready && agents.email.ready && agents.scheduler.ready

  useEffect(() => {
    try {
      const saved = localStorage.getItem('swarm_event_config')
      if (saved) {
        const config = JSON.parse(saved)
        setEventName(config.eventName || '')
        setEventDate(config.eventDate || '')
        setVenue(config.venue || '')
        setExpectedParticipants(config.expectedParticipants || '')
        setDescription(config.description || '')
        setTargetAudience(config.targetAudience || '')
        setSocialPlatform(config.socialPlatform || 'All Three')
        setEventHashtag(config.eventHashtag || '')
        setKeySpeakers(config.keySpeakers || '')
        setScheduleJson(config.scheduleJson || '')
        if (config.csvFileName) {
          // Standard JS File object cannot be restored fully from localStorage,
          // so we mock a File-like object with just the name for UI purposes.
          setCsvFile({ name: config.csvFileName })
        }
        setEmailTemplate(config.emailTemplate || '')
        setSenderName(config.senderName || '')
      }
    } catch (err) {
      console.error('Failed to parse saved config')
    }
  }, [])

  const handleSave = () => {
    setAttemptedSubmit(true)
    if (!step1Complete || !step2Complete || !step3Complete || !step4Complete || !step5Complete || !step6Complete) {
      toast.error('Please complete all required fields.')
      return
    }

    const config = {
      eventName,
      eventDate,
      venue,
      expectedParticipants,
      description,
      targetAudience,
      socialPlatform,
      eventHashtag,
      keySpeakers,
      scheduleJson,
      csvFileName: csvFile?.name || '',
      emailTemplate,
      senderName
    }

    try {
      localStorage.setItem('swarm_event_config', JSON.stringify(config))
      toast.success('Event Configured! Agents Unlocked.')
      navigate('/')
    } catch (err) {
      toast.error('Failed to save configuration.')
    }
  }

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all setup data? This will lock the agents.')) {
      localStorage.removeItem('swarm_event_config')
      window.location.reload()
    }
  }

  const getInputClass = (val) => {
    return `form-input ${attemptedSubmit && !val ? 'error' : ''}`
  }
  
  const getTextAreaClass = (val) => {
    return `form-textarea ${attemptedSubmit && !val ? 'error' : ''}`
  }

  const StepIndicator = ({ num, complete, inProgress }) => {
    let cls = 'empty'
    if (complete) cls = 'complete'
    else if (inProgress) cls = 'in-progress'
    
    return (
      <div className={`step-circle ${cls}`}>
        {complete ? '✓' : num}
      </div>
    )
  }

  const ReadyBadge = ({ ready, needs }) => {
    if (ready) {
      return <span className="badge badge-done" style={{ background: 'transparent' }}>READY</span>
    }
    return <span className="badge badge-error" style={{ background: 'transparent', color: '#BCA05A' }} title={`Needs: ${needs}`}>INCOMPLETE</span>
  }

  return (
    <div>
      <style dangerouslySetInnerHTML={{__html: `
        .form-input.error, .form-textarea.error {
           border-color: var(--red) !important;
        }
      `}}/>
      <div className="page-header-card">
        <div>
          <h2 className="page-header">Event Context Setup</h2>
          <p className="page-subtitle" style={{ margin: 0 }}>Define your event. This data grounds the Swarm orchestrator.</p>
        </div>
      </div>

      <div className="setup-grid">
        {/* LEFT COL: FORMS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div className="agent-card">
            <h3 className="section-title">Section A — Basic Info</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Event Name *</label>
                <input className={getInputClass(eventName)} value={eventName} onChange={e => setEventName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Event Date *</label>
                <input type="date" className={getInputClass(eventDate)} value={eventDate} onChange={e => setEventDate(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Event Venue *</label>
                <input className={getInputClass(venue)} value={venue} onChange={e => setVenue(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Expected Participants *</label>
                <input type="number" className={getInputClass(expectedParticipants)} value={expectedParticipants} onChange={e => setExpectedParticipants(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Target Audience *</label>
              <input className={getInputClass(targetAudience)} placeholder="e.g. CS students, ML researchers" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Event Description *</label>
              <textarea className={getTextAreaClass(description)} placeholder="Theme, highlights, prizes, schedule overview..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="agent-card">
            <h3 className="section-title">Section B — Content & Marketing</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Primary Social Platform *</label>
                <select className="form-input" style={{ appearance: 'none' }} value={socialPlatform} onChange={e => setSocialPlatform(e.target.value)}>
                  <option>All Three</option>
                  <option>Twitter/X</option>
                  <option>LinkedIn</option>
                  <option>Instagram</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Event Hashtag *</label>
                <input className={getInputClass(eventHashtag)} placeholder="#Neurathon26" value={eventHashtag} onChange={e => setEventHashtag(e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Key Speakers *</label>
              <textarea className={getTextAreaClass(keySpeakers)} placeholder="One speaker per line" value={keySpeakers} onChange={e => setKeySpeakers(e.target.value)} />
            </div>
          </div>

          <div className="agent-card">
            <h3 className="section-title">Section C — Schedule</h3>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>Events Schedule (JSON format) *</label>
                <button type="button" onClick={() => setShowHelper(!showHelper)} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}>Need format help?</button>
              </div>
              <textarea 
                className={getTextAreaClass(scheduleJson)} 
                style={{ fontFamily: 'monospace', minHeight: '150px' }} 
                placeholder="paste events JSON array here..." 
                value={scheduleJson} 
                onChange={e => setScheduleJson(e.target.value)} 
              />
              {showHelper && (
                <div className="output-terminal" style={{ marginTop: '12px', fontSize: '11px', maxHeight: '120px' }}>
                  {`[
  {
    "id": "E001",
    "name": "Opening Keynote",
    "speaker": "Dr. Lakshmi Rajan",
    "start_time": "2026-03-15 09:00",
    "end_time": "2026-03-15 09:45",
    "room": "Hall A"
  }
]`}
                </div>
              )}
            </div>
          </div>

          <div className="agent-card">
            <h3 className="section-title">Section D — Participants & Emails</h3>
            <div className="form-group">
                 <label className="form-label">Participants CSV File *</label>
                 {!csvFile ? (
                   <div 
                     className={`setup-file-zone ${isDragActive ? 'drag-active' : ''} ${attemptedSubmit && !csvFile ? 'error' : ''}`}
                     style={attemptedSubmit && !csvFile ? { borderColor: 'var(--red)' } : {}}
                     onDragOver={e => { e.preventDefault(); setIsDragActive(true); }}
                     onDragLeave={() => setIsDragActive(false)}
                     onDrop={e => {
                       e.preventDefault();
                       setIsDragActive(false);
                       if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                         setCsvFile(e.dataTransfer.files[0])
                       }
                     }}
                     onClick={() => document.getElementById('csv-upload').click()}
                   >
                     <span className="material-symbols-outlined">cloud_upload</span>
                     <div style={{ fontWeight: '500', color: 'var(--text-primary)', fontSize: '14px' }}>
                       Click to upload or drag and drop
                     </div>
                     <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                       CSV or Excel files only
                     </div>
                     <input 
                       id="csv-upload"
                       type="file" 
                       accept=".csv, .xlsx, .xls"
                       style={{ display: 'none' }}
                       onChange={e => {
                         if (e.target.files && e.target.files[0]) {
                           setCsvFile(e.target.files[0])
                         }
                       }}
                     />
                   </div>
                 ) : (
                   <div className="setup-file-selected">
                     <div className="file-info">
                       <span className="material-symbols-outlined" style={{ color: 'var(--green)', fontSize: '20px' }}>description</span>
                       <span>{csvFile.name}</span>
                     </div>
                     <button className="file-delete" onClick={() => setCsvFile(null)} title="Remove file">
                       <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                     </button>
                   </div>
                 )}
            </div>
            
            <div className="form-group">
              <label className="form-label">Sender Name *</label>
              <input className={getInputClass(senderName)} placeholder="e.g. Neurathon Team" value={senderName} onChange={e => setSenderName(e.target.value)} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Base Email Template *</label>
              <textarea className={getTextAreaClass(emailTemplate)} placeholder="Hi {name}, you are registered as {role}..." value={emailTemplate} onChange={e => setEmailTemplate(e.target.value)} />
            </div>
          </div>

          <div>
            <button className="btn-swarm" onClick={handleSave}>
              <span className="material-symbols-outlined">save</span>
              💾 Save & Unlock Agents
            </button>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>Reset & Start Over</button>
            </div>
          </div>
        </div>

        {/* RIGHT COL: TRACKER */}
        <div style={{ position: 'sticky', top: '90px', height: 'fit-content' }}>
          <div className="agent-card">
            <h3 className="section-title">Setup Checklist</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="progress-step">
                 <StepIndicator num="1" complete={step1Complete} inProgress={step1InProgress} />
                 <div>
                   <div style={{ fontSize: '14px', fontWeight: '600' }}>Basic Info</div>
                   <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Event name, date, venue, description</div>
                 </div>
              </div>
              <div className="progress-step">
                 <StepIndicator num="2" complete={step2Complete} inProgress={step2InProgress} />
                 <div>
                   <div style={{ fontSize: '14px', fontWeight: '600' }}>Audience & Content</div>
                   <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Target audience and social platforms</div>
                 </div>
              </div>
              <div className="progress-step">
                 <StepIndicator num="3" complete={step3Complete} inProgress={step3InProgress} />
                 <div>
                   <div style={{ fontSize: '14px', fontWeight: '600' }}>Speaker Details</div>
                   <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Key speakers for content generation</div>
                 </div>
              </div>
              <div className="progress-step">
                 <StepIndicator num="4" complete={step4Complete} inProgress={false} />
                 <div>
                   <div style={{ fontSize: '14px', fontWeight: '600' }}>Schedule Upload</div>
                   <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Events JSON for conflict detection</div>
                 </div>
              </div>
              <div className="progress-step">
                 <StepIndicator num="5" complete={step5Complete} inProgress={false} />
                 <div>
                   <div style={{ fontSize: '14px', fontWeight: '600' }}>Participant CSV</div>
                   <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Attendee list for email personalisation</div>
                 </div>
              </div>
              <div className="progress-step">
                 <StepIndicator num="6" complete={step6Complete} inProgress={step6InProgress} />
                 <div>
                   <div style={{ fontSize: '14px', fontWeight: '600' }}>Email Template</div>
                   <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Template for bulk communications</div>
                 </div>
              </div>
            </div>

            <div style={{ marginTop: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                <span>Setup Complete</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{completedStepsCount} of 6 steps complete</div>
            </div>

            <div style={{ marginTop: '32px' }}>
              <h3 className="section-title" style={{ fontSize: '11px', marginBottom: '12px' }}>Agent Readiness</h3>
              <div className="agent-readiness-item">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🎨 Content Agent</span>
                <ReadyBadge ready={agents.content.ready} needs={agents.content.needs} />
              </div>
              <div className="agent-readiness-item">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📧 Email Agent</span>
                <ReadyBadge ready={agents.email.ready} needs={agents.email.needs} />
              </div>
              <div className="agent-readiness-item">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📅 Scheduler</span>
                <ReadyBadge ready={agents.scheduler.ready} needs={agents.scheduler.needs} />
              </div>
              <div className="agent-readiness-item">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: 'var(--purple)' }}>🔗 Swarm</span>
                <ReadyBadge ready={swarmReady} needs="All of the above" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
