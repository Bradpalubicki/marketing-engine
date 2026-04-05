'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function HelpAgent() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/help/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json() as { content?: string; error?: string }
      if (data.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content! }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Try again.' }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open help agent"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: '#0A1628',
          border: '2px solid #F5C842',
          color: '#F5C842',
          fontSize: '22px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 9999,
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(245,200,66,0.25)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)' }}
      >
        {open ? '✕' : '?'}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '88px',
            right: '24px',
            width: '340px',
            height: 'min(580px, calc(100vh - 120px))',
            background: '#0A1628',
            border: '1px solid rgba(245,200,66,0.2)',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            zIndex: 9998,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(245,200,66,0.15)',
            background: '#132038',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#F5C842' }}>Marketing Engine Help</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Ask anything about the platform</div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            {messages.length === 0 && (
              <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                <p style={{ marginBottom: '8px' }}>Hi Brad. Ask me anything about the Marketing Engine:</p>
                <ul style={{ paddingLeft: '16px', color: '#475569' }}>
                  <li style={{ marginBottom: '4px' }}>"What runs automatically every day?"</li>
                  <li style={{ marginBottom: '4px' }}>"How do I add a new location?"</li>
                  <li style={{ marginBottom: '4px' }}>"Why is my campaign paused?"</li>
                  <li style={{ marginBottom: '4px' }}>"How does lead nurture work?"</li>
                </ul>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '88%',
                    padding: '10px 13px',
                    borderRadius: msg.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                    background: msg.role === 'user' ? '#1e3a5f' : '#132038',
                    border: msg.role === 'user' ? '1px solid rgba(245,200,66,0.15)' : '1px solid rgba(255,255,255,0.06)',
                    fontSize: '13px',
                    lineHeight: '1.65',
                    color: msg.role === 'user' ? '#e2e8f0' : '#cbd5e1',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '10px 13px',
                  borderRadius: '12px 12px 12px 3px',
                  background: '#132038',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#64748b',
                  fontSize: '13px',
                }}>
                  Thinking…
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '12px 14px',
            borderTop: '1px solid rgba(245,200,66,0.1)',
            background: '#0d1e36',
            flexShrink: 0,
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question…"
              disabled={loading}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(245,200,66,0.15)',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#e2e8f0',
                fontSize: '13px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              style={{
                background: '#F5C842',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 14px',
                color: '#0A1628',
                fontWeight: 700,
                fontSize: '13px',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !input.trim() ? 0.5 : 1,
                transition: 'opacity 0.15s',
                flexShrink: 0,
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}
