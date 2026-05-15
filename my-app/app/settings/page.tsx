'use client'

import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'

interface UserProfile {
  id: string
  username: string
  full_name: string
  avatar_url: string
  is_public: boolean
  last_synced_at: string | null
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: '44px', height: '24px', borderRadius: '12px',
        border: 'none', cursor: 'pointer', padding: '2px',
        background: on ? 'var(--orange)' : 'rgba(255,255,255,0.1)',
        transition: 'background 0.2s',
        display: 'flex', alignItems: 'center',
        justifyContent: on ? 'flex-end' : 'flex-start',
      }}
    >
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%',
        background: '#fff', transition: 'all 0.2s',
      }} />
    </button>
  )
}

function Row({ label, description, children }: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '1.5rem 2rem',
      borderBottom: '1px solid var(--border)',
      gap: '2rem',
    }}>
      <div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
          fontSize: '1rem', letterSpacing: '0.04em', color: 'var(--text)',
          textTransform: 'uppercase', marginBottom: description ? '0.3rem' : 0,
        }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.6, maxWidth: '420px' }}>
            {description}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>
        {children}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(data => {
        setProfile(data)
        setUsernameInput(data.username ?? '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function togglePublic(value: boolean) {
    if (!profile) return
    setSaving(true)
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_public: value }),
    })
    if (res.ok) {
      setProfile(p => p ? { ...p, is_public: value } : p)
      showToast(value ? 'Profile is now public' : 'Profile is now private')
    } else {
      showToast('Failed to update — try again')
    }
    setSaving(false)
  }

  async function saveUsername() {
    if (!usernameInput.trim()) return
    setSaving(true)
    setUsernameStatus('idle')
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput.trim() }),
    })
    if (res.ok) {
      setProfile(p => p ? { ...p, username: usernameInput.trim() } : p)
      setUsernameStatus('saved')
      showToast('Username updated')
    } else {
      setUsernameStatus('error')
      showToast('Username taken or invalid')
    }
    setSaving(false)
  }

  async function triggerSync() {
    setSyncing(true)
    setSyncResult(null)
    const res = await fetch('/api/sync', { method: 'POST' })
    const data = await res.json()
    if (data.ok) {
      setSyncResult(`Synced ${data.synced} activities across ${data.pages} page${data.pages !== 1 ? 's' : ''}`)
    } else {
      setSyncResult('Sync failed — check console for details')
    }
    setSyncing(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Navbar />
        <div style={{ paddingTop: '8rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
          Loading...
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Navbar />
        <div style={{ paddingTop: '8rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
          Not logged in
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '7rem 2rem 4rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Account
          </p>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: 'clamp(2.5rem, 6vw, 4rem)', textTransform: 'uppercase',
            lineHeight: 0.95,
          }}>
            Settings
          </h1>
        </div>

        {/* Profile card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1.25rem',
          padding: '1.5rem 2rem', marginBottom: '2rem',
          background: 'var(--bg2)', border: '1px solid var(--border)',
        }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name}
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(252,76,2,0.2)', border: '1px solid rgba(252,76,2,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1.1rem',
              color: 'var(--orange)',
            }}>
              {profile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '1.1rem', color: 'var(--text)' }}>
              {profile.full_name}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.05em' }}>
              @{profile.username}
              {profile.last_synced_at && (
                <span style={{ marginLeft: '1rem' }}>
                  Last synced {new Date(profile.last_synced_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Settings sections */}
        <div style={{ border: '1px solid var(--border)', marginBottom: '2rem' }}>

          {/* Section label */}
          <div style={{ padding: '0.75rem 2rem', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.6rem', letterSpacing: '0.18em', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Privacy
            </span>
          </div>

          <Row
            label="Public profile"
            description={`When enabled, your sleeve is visible at sleevemap.com/u/${profile.username} and listed in the Explorer. Visitors can see all your activities on the map but cannot access your Strava account.`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: profile.is_public ? 'var(--orange)' : 'var(--muted)', textTransform: 'uppercase' }}>
                {profile.is_public ? 'Public' : 'Private'}
              </span>
              <Toggle on={profile.is_public} onChange={togglePublic} />
            </div>
          </Row>

          {profile.is_public && (
            <Row label="Your public URL" description="Share this link so others can view your sleeve.">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                  /u/{profile.username}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/u/${profile.username}`)
                    showToast('Copied to clipboard')
                  }}
                  style={{
                    fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '0.3rem 0.75rem', border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                  }}
                >
                  Copy
                </button>
              </div>
            </Row>
          )}
        </div>

        <div style={{ border: '1px solid var(--border)', marginBottom: '2rem' }}>
          <div style={{ padding: '0.75rem 2rem', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.6rem', letterSpacing: '0.18em', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Profile
            </span>
          </div>

          <Row label="Username" description="Used in your public URL. Lowercase letters, numbers, and underscores only.">
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                value={usernameInput}
                onChange={e => {
                  setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                  setUsernameStatus('idle')
                }}
                onKeyDown={e => e.key === 'Enter' && saveUsername()}
                style={{
                  background: 'var(--bg2)', border: `1px solid ${usernameStatus === 'error' ? 'var(--orange)' : 'var(--border)'}`,
                  color: 'var(--text)', padding: '0.4rem 0.75rem',
                  fontSize: '0.72rem', fontFamily: "'DM Mono', monospace",
                  outline: 'none', width: '160px',
                }}
              />
              <button
                onClick={saveUsername}
                disabled={saving || usernameInput === profile.username}
                style={{
                  fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '0.4rem 0.9rem', border: 'none',
                  background: usernameInput === profile.username ? 'rgba(255,255,255,0.05)' : 'var(--orange)',
                  color: usernameInput === profile.username ? 'var(--muted)' : '#fff',
                  cursor: usernameInput === profile.username ? 'default' : 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </Row>
        </div>

        <div style={{ border: '1px solid var(--border)', marginBottom: '2rem' }}>
          <div style={{ padding: '0.75rem 2rem', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.6rem', letterSpacing: '0.18em', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Data
            </span>
          </div>

          <Row
            label="Re-sync Strava"
            description="Fetch all activities again from Strava. Useful if activities are missing or you've logged new ones on another device."
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
              <button
                onClick={triggerSync}
                disabled={syncing}
                style={{
                  fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '0.4rem 0.9rem', border: '1px solid var(--border)',
                  background: 'transparent', color: syncing ? 'var(--muted)' : 'var(--text)',
                  cursor: syncing ? 'default' : 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                }}
              >
                {syncing ? 'Syncing...' : 'Sync now'}
              </button>
              {syncResult && (
                <span style={{ fontSize: '0.62rem', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                  {syncResult}
                </span>
              )}
            </div>
          </Row>
        </div>

        {/* Danger zone */}
        <div style={{ border: '1px solid rgba(255,60,60,0.2)' }}>
          <div style={{ padding: '0.75rem 2rem', background: 'rgba(255,60,60,0.05)', borderBottom: '1px solid rgba(255,60,60,0.2)' }}>
            <span style={{ fontSize: '0.6rem', letterSpacing: '0.18em', color: 'rgba(255,100,100,0.7)', textTransform: 'uppercase' }}>
              Danger zone
            </span>
          </div>
          <Row label="Sign out" description="You can sign back in with Strava at any time. Your data will be preserved.">
            <a href="/api/auth/logout" style={{
              fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '0.4rem 0.9rem', border: '1px solid rgba(255,60,60,0.3)',
              background: 'transparent', color: 'rgba(255,100,100,0.7)',
              cursor: 'pointer', textDecoration: 'none',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            }}>
              Sign out
            </a>
          </Row>
        </div>

      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          padding: '0.75rem 1.25rem', fontSize: '0.72rem',
          letterSpacing: '0.05em', color: 'var(--text)', zIndex: 200,
        }}>
          <span style={{ color: 'var(--orange)', marginRight: '0.5rem' }}>⬤</span>
          {toast}
        </div>
      )}
    </div>
  )
}