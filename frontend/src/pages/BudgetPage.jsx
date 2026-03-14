import React, { useState, useEffect } from 'react'
import { api } from '../shared'
import { toast } from 'react-hot-toast'
import { useEventConfig } from '../EventContext'

const CATEGORIES = ['Venue', 'Catering', 'Tech', 'Marketing', 'Prizes', 'Transport', 'Accommodation', 'Misc']
const tabActiveStyle = { padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--blue)', background: 'rgba(74,144,255,0.15)', color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }
const tabInactive    = { padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }

export default function BudgetPage() {
  const { budgetState, setBudgetState, eventName } = useEventConfig()
  const { activeTab, overview, expenses, analyses } = budgetState
  const setActiveTab = t => setBudgetState(p => ({ ...p, activeTab: t }))

  const [setupForm, setSetupForm] = useState({ total: overview?.total || 0, allocations: overview?.allocations || {} })
  const [expenseForm, setExpenseForm] = useState({ name: '', amount: '', vendor: '', date: '', category: '', notes: '' })
  const [filterCat, setFilterCat] = useState('All')
  const [analysisResult, setAnalysisResult] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)

  useEffect(() => {
    api.get('/api/budget').then(r => {
      const d = r.data
      setBudgetState(p => ({
        ...p,
        overview: { total: d.total, allocations: d.allocations, summary: d.summary },
        expenses: d.expenses || [],
      }))
      setSetupForm({ total: d.total || 0, allocations: d.allocations || {} })
    }).catch(() => {})
  }, [])

  const totalBudget = overview?.total || 0
  const totalSpent = overview?.summary?.total_spent || expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const remaining = totalBudget - totalSpent
  const allocs = overview?.allocations || {}
  const spentByCat = overview?.summary?.spent_by_category || {}

  const handleSetup = async () => {
    try {
      await api.post('/api/budget/setup', setupForm)
      toast.success('Budget saved')
      const r = await api.get('/api/budget')
      setBudgetState(p => ({ ...p, overview: { total: r.data.total, allocations: r.data.allocations, summary: r.data.summary }, expenses: r.data.expenses || [] }))
    } catch { toast.error('Failed to save budget') }
  }

  const handleAddExpense = async () => {
    if (!expenseForm.name || !expenseForm.amount) return toast.error('Name and Amount required')
    try {
      const res = await api.post('/api/budget/expense', {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category || 'Auto-detect',
      })
      toast.success(`Expense added (${res.data.expense.category})`)
      setExpenseForm({ name: '', amount: '', vendor: '', date: '', category: '', notes: '' })
      const r = await api.get('/api/budget')
      setBudgetState(p => ({ ...p, overview: { total: r.data.total, allocations: r.data.allocations, summary: r.data.summary }, expenses: r.data.expenses || [] }))
    } catch { toast.error('Failed to add expense') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return
    try {
      await api.delete(`/api/budget/expense/${id}`)
      toast.success('Deleted')
      const r = await api.get('/api/budget')
      setBudgetState(p => ({ ...p, overview: { total: r.data.total, allocations: r.data.allocations, summary: r.data.summary }, expenses: r.data.expenses || [] }))
    } catch { toast.error('Failed') }
  }

  const handleAnalyse = async () => {
    setAnalysisLoading(true)
    try {
      const r = await api.post('/api/budget/analyse')
      setAnalysisResult(r.data)
      setBudgetState(p => ({ ...p, analyses: [...p.analyses, r.data] }))
      toast.success('Analysis complete')
    } catch { toast.error('Analysis failed') }
    finally { setAnalysisLoading(false) }
  }

  const handleExport = async () => {
    try {
      const r = await api.get('/api/budget/export')
      const blob = new Blob([r.data.csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'budget_expenses.csv'; a.click()
      toast.success(`Exported ${r.data.count} expenses`)
    } catch { toast.error('Export failed') }
  }

  const filteredExpenses = filterCat === 'All' ? expenses : expenses.filter(e => e.category === filterCat)

  return (
    <div>
      <div className="page-header-card">
        <div>
          <h2 className="page-header">💰 Budget Agent</h2>
          <p className="page-subtitle">Track expenses · Detect overruns · GPT-4o analysis</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {['overview', 'expenses', 'alerts', 'history'].map(t => (
          <button key={t} style={activeTab === t ? tabActiveStyle : tabInactive} onClick={() => setActiveTab(t)}>
            {t === 'overview' ? '📊 Overview' : t === 'expenses' ? '💳 Expenses' : t === 'alerts' ? '🚨 Alerts' : '📜 History'}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW ══ */}
      {activeTab === 'overview' && (
        <div>
          {/* Setup form if no budget yet */}
          {!totalBudget && (
            <div className="agent-card" style={{ marginBottom: '1.5rem' }}>
              <h3>Setup Budget</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                  <label className="form-label">Total Budget (₹)</label>
                  <input className="form-input" type="number" value={setupForm.total} onChange={e => setSetupForm(p => ({ ...p, total: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <p className="form-label" style={{ marginBottom: '8px' }}>Category Allocations</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', marginBottom: '1rem' }}>
                {CATEGORIES.map(c => (
                  <div key={c} className="form-group">
                    <label className="form-label">{c}</label>
                    <input className="form-input" type="number" value={setupForm.allocations[c] || ''} onChange={e => setSetupForm(p => ({ ...p, allocations: { ...p.allocations, [c]: parseFloat(e.target.value) || 0 } }))} />
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" onClick={handleSetup}>💾 Save Budget</button>
            </div>
          )}

          {/* Metric Cards */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="metric-card"><div className="metric-value">₹{totalBudget.toLocaleString()}</div><div className="metric-label">Total Budget</div></div>
            <div className="metric-card"><div className="metric-value" style={{ color: 'var(--red)' }}>₹{totalSpent.toLocaleString()}</div><div className="metric-label">Total Spent</div></div>
            <div className="metric-card"><div className="metric-value" style={{ color: remaining >= 0 ? 'var(--green)' : 'var(--red)' }}>₹{remaining.toLocaleString()}</div><div className="metric-label">Remaining</div></div>
          </div>

          {/* Category Breakdown */}
          {totalBudget > 0 && (
            <div className="agent-card">
              <h3>Category Breakdown</h3>
              {CATEGORIES.map(cat => {
                const allocated = allocs[cat] || 0
                const spent = spentByCat[cat] || 0
                const pct = allocated > 0 ? Math.min((spent / allocated) * 100, 120) : 0
                const isOver = pct > 90
                return (
                  <div key={cat} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600 }}>{cat}</span>
                      <span style={{ color: 'var(--text-muted)' }}>₹{spent.toLocaleString()} / ₹{allocated.toLocaleString()}</span>
                    </div>
                    <div style={{ background: 'var(--bg-input)', borderRadius: '3px', height: '6px', overflow: 'hidden' }}>
                      <div style={{ width: Math.min(pct, 100) + '%', background: isOver ? 'var(--red)' : 'var(--green)', height: '6px', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                )
              })}
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleAnalyse} disabled={analysisLoading}>
                {analysisLoading ? '⏳ Analysing...' : '🤖 Run Budget Analysis'}
              </button>
              {analysisResult && (
                <div className="output-terminal" style={{ marginTop: '1rem' }}>
                  <p style={{ fontWeight: 700, color: 'var(--cyan)', marginBottom: '8px' }}>GPT-4o Analysis</p>
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{analysisResult.insights}</p>
                  {analysisResult.suggestions?.length > 0 && (
                    <ul style={{ marginTop: '8px', paddingLeft: '18px' }}>
                      {analysisResult.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ EXPENSES ══ */}
      {activeTab === 'expenses' && (
        <div>
          <div className="agent-card" style={{ marginBottom: '1.5rem' }}>
            <h3>Add Expense</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
              <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={expenseForm.name} onChange={e => setExpenseForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Amount *</label><input className="form-input" type="number" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Vendor</label><input className="form-input" value={expenseForm.vendor} onChange={e => setExpenseForm(p => ({ ...p, vendor: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={expenseForm.date} onChange={e => setExpenseForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))}>
                  <option value="">Auto-detect</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '8px' }}><label className="form-label">Notes</label><textarea className="form-input" rows={2} value={expenseForm.notes} onChange={e => setExpenseForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={handleAddExpense}>+ Add Expense</button>
          </div>

          <div className="agent-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3>Expenses ({expenses.length})</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select className="form-input" style={{ width: 'auto' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={handleExport}>📥 Export CSV</button>
              </div>
            </div>
            {filteredExpenses.length === 0 ? (
              <div className="empty-state">No expenses yet. Add one above.</div>
            ) : (
              filteredExpenses.map((e, i) => (
                <div key={e.expense_id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{e.name}</span>
                    <span className="badge" style={{ marginLeft: '8px' }}>{e.category}</span>
                    {e.vendor && <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '8px' }}>{e.vendor}</span>}
                    {e.date && <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '8px' }}>{e.date}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--red)' }}>₹{(e.amount || 0).toLocaleString()}</span>
                    <button className="btn-sm delete" onClick={() => handleDelete(e.expense_id)}>✕</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ══ ALERTS ══ */}
      {activeTab === 'alerts' && (
        <div className="agent-card">
          <h3>🚨 Budget Alerts</h3>
          {(() => {
            const alerts = CATEGORIES.filter(c => {
              const a = allocs[c] || 0
              const s = spentByCat[c] || 0
              return a > 0 && (s / a) > 0.9
            })
            if (alerts.length === 0) return <div className="empty-state">✅ All categories within budget. No alerts.</div>
            return alerts.map(cat => {
              const a = allocs[cat] || 0
              const s = spentByCat[cat] || 0
              const pct = ((s / a) * 100).toFixed(1)
              return (
                <div key={cat} style={{ background: 'rgba(255,82,82,0.07)', border: '1px solid rgba(255,82,82,0.2)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ color: 'var(--red)', margin: 0 }}>⚠️ {cat}</h4>
                    <span className="badge" style={{ background: 'rgba(255,82,82,0.2)', color: 'var(--red)' }}>{pct}% used</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '8px 0' }}>
                    Allocated: ₹{a.toLocaleString()} · Spent: ₹{s.toLocaleString()} · Over by: ₹{Math.max(0, s - a).toLocaleString()}
                  </p>
                </div>
              )
            })
          })()}
        </div>
      )}

      {/* ══ HISTORY ══ */}
      {activeTab === 'history' && (
        <div>
          <h3>Analysis History</h3>
          {analyses.length === 0 ? (
            <div className="empty-state">No analyses yet. Run a budget analysis from the Overview tab.</div>
          ) : (
            analyses.slice().reverse().map((a, i) => (
              <div key={i} className="history-card" style={{ marginBottom: '1rem' }}>
                <div className="history-meta">{a.timestamp ? new Date(a.timestamp).toLocaleString() : 'Unknown time'}</div>
                <div className="history-body">
                  <p style={{ whiteSpace: 'pre-wrap' }}>{a.insights}</p>
                  {a.alerts?.length > 0 && (
                    <ul style={{ paddingLeft: 18, margin: '8px 0' }}>{a.alerts.map((al, j) => <li key={j} style={{ color: 'var(--red)' }}>{al}</li>)}</ul>
                  )}
                  {a.suggestions?.length > 0 && (
                    <ul style={{ paddingLeft: 18, margin: '8px 0' }}>{a.suggestions.map((s, j) => <li key={j}>{s}</li>)}</ul>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
