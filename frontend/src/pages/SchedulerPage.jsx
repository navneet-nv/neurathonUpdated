import React, { useState } from 'react'
import { api } from '../shared'
import { toast } from 'react-hot-toast'

export default function SchedulerPage() {
  const [activeTab, setActiveTab] = useState("plan")
  const [naturalInput, setNaturalInput] = useState("")
  const [events, setEvents] = useState([])
  const [parseLoading, setParseLoading] = useState(false)
  const [roomConflictModal, setRoomConflictModal] = useState(null)
  const [delayModal, setDelayModal] = useState(null)
  const [delayMinutes, setDelayMinutes] = useState(0)
  const [delayResult, setDelayResult] = useState(null)
  const [delayLoading, setDelayLoading] = useState(false)
  const [submittedDelays, setSubmittedDelays] = useState([])

  // --- HANDLERS ---

  const handleParseSchedule = async () => {
    if (!naturalInput.trim()) return toast.error("Please describe your schedule")
    setParseLoading(true)
    try {
      const response = await api.post('/api/schedule/parse', { natural_text: naturalInput })
      setEvents(response.data.events)
      if (response.data.has_room_conflicts) {
        setRoomConflictModal(response.data.room_conflicts)
      } else {
        toast.success("Schedule saved! " + response.data.events.length + " events planned.")
        setActiveTab("live")
      }
    } catch (err) {
      toast.error("Failed to parse. Check backend.")
    } finally {
      setParseLoading(false)
    }
  }

  const handleConflictConfirm = () => {
    setRoomConflictModal(null)
    toast.success("Schedule saved with parallel room sessions.")
    setActiveTab("live")
  }

  const handleConflictFix = () => {
    setRoomConflictModal(null)
    setEvents([])
  }

  const handleReportDelay = async () => {
    if (delayMinutes <= 0) return toast.error("Enter delay in minutes")
    setDelayLoading(true)
    try {
      const response = await api.post('/api/schedule/delay', {
        delayed_event_id: delayModal.id,
        delayed_event_name: delayModal.name,
        delay_minutes: delayMinutes,
        all_events: events
      })
      setDelayResult(response.data)
      setSubmittedDelays(prev => [...prev, delayModal.id])
      setDelayModal(null)
      toast.success("Delay reported. Impact analysis ready.")
    } catch (err) {
      toast.error("Failed. Check backend.")
    } finally {
      setDelayLoading(false)
    }
  }

  const tabActiveStyle = (color) => ({
    padding: "0.6rem 1.5rem",
    borderRadius: "8px",
    border: `1px solid ${color}`,
    background: `rgba(74,144,255,0.15)`,
    color: color,
    cursor: "pointer",
    fontWeight: 600
  })

  const tabInactiveStyle = {
    padding: "0.6rem 1.5rem",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    background: "var(--bg-card)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontWeight: 600
  }

  return (
    <div className="page-body">
      <div className="page-header-card">
        <h1>Scheduler Agent</h1>
        <p>Plan your event · Track delays · Get AI impact alerts</p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <button
          style={activeTab === "plan" ? tabActiveStyle("var(--blue)") : tabInactiveStyle}
          onClick={() => setActiveTab("plan")}
        >
          📋 Plan Schedule
        </button>
        <button
          style={activeTab === "live"
            ? { ...tabActiveStyle("var(--blue)"), border: "1px solid var(--cyan)", background: "rgba(0,212,255,0.15)", color: "var(--cyan)" }
            : tabInactiveStyle
          }
          onClick={() => setActiveTab("live")}
        >
          📡 Live Tracking
        </button>
      </div>

      {/* ═══ TAB 1 — Plan ═══ */}
      {activeTab === "plan" && (
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
          {/* Left */}
          <div className="agent-card" style={{ flex: 1 }}>
            <h3>Describe Your Event Schedule</h3>
            <div style={{
              background: "var(--bg-input)", borderRadius: "8px", padding: "0.75rem",
              marginBottom: "1rem", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.7
            }}>
              💡 Just type naturally. Example: Opening keynote by Dr. Rajan 9am–9:45am Hall A. Workshop by Prof. Kumar 10am–11:30am Room 101. Two things can run at the same time in different rooms — that's fine.
            </div>
            <textarea
              className="form-textarea"
              rows={9}
              placeholder="Type your full schedule in plain English..."
              value={naturalInput}
              onChange={(e) => setNaturalInput(e.target.value)}
            />
            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "1rem" }}
              onClick={handleParseSchedule}
              disabled={parseLoading || !naturalInput.trim()}
            >
              {parseLoading ? "Parsing with GPT-4o..." : "✨ Save Schedule"}
            </button>
          </div>

          {/* Right */}
          <div className="agent-card" style={{ flex: 1 }}>
            {events.length === 0 ? (
              <div className="empty-state">Your parsed schedule will appear here</div>
            ) : (
              <>
                <h3>Your Event Schedule</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                  {events.length} events planned
                </p>
                {events.map((event, idx) => (
                  <div key={idx} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "0.75rem", borderBottom: "1px solid var(--border)"
                  }}>
                    <div>
                      <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>{event.name}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                        {event.speaker ? event.speaker + " · " + event.room : event.room}
                      </p>
                    </div>
                    <p style={{ color: "var(--cyan)", fontWeight: 600, fontFamily: "monospace" }}>
                      {event.start_time} – {event.end_time}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ TAB 2 — Live Tracking ═══ */}
      {activeTab === "live" && (
        <>
          {events.length === 0 ? (
            <div className="agent-card">
              <div className="empty-state">Complete the Plan tab first to start live tracking</div>
            </div>
          ) : (
            <>
              <p className="output-label">Report a Delay</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                If an event ran over time, select it below and report the delay. The system will calculate the impact on downstream events.
              </p>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "1rem",
                marginBottom: "2rem"
              }}>
                {events.map((event, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "var(--bg-card)",
                      border: submittedDelays.includes(event.id)
                        ? "1px solid var(--purple)"
                        : "1px solid var(--border)",
                      borderRadius: "12px",
                      padding: "1.25rem",
                      cursor: submittedDelays.includes(event.id) ? "default" : "pointer"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <p style={{ fontWeight: 700, color: "var(--text-primary)" }}>{event.name}</p>
                      {submittedDelays.includes(event.id) && (
                        <span style={{
                          background: "rgba(123,97,255,0.2)", color: "var(--purple)",
                          borderRadius: "20px", padding: "2px 8px", fontSize: "0.72rem"
                        }}>
                          Delay Reported
                        </span>
                      )}
                    </div>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{event.room}</p>
                    <p style={{ color: "var(--cyan)", fontFamily: "monospace", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      {event.start_time} – {event.end_time}
                    </p>
                    {!submittedDelays.includes(event.id) && (
                      <button
                        className="btn"
                        style={{ width: "100%", fontSize: "0.82rem" }}
                        onClick={() => { setDelayModal(event); setDelayMinutes(0); setDelayResult(null) }}
                      >
                        ⏱ Report Delay
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {delayResult && (
                <div className="agent-card" style={{ marginTop: "1rem" }}>
                  <h3>⚠️ Impact Analysis — {delayResult.delayed_event}</h3>

                  <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                    <div className="metric-card">
                      <div className="metric-value">{delayResult.delay_minutes} min</div>
                      <div className="metric-label">Delay</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-value">{delayResult.affected_events.length}</div>
                      <div className="metric-label">Affected Events</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-value" style={{ color: "var(--cyan)", fontFamily: "monospace", fontSize: "1.1rem" }}>{delayResult.new_end_time}</div>
                      <div className="metric-label">New End Time</div>
                    </div>
                  </div>

                  {delayResult.affected_events.length > 0 ? (
                    <>
                      <p className="output-label">Affected Sessions</p>
                      {delayResult.affected_events.map((affected, idx) => (
                        <div key={idx} style={{ borderLeft: "3px solid var(--red)", paddingLeft: "1rem", marginBottom: "0.75rem" }}>
                          <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>{affected.name}</p>
                          <p style={{ color: "var(--red)", fontSize: "0.78rem" }}>
                            Reason: {affected.reason === "room" ? "Same room conflict" : "Same speaker conflict"}
                          </p>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p style={{ color: "var(--green)" }}>✅ No downstream events affected</p>
                  )}

                  <div style={{ background: "var(--bg-input)", borderRadius: "10px", padding: "1.25rem", marginTop: "1rem" }}>
                    <p style={{ color: "var(--cyan)", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.5rem" }}>🤖 GPT-4o Suggestion</p>
                    <p style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>{delayResult.suggestion}</p>
                  </div>

                  <div style={{
                    background: "rgba(255,82,82,0.08)", border: "1px solid rgba(255,82,82,0.2)",
                    borderRadius: "10px", padding: "1rem", marginTop: "1rem"
                  }}>
                    <p style={{ color: "var(--red)", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.4rem" }}>📣 Notification Message</p>
                    <p style={{ color: "var(--text-primary)", fontSize: "0.88rem", lineHeight: 1.6 }}>{delayResult.notification_message}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ═══ ROOM CONFLICT MODAL ═══ */}
      {roomConflictModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "480px", width: "90%" }}>
            <h2>🏠 Room Double-Booking Detected</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              The following room(s) have overlapping events. Is this intentional?
            </p>

            {roomConflictModal.map((conflict, idx) => (
              <div key={idx} style={{
                background: "var(--bg-input)", borderRadius: "8px",
                padding: "0.75rem", marginBottom: "0.5rem"
              }}>
                <p style={{ fontWeight: 600, color: "var(--red)" }}>{conflict.room}</p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  {conflict.event1_name} and {conflict.event2_name}
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  Overlap: {conflict.time_overlap}
                </p>
              </div>
            ))}

            <div className="modal-actions">
              <button className="btn btn-cancel" onClick={handleConflictFix}>✏️ Let me fix it</button>
              <button className="btn btn-approve" onClick={handleConflictConfirm}>✅ Yes, save as-is</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DELAY MODAL ═══ */}
      {delayModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "420px", width: "90%" }}>
            <h2>⏱ Report Delay</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
              {delayModal.name} · {delayModal.start_time}–{delayModal.end_time}
            </p>

            <div className="form-group">
              <label className="form-label">How many minutes did it run over?</label>
              <input
                type="number"
                className="form-input"
                min={1}
                max={120}
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-cancel" onClick={() => setDelayModal(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleReportDelay}
                disabled={delayLoading || delayMinutes <= 0}
              >
                {delayLoading ? "Analyzing impact..." : "Report & Analyze Impact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
