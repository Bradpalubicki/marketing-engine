'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { X, BookOpen, ChevronRight } from 'lucide-react'
import { HELP_CONTENT } from '@/lib/help-content'

// Normalize path: strip trailing slash, collapse /dashboard/settings/* to /dashboard/settings
function normalizePath(path: string): string {
  const p = path.replace(/\/$/, '')
  // Match most specific key first
  if (HELP_CONTENT[p]) return p
  // Try parent path for nested settings routes
  const parent = p.split('/').slice(0, -1).join('/')
  if (parent && HELP_CONTENT[parent]) return parent
  return p
}

const STORAGE_KEY = 'nustack_help_closed'

function getClosedPages(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function markPageClosed(path: string) {
  try {
    const closed = getClosedPages()
    if (!closed.includes(path)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...closed, path]))
    }
  } catch { /* noop */ }
}

export function HelpPanel() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const normalizedPath = normalizePath(pathname)
  const content = HELP_CONTENT[normalizedPath]

  const close = useCallback(() => {
    setOpen(false)
    markPageClosed(normalizedPath)
  }, [normalizedPath])

  // Reset open state on route change — don't auto-open if user previously closed this page
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  if (!content) return null

  return (
    <>
      {/* Trigger button — appears in top-right area of page, below HelpAgent */}
      <button
        onClick={() => setOpen(true)}
        title="Page guide"
        style={{
          position: 'fixed',
          top: '18px',
          right: '80px',
          zIndex: 9990,
          background: '#0A1628',
          border: '1.5px solid rgba(245,200,66,0.35)',
          borderRadius: '8px',
          color: '#F5C842',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = '#F5C842'
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(245,200,66,0.2)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(245,200,66,0.35)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)'
        }}
      >
        <BookOpen size={13} />
        <span className="hidden sm:inline">Guide</span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9991,
            background: 'rgba(0,0,0,0.25)',
          }}
        />
      )}

      {/* Slide-in panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(380px, 92vw)',
          zIndex: 9992,
          background: '#0A1628',
          borderLeft: '1px solid rgba(245,200,66,0.18)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.45)',
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(245,200,66,0.12)',
          background: '#132038',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>Page Guide</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#F5C842', lineHeight: 1.3 }}>{content.title}</div>
          </div>
          <button
            onClick={close}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: '6px',
              color: '#94a3b8',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          {/* What section */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#F5C842', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>What This Page Does</div>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.65', margin: 0 }}>{content.what}</p>
          </div>

          {/* How to use */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#F5C842', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>How To Use It</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {content.howTo.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{
                    flexShrink: 0,
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(245,200,66,0.12)',
                    border: '1px solid rgba(245,200,66,0.25)',
                    color: '#F5C842',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '1px',
                  }}>
                    {i + 1}
                  </div>
                  <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.65', margin: 0 }}>{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          {content.tips && content.tips.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#F5C842', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>Pro Tips</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {content.tips.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <ChevronRight size={13} style={{ color: '#F5C842', flexShrink: 0, marginTop: '3px' }} />
                    <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full docs link */}
          <div style={{
            padding: '14px',
            background: 'rgba(245,200,66,0.05)',
            border: '1px solid rgba(245,200,66,0.12)',
            borderRadius: '8px',
            marginTop: 'auto',
          }}>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px' }}>Need the full reference?</p>
            <a
              href="/dashboard/help"
              style={{
                fontSize: '12px',
                color: '#F5C842',
                textDecoration: 'none',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Open Operating Manual <ChevronRight size={12} />
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
