import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { runScheduleAgent } from '../api'

const STATUS = {
  IDLE: 'Idle',
  RUNNING: 'Running',
  DONE: 'Done',
  ERROR: 'Error',
}

function StatusBadge({ status }) {
  const base =
    'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium'

  const styles =
    status === STATUS.RUNNING
      ? 'border-blue-400/50 bg-blue-500/10 text-blue-300'
      : status === STATUS.DONE
      ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300'
      : status === STATUS.ERROR
      ? 'border-red-400/50 bg-red-500/10 text-red-300'
      : 'border-zinc-600/80 bg-zinc-800/80 text-zinc-300'

  const dot =
    status === STATUS.RUNNING
      ? 'bg-blue-400'
      : status === STATUS.DONE
      ? 'bg-emerald-400'
      : status === STATUS.ERROR
      ? 'bg-red-400'
      : 'bg-zinc-400'

  return (
    <span className={`${base} ${styles}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  )
}

export default function SchedulerAgent() {
  const [eventsJson, setEventsJson] = useState('')
  const [status, setStatus] = useState(STATUS.IDLE)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [scheduleData, setScheduleData] = useState(null)

  const handleRun = async () => {
    setIsRunning(true)
    setStatus(STATUS.RUNNING)
    setError('')
    setResult('')
    setScheduleData(null)

    let parsedPayload = null

    try {
      parsedPayload = eventsJson ? JSON.parse(eventsJson) : []
    } catch (parseError) {
      setError('Invalid JSON. Please provide a valid JSON event list.')
      setStatus(STATUS.ERROR)
      setIsRunning(false)
      return
    }

    try {
      const payload = {
        events: parsedPayload,
      }

      const data = await runScheduleAgent(payload)
      const formatted =
        typeof data === 'string' ? data : JSON.stringify(data, null, 2)

      setResult(formatted)
      if (typeof data === 'object' && data !== null) {
        setScheduleData(data)
      }
      setStatus(STATUS.DONE)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.error(message)
      setError(message)
      setStatus(STATUS.ERROR)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 text-sm text-zinc-100 shadow-xl shadow-black/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Scheduler Agent
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Paste a JSON list of events and let the agent propose or validate a schedule.
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
              Event List JSON
            </label>
            <textarea
              value={eventsJson}
              onChange={(e) => setEventsJson(e.target.value)}
              rows={10}
              placeholder={`[\n  {\n    "title": "Speaker Check‑in",\n    "start": "2026-03-13T09:00:00",\n    "end": "2026-03-13T09:30:00",\n    "location": "Green Room"\n  }\n]`}
              className="min-h-[180px] resize-y rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-[11px] text-zinc-100 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-zinc-500">
              Sends a POST to{' '}
              <span className="font-mono text-[10px] text-zinc-400">
                /api/schedule
              </span>
            </p>
            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {isRunning && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              <span>{isRunning ? 'Running...' : 'Run Agent'}</span>
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
              Visual Schedule
            </label>
          </div>
          {scheduleData && (scheduleData.resolved_schedule || scheduleData.original_schedule) ? (
            <div className="max-h-72 space-y-2 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950/95 p-3 text-xs leading-relaxed text-zinc-100 shadow-inner">
              {(scheduleData.resolved_schedule || scheduleData.original_schedule).map(
                (event, idx) => {
                  const name = event.name || event.title || `Event ${idx + 1}`
                  const speaker = event.speaker || event.host || 'TBA'
                  const start = event.start_time || event.start || event.startTime || ''
                  const end = event.end_time || event.end || event.endTime || ''
                  const room = event.room || event.location || 'Main Hall'

                  const changes = Array.isArray(scheduleData.changes_made)
                    ? scheduleData.changes_made
                    : []
                  const changed = changes.some((c) =>
                    typeof c === 'string'
                      ? c.toLowerCase().includes(String(name).toLowerCase())
                      : false,
                  )

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col gap-1 rounded-lg border bg-zinc-900/80 px-3 py-2 ${
                        changed ? 'border-l-4 border-l-amber-400/80' : 'border-zinc-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-zinc-50">
                          {name}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400">
                          {start && end ? `${start} → ${end}` : start || 'Time TBA'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                        <span>
                          <span className="font-semibold text-zinc-300">Speaker:</span>{' '}
                          {speaker}
                        </span>
                        <span>
                          <span className="font-semibold text-zinc-300">Room:</span>{' '}
                          {room}
                        </span>
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-500">
              Run the scheduler to see a visual list of events here.
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
              Raw Response
            </label>
            <pre className="max-h-40 min-h-[96px] overflow-auto rounded-xl border border-zinc-800 bg-zinc-950/95 p-3 text-[11px] leading-relaxed text-zinc-100 shadow-inner">
              {result || 'The agent response will appear here.'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

