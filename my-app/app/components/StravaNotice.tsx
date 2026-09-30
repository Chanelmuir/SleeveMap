'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

// Bump this if the notice text changes and everyone should see it again.
const STORAGE_KEY = 'strava-api-notice-ack-v2'

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}

function readAcknowledged() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    // localStorage unavailable — show the notice every visit
    return false
  }
}

export default function StravaNotice() {
  // Server snapshot is "acknowledged" so nothing renders until the client reads storage
  const acknowledged = useSyncExternalStore(subscribe, readAcknowledged, () => true)
  const [dismissed, setDismissed] = useState(false)
  const open = !acknowledged && !dismissed

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') acknowledge()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function acknowledge() {
    setDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // fail silently
    }
  }

  if (!open) return null

  return (
    <div
      onClick={acknowledge}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'var(--overlay-bg)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="strava-notice-title"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: '2px', maxWidth: '440px', width: '100%',
          padding: '2rem', color: 'var(--text)',
        }}
      >
        <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--sleeve-gold)', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Heads up
        </p>
        <h2
          id="strava-notice-title"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: '1.8rem', lineHeight: 1, textTransform: 'uppercase',
            marginBottom: '1rem',
          }}
        >
          Strava sync is <span style={{ color: 'var(--sleeve-gold)' }}>paused</span>
        </h2>
        <p style={{ fontSize: '0.8rem', lineHeight: 1.8, color: 'var(--muted)', marginBottom: '1rem' }}>
          Strava now charges for access to its API, so SleeveMap can no longer sync new activities or receive webhook updates.
        </p>
        <p style={{ fontSize: '0.8rem', lineHeight: 1.8, color: 'var(--muted)', marginBottom: '1rem' }}>
          You can still explore every activity synced before the change — your maps, profiles and route planner all keep working with that data.
        </p>
        <p style={{ fontSize: '0.8rem', lineHeight: 1.8, color: 'var(--muted)', marginBottom: '1.75rem' }}>
          Sign in with Strava still works, so you can view your map or delete your data from Settings at any time.
        </p>
        <button
          onClick={acknowledge}
          autoFocus
          style={{
            width: '100%', background: 'var(--sleeve-gold)', color: '#fff', border: 'none',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: '0.95rem', letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '0.85rem 2rem', borderRadius: '2px', cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}
