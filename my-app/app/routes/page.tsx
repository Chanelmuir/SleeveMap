'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'

interface Waypoint {
  lng: number
  lat: number
  nextProfile: 'mapbox/walking' | 'mapbox/cycling' | 'straight'
}

interface SavedRoute {
  id: string
  name: string
  waypoints: Waypoint[]
  distance_km: number | null
  created_at: string
}

function formatDistance(km: number | null) {
  if (km === null) return '—'
  return km >= 1 ? `${km.toFixed(2)} km` : `${Math.round(km * 1000)} m`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function profileSummary(waypoints: Waypoint[]): string {
  const profiles = new Set(waypoints.slice(0, -1).map(w => w.nextProfile))
  const labels: Record<string, string> = {
    'mapbox/walking': 'Run',
    'mapbox/cycling': 'Cycle',
    'straight': 'Straight',
  }
  return Array.from(profiles).map(p => labels[p] ?? p).join(' · ') || '—'
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<SavedRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/routes')
      .then(r => r.json())
      .then(data => setRoutes(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function startRename(route: SavedRoute) {
    setRenamingId(route.id)
    setRenameValue(route.name)
  }

  async function saveRename(id: string) {
    if (!renameValue.trim()) { setRenamingId(null); return }
    const res = await fetch(`/api/routes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameValue.trim() }),
    })
    if (res.ok) {
      setRoutes(prev => prev.map(r => r.id === id ? { ...r, name: renameValue.trim() } : r))
    }
    setRenamingId(null)
  }

  async function confirmDelete(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setRoutes(prev => prev.filter(r => r.id !== id))
    }
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  function shareRoute(id: string) {
    const url = `${window.location.origin}/plan/${id}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      {/* Header */}
      <div style={{
        maxWidth: '1000px', margin: '0 auto',
        padding: '7rem 2.5rem 3rem',
        borderBottom: '1px solid var(--border)',
      }}>
        <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--sleeve-gold)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          Your routes
        </p>
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
          fontSize: 'clamp(2.5rem, 6vw, 4rem)', textTransform: 'uppercase',
          lineHeight: 0.95, marginBottom: '0.75rem',
        }}>
          Saved Routes
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', letterSpacing: '0.04em' }}>
          {loading ? 'Loading...' : `${routes.length} route${routes.length !== 1 ? 's' : ''} saved`}
        </p>
      </div>

      {/* Table header */}
      {!loading && routes.length > 0 && (
        <div style={{
          maxWidth: '1000px', margin: '0 auto',
          padding: '0.75rem 2.5rem',
          display: 'grid', gridTemplateColumns: '1fr 110px 140px 110px 200px',
          gap: '1rem', borderBottom: '1px solid var(--border)',
        }}>
          {['Name', 'Distance', 'Profile', 'Created', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase' }}>
              {h}
            </div>
          ))}
        </div>
      )}

      {/* Rows */}
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {loading && (
          <div style={{ padding: '4rem 2.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--sleeve-gold)', marginRight: '0.5rem' }}>⬤</span>Loading routes...
          </div>
        )}

        {!loading && routes.length === 0 && (
          <div style={{ padding: '5rem 2.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
              You haven't saved any routes yet.
            </p>
            <Link href="/plan" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
              background: 'var(--sleeve-gold)', color: '#fff', textDecoration: 'none',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '0.7rem 1.5rem', borderRadius: '2px',
            }}>
              Plan a route
            </Link>
          </div>
        )}

        {routes.map(route => (
          <div
            key={route.id}
            style={{
              padding: '1.25rem 2.5rem',
              display: 'grid',
              gridTemplateColumns: '1fr 110px 140px 110px 200px',
              gap: '1rem', alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Name — editable */}
            <div>
              {renamingId === route.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => saveRename(route.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveRename(route.id)
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--sleeve-gold)',
                    color: 'var(--text)', fontSize: '0.95rem', fontWeight: 600,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    padding: '0.3rem 0.5rem', outline: 'none', width: '100%',
                  }}
                />
              ) : (
                <button
                  onClick={() => startRename(route)}
                  title="Click to rename"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                    fontSize: '0.95rem', color: 'var(--text)', textAlign: 'left',
                    padding: 0, letterSpacing: '0.02em',
                  }}
                >
                  {route.name}
                </button>
              )}
              <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: '0.2rem', letterSpacing: '0.04em' }}>
                {route.waypoints.length} waypoints
              </div>
            </div>

            {/* Distance */}
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
              {formatDistance(route.distance_km)}
            </div>

            {/* Profile breakdown */}
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.03em' }}>
              {profileSummary(route.waypoints)}
            </div>

            {/* Created date */}
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.03em' }}>
              {formatDate(route.created_at)}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              {confirmDeleteId === route.id ? (
                <>
                  <button
                    onClick={() => confirmDelete(route.id)}
                    disabled={deletingId === route.id}
                    style={{
                      fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                      padding: '0.4rem 0.7rem', border: 'none', cursor: 'pointer',
                      background: 'var(--sleeve-gold)', color: '#fff',
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                    }}
                  >
                    {deletingId === route.id ? '...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    style={{
                      fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                      padding: '0.4rem 0.7rem', border: '1px solid var(--border)', cursor: 'pointer',
                      background: 'transparent', color: 'var(--muted)',
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={`/plan/${route.id}`}
                    style={{
                      fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase',
                      padding: '0.4rem 0.7rem', textDecoration: 'none',
                      background: 'var(--sleeve-gold)', color: '#fff',
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                    }}
                  >
                    Open
                  </Link>
                  <button
                    onClick={() => shareRoute(route.id)}
                    title="Copy share link"
                    style={{
                      fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase',
                      padding: '0.4rem 0.7rem', border: '1px solid var(--border)', cursor: 'pointer',
                      background: 'transparent', color: copiedId === route.id ? 'var(--sleeve-gold)' : 'var(--muted)',
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                    }}
                  >
                    {copiedId === route.id ? '✓ Copied' : 'Share'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(route.id)}
                    title="Delete route"
                    style={{
                      fontSize: '0.65rem', padding: '0.4rem 0.6rem', border: '1px solid var(--border)',
                      cursor: 'pointer', background: 'transparent', color: 'rgba(255,100,100,0.7)',
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                    }}
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}