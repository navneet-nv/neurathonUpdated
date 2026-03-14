import React, { useState, useEffect } from 'react'
import { api } from '../shared'
import { toast } from 'react-hot-toast'
import { useEventConfig } from '../EventContext'

const STATUS_CYCLE = ['Pending', 'In Transit', 'Delivered', 'Setup Done']
const SEVERITY_COLORS = { Low: 'var(--green)', Medium: 'var(--cyan)', High: 'var(--purple)', Critical: 'var(--red)' }
const tabActiveStyle = { padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--blue)', background: 'rgba(74,144,255,0.15)', color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }
const tabCyanActive  = { ...tabActiveStyle, border: '1px solid var(--cyan)', background: 'rgba(0,212,255,0.15)', color: 'var(--cyan)' }
const tabInactive    = { padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }

const DEFAULT_CHECKLIST = ['Projector', 'Microphone', 'Seating', 'WiFi Router', 'Lighting']

export default function LogisticsPage() {
  const { logisticsState, setLogisticsState, eventName } = useEventConfig()
  const { activeTab, items, issues } = logisticsState
  const setActiveTab = t => setLogisticsState(p => ({ ...p, activeTab: t }))

  const [rooms, setRooms] = useState([])
  const [issueForm, setIssueForm] = useState({ description: '', severity: 'Medium', room: '', assigned_to: '' })
  const [issueLoading, setIssueLoading] = useState(false)
  const [vendorForm, setVendorForm] = useState({ name: '', room: '', eta: '', notes: '' })
  const [showVendorForm, setShowVendorForm] = useState(false)
  const [readinessResult, setReadinessResult] = useState(null)
  const [readinessLoading, setReadinessLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        await api.post('/api/logistics/seed')
      } catch {}
      try {
        const r = await api.get('/api/logistics')
        setLogisticsState(p => ({ ...p, items: r.data.items || [], issues: r.data.issues || [] }))
        setRooms(r.data.rooms || [])
      } catch {}
    }
    load()
  }, [])

  const cycleStatus = async (item) => {
    const idx = STATUS_CYCLE.indexOf(item.status)
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
    try {
      await api.put(`/api/logistics/item/${item._id}`, { status: next })
      setLogisticsState(p => ({
        ...p,
        items: p.items.map(i => i._id === item._id ? { ...i, status: next } : i)
      }))
      toast.success(`${item.name} → ${next}`)
    } catch { toast.error('Update failed') }
  }

  const handleReportIssue = async () => {
    if (!issueForm.description) return toast.error('Description required')
    setIssueLoading(true)
    try {
      const r = await api.post('/api/logistics/issue', issueForm)
      setLogisticsState(p => ({ ...p, issues: [...p.issues, r.data.issue] }))
      setIssueForm({ description: '', severity: 'Medium', room: '', assigned_to: '' })
      toast.success('Issue reported with AI suggestions')
    } catch { toast.error('Failed') }
    finally { setIssueLoading(false) }
  }

  const handleResolve = async (id) => {
    try {
      await api.put(`/api/logistics/issue/${id}`, { status: 'Resolved' })
      setLogisticsState(p => ({
        ...p,
        issues: p.issues.map(i => i._id === id ? { ...i, status: 'Resolved' } : i)
      }))
      toast.success('Issue resolved')
    } catch { toast.error('Failed') }
  }

  const handleAnalyse = async () => {
    setReadinessLoading(true)
    try {
      const r = await api.post('/api/logistics/analyse')
      setReadinessResult(r.data)
      toast.success(`Readiness: ${r.data.readiness_score}%`)
    } catch { toast.error('Analysis failed') }
    finally { setReadinessLoading(false) }
  }

  const equipmentItems = items.filter(i => i.type === 'equipment')
  const vendorItems = items.filter(i => i.type === 'vendor')
  const groupedByRoom = {}
  equipmentItems.forEach(i => {
    if (!groupedByRoom[i.room]) groupedByRoom[i.room] = []
    groupedByRoom[i.room].push(i)
  })

  return (
    <div>
      <div className="page-header-card">
        <div>
          <h2 className="page-header">📦 Logistics Agent</h2>
          <p className="page-subtitle">Track equipment · Manage vendors · Monitor room readiness</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button style={activeTab === 'equipment' ? tabActiveStyle : tabInactive} onClick={() => setActiveTab('equipment')}>🔧 Equipment</button>
        <button style={activeTab === 'vendors' ? tabActiveStyle : tabInactive} onClick={() => setActiveTab('vendors')}>🚚 Vendors</button>
        <button style={activeTab === 'readiness' ? tabCyanActive : tabInactive} onClick={() => setActiveTab('readiness')}>🏛 Room Readiness</button>
        <button style={activeTab === 'issues' ? tabCyanActive : tabInactive} onClick={() => setActiveTab('issues')}>⚠️ Issues</button>
      </div>

      {/* ══ EQUIPMENT ══ */}
      {activeTab === 'equipment' && (
        <div>
          {Object.keys(groupedByRoom).length === 0 ? (
            <div className="agent-card"><div className="empty-state">No equipment data. Load a schedule with rooms in the Event Setup page.</div></div>
          ) : (
            Object.entries(groupedByRoom).sort(([a], [b]) => a.localeCompare(b)).map(([room, roomItems]) => (
              <div key={room} className="agent-card" style={{ marginBottom: '1rem' }}>
                <h3>🏛 {room}</h3>
                {roomItems.map(item => {
                  const statusColor = item.status === 'Setup Done' ? 'var(--green)' : item.status === 'Delivered' ? 'var(--cyan)' : item.status === 'In Transit' ? 'var(--purple)' : 'var(--text-muted)'
                  return (
                    <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>{item.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="badge" style={{ color: statusColor, borderColor: statusColor }}>{item.status}</span>
                        <button className="btn-sm edit" onClick={() => cycleStatus(item)}>→</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      )}

      {/* ══ VENDORS ══ */}
      {activeTab === 'vendors' && (
        <div className="agent-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3>Vendors ({vendorItems.length})</h3>
            {!showVendorForm && <button className="btn btn-primary" onClick={() => setShowVendorForm(true)}>+ Add Vendor</button>}
          </div>
          {showVendorForm && (
            <div style={{ background: 'var(--bg-input)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={vendorForm.name} onChange={e => setVendorForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Room</label><select className="form-input" value={vendorForm.room} onChange={e => setVendorForm(p => ({ ...p, room: e.target.value }))}><option value="">—</option>{rooms.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                <div className="form-group"><label className="form-label">ETA</label><input className="form-input" type="date" value={vendorForm.eta} onChange={e => setVendorForm(p => ({ ...p, eta: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={vendorForm.notes} onChange={e => setVendorForm(p => ({ ...p, notes: e.target.value }))} /></div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button className="btn-sm" onClick={() => setShowVendorForm(false)}>Cancel</button>
                <button className="btn-sm save" onClick={async () => {
                  if (!vendorForm.name) return toast.error('Name required')
                  // Create as a vendor type logistics item via a direct DB push is not possible from frontend
                  // For now we just add a placeholder — the backend doesn't have a dedicated vendor-add route
                  toast.success('Vendor added locally')
                  setLogisticsState(p => ({ ...p, items: [...p.items, { _id: Date.now().toString(), type: 'vendor', name: vendorForm.name, room: vendorForm.room, status: 'Pending', eta: vendorForm.eta, notes: vendorForm.notes }] }))
                  setVendorForm({ name: '', room: '', eta: '', notes: '' })
                  setShowVendorForm(false)
                }}>Add</button>
              </div>
            </div>
          )}
          {vendorItems.length === 0 ? (
            <div className="empty-state">No vendors tracked yet. Add one above.</div>
          ) : (
            vendorItems.map(v => (
              <div key={v._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{v.name}</span>
                  {v.room && <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '8px' }}>{v.room}</span>}
                  {v.eta && <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '8px' }}>ETA: {v.eta}</span>}
                </div>
                <span className="badge" style={{ color: v.status === 'Delivered' ? 'var(--green)' : 'var(--text-muted)' }}>{v.status}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ══ ROOM READINESS ══ */}
      {activeTab === 'readiness' && (
        <div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleAnalyse} disabled={readinessLoading}>
              {readinessLoading ? '⏳ Analysing...' : '🤖 Run Readiness Check'}
            </button>
            {readinessResult && (
              <div className="metric-card" style={{ padding: '8px 16px' }}>
                <div className="metric-value" style={{ color: readinessResult.readiness_score >= 80 ? 'var(--green)' : readinessResult.readiness_score >= 50 ? 'var(--cyan)' : 'var(--red)' }}>
                  {readinessResult.readiness_score}%
                </div>
                <div className="metric-label">Overall Readiness</div>
              </div>
            )}
          </div>

          {rooms.length === 0 ? (
            <div className="agent-card"><div className="empty-state">No rooms found in schedule. Load a schedule with rooms first.</div></div>
          ) : (
            rooms.map(room => {
              const roomEq = equipmentItems.filter(i => i.room === room)
              const done = roomEq.filter(i => i.status === 'Setup Done').length
              const total = roomEq.length || 1
              const pct = Math.round((done / total) * 100)
              return (
                <div key={room} className="agent-card" style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3>🏛 {room}</h3>
                    <span style={{ fontWeight: 700, color: pct === 100 ? 'var(--green)' : 'var(--text-muted)' }}>{pct}% ready</span>
                  </div>
                  <div style={{ background: 'var(--bg-input)', borderRadius: '3px', height: '6px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div style={{ width: pct + '%', background: pct === 100 ? 'var(--green)' : pct >= 60 ? 'var(--cyan)' : 'var(--red)', height: '6px', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                  </div>
                  {DEFAULT_CHECKLIST.map(name => {
                    const match = roomEq.find(i => i.name === name)
                    const isDone = match?.status === 'Setup Done'
                    return (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                        <span style={{ color: isDone ? 'var(--green)' : 'var(--text-muted)', fontSize: '16px' }}>{isDone ? '☑' : '☐'}</span>
                        <span style={{ fontSize: '13px', color: isDone ? 'var(--text-primary)' : 'var(--text-muted)', textDecoration: isDone ? 'line-through' : 'none' }}>{name}</span>
                        {match && !isDone && <button className="btn-sm" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => cycleStatus(match)}>→ {STATUS_CYCLE[(STATUS_CYCLE.indexOf(match.status) + 1) % STATUS_CYCLE.length]}</button>}
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}

          {readinessResult && (
            <div className="output-terminal" style={{ marginTop: '1rem' }}>
              <p style={{ fontWeight: 700, color: 'var(--cyan)', marginBottom: '8px' }}>🤖 GPT-4o Readiness Report</p>
              {readinessResult.risks?.length > 0 && (
                <>
                  <p style={{ fontWeight: 600, color: 'var(--red)', marginBottom: '4px' }}>Risks:</p>
                  <ul style={{ paddingLeft: 18, margin: '0 0 12px' }}>{readinessResult.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
                </>
              )}
              {readinessResult.actions?.length > 0 && (
                <>
                  <p style={{ fontWeight: 600, color: 'var(--green)', marginBottom: '4px' }}>Actions:</p>
                  <ul style={{ paddingLeft: 18, margin: 0 }}>{readinessResult.actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ ISSUES ══ */}
      {activeTab === 'issues' && (
        <div>
          <div className="agent-card" style={{ marginBottom: '1.5rem' }}>
            <h3>Report Issue</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px' }}>
              <div className="form-group"><label className="form-label">Description *</label><input className="form-input" value={issueForm.description} onChange={e => setIssueForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="form-group">
                <label className="form-label">Severity</label>
                <select className="form-input" value={issueForm.severity} onChange={e => setIssueForm(p => ({ ...p, severity: e.target.value }))}>
                  {['Low', 'Medium', 'High', 'Critical'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Room</label>
                <select className="form-input" value={issueForm.room} onChange={e => setIssueForm(p => ({ ...p, room: e.target.value }))}>
                  <option value="">—</option>
                  {rooms.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Assigned To</label><input className="form-input" value={issueForm.assigned_to} onChange={e => setIssueForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={handleReportIssue} disabled={issueLoading}>
              {issueLoading ? '⏳ Getting AI suggestions...' : '🚨 Report Issue'}
            </button>
          </div>

          <div className="agent-card">
            <h3>Issues ({issues.length})</h3>
            {issues.length === 0 ? (
              <div className="empty-state">No issues reported yet.</div>
            ) : (
              issues.map(issue => (
                <div key={issue._id} style={{ background: 'var(--bg-input)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', borderLeft: `3px solid ${SEVERITY_COLORS[issue.severity] || 'var(--text-muted)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>{issue.description}</span>
                      <span className="badge" style={{ marginLeft: '8px', color: SEVERITY_COLORS[issue.severity] }}>{issue.severity}</span>
                      {issue.room && <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '8px' }}>📍 {issue.room}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="badge" style={{ color: issue.status === 'Resolved' ? 'var(--green)' : 'var(--red)' }}>{issue.status}</span>
                      {issue.status !== 'Resolved' && <button className="btn-sm save" onClick={() => handleResolve(issue._id)}>✓ Resolve</button>}
                    </div>
                  </div>
                  {issue.suggestions && (
                    <div className="output-terminal" style={{ padding: '10px', marginTop: '8px' }}>
                      <p style={{ fontWeight: 600, color: 'var(--cyan)', fontSize: '12px', marginBottom: '4px' }}>🤖 AI Resolution Steps</p>
                      {issue.suggestions.steps?.map((s, i) => <p key={i} style={{ fontSize: '12px', margin: '2px 0' }}>{i + 1}. {s}</p>)}
                      {issue.suggestions.estimated_time && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>⏱ Est: {issue.suggestions.estimated_time}</p>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
