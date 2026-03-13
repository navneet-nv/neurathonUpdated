import React, { useState, useRef, useEffect } from 'react'
import { api } from '../shared'
import { toast } from 'react-hot-toast'

export default function QAPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = async (textOverride) => {
    const textToSend = typeof textOverride === 'string' ? textOverride : input.trim()
    if (!textToSend || isSending) return

    const userMsg = { role: 'user', text: textToSend }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsSending(true)

    try {
      const payload = {
        question: textToSend,
        event_name: 'Neurathon 26',
        schedule: [],
        generated_posts: {}
      }

      const response = await api.post('/api/qa', payload)
      const answer = response.data?.answer || "I couldn't generate a response."
      setMessages(prev => [...prev, { role: 'bot', text: answer }])
    } catch (err) {
      console.error(err)
      toast.error('Failed to reach Q&A agent')
      setMessages(prev => [...prev, { role: 'bot', text: 'Error connecting to graph memory.' }])
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header-card" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="page-header">Participant Q&A Bot</h2>
          <p className="page-subtitle" style={{ margin: 0 }}>Ground your answers in the orchestrated event context.</p>
        </div>
        <span className="badge badge-done" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--green)' }}>INNOVATION FEATURE</span>
      </div>

      <div className="chat-window">
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px' }}>forum</span>
            <p style={{ fontSize: '13px' }}>Ask logistics questions to test the agent.</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.role}`}>
              {msg.text}
            </div>
          ))
        )}
        
        {isSending && (
          <div className="chat-bubble bot" style={{ padding: 0 }}>
            <div className="typing-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && (
        <div className="suggestion-chips">
          <div className="chip" onClick={() => handleSend("What time does the keynote start?")}>What time does the keynote start?</div>
          <div className="chip" onClick={() => handleSend("Where is the venue?")}>Where is the venue?</div>
          <div className="chip" onClick={() => handleSend("What is the submission format?")}>What is the submission format?</div>
          <div className="chip" onClick={() => handleSend("Who are the judges?")}>Who are the judges?</div>
          <div className="chip" onClick={() => handleSend("What's the prize pool?")}>What's the prize pool?</div>
        </div>
      )}

      <div className="chat-input-row">
        <textarea 
          className="form-textarea" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about Neurathon 26..."
          style={{ flexGrow: 1 }}
        />
        <button 
          className="btn-primary" 
          onClick={handleSend} 
          disabled={isSending}
          style={{ padding: '0 24px' }}
        >
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>
    </div>
  )
}
