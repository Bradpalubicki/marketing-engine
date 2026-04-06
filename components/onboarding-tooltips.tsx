'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight } from 'lucide-react'

const STORAGE_KEY = 'nustack_onboarded'

const STEPS = [
  {
    title: 'Welcome to your command center',
    body: 'This is your dashboard — see all clients, campaign performance, and alerts that need attention at a glance.',
    cta: 'Next',
  },
  {
    title: 'Add your first client',
    body: 'Go to the Intake link in the left sidebar to add a client and build their campaign profile. The completeness score tells you when you\'re ready to launch.',
    cta: 'Next',
  },
  {
    title: 'Every page has a guide',
    body: 'Click the Guide button in the top-right of any page to see what it does and how to use it — without leaving your work.',
    cta: 'Got it',
  },
]

export function OnboardingTooltips() {
  const [step, setStep] = useState<number | null>(null)

  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY)
      if (!done) setStep(0)
    } catch { /* noop */ }
  }, [])

  function advance() {
    if (step === null) return
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      dismiss()
    }
  }

  function dismiss() {
    setStep(null)
    try { localStorage.setItem(STORAGE_KEY, 'true') } catch { /* noop */ }
  }

  if (step === null) return null

  const current = STEPS[step]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(0,0,0,0.5)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10001,
          width: 'min(380px, 90vw)',
          background: '#0A1628',
          border: '1px solid rgba(245,200,66,0.25)',
          borderRadius: '14px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Gold accent bar */}
        <div style={{ height: '3px', background: '#F5C842' }} />

        <div style={{ padding: '24px' }}>
          {/* Step indicators */}
          <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  height: '3px',
                  flex: 1,
                  borderRadius: '2px',
                  background: i <= step ? '#F5C842' : 'rgba(255,255,255,0.1)',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>

          <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Step {step + 1} of {STEPS.length}
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F5C842', marginBottom: '10px', lineHeight: 1.3 }}>
            {current.title}
          </h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.65', marginBottom: '24px' }}>
            {current.body}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={dismiss}
              style={{
                background: 'none',
                border: 'none',
                color: '#475569',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              Skip
            </button>
            <button
              onClick={advance}
              style={{
                background: '#F5C842',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                color: '#0A1628',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {current.cta} {step < STEPS.length - 1 && <ChevronRight size={13} />}
            </button>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={dismiss}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            borderRadius: '6px',
            color: '#64748b',
            width: '26px',
            height: '26px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={13} />
        </button>
      </div>
    </>
  )
}
