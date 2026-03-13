import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { runContentAgent } from '../api'

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

export default function ContentAgent() {
  const [eventName, setEventName] = useState('')
  const [rawText, setRawText] = useState('')
  const [status, setStatus] = useState(STATUS.IDLE)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [isRunning, setIsRunning] = useState(false)

  const handleRun = async () => {
    setIsRunning(true)
    setStatus(STATUS.RUNNING)
    setError('')
    setResult('')

    try {
      const payload = {
        event_name: eventName || '',
        raw_text: rawText || '',
      }

      const data = await runContentAgent(payload)
      const formatted =
        typeof data === 'string' ? data : JSON.stringify(data, null, 2)

      setResult(formatted)
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
            Content Agent
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Generate and refine event marketing copy from raw notes or drafts.
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
              Event Name
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. Event Logistics Swarm Launch Meetup"
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
              Raw Notes / Draft Text
            </label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={6}
              placeholder="Paste messy brainstorm notes or a rough draft here. The agent will turn this into polished event copy."
              className="min-h-[140px] resize-y rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-zinc-500">
              Sends a POST to{' '}
              <span className="font-mono text-[10px] text-zinc-400">
                /api/content
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

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
            Agent Output
          </label>
          <div className="relative flex-1">
            <pre className="max-h-72 min-h-[180px] overflow-auto rounded-xl border border-zinc-800 bg-zinc-950/95 p-3 text-xs leading-relaxed text-zinc-100 shadow-inner">
              {result || 'The agent response will appear here.'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

