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
  last_accessed_at: string
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

const FONT = "'Barlow Condensed', sans-serif"

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

  const actionButtons = (route: SavedRoute) =>
    confirmDeleteId === route.id ? (
      <>
        <button
          onClick={() => confirmDelete(route.id)}
          disabled={deletingId === route.id}
          style={{
            fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '0.4rem 0.7rem', border: 'none', cursor: 'pointer',
            background: '#c0392b', color: '#fff', fontFamily: FONT, fontWeight: 600,
          }}
        >
          {deletingId === route.id ? '...' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirmDeleteId(null)}
          style={{
            fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '0.4rem 0.7rem', border: '1px solid var(--border)', cursor: 'pointer',
            background: 'transparent', color: 'var(--muted)', fontFamily: FONT, fontWeight: 600,
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
            fontFamily: FONT, fontWeight: 600,
          }}
        >
          Open
        </Link>
        <button
          onClick={() => shareRoute(route.id)}
          style={{
            fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '0.4rem 0.7rem', border: '1px solid var(--border)', cursor: 'pointer',
            background: 'transparent',
            color: copiedId === route.id ? 'var(--sleeve-gold)' : 'var(--muted)',
            fontFamily: FONT, fontWeight: 600,
          }}
        >
          {copiedId === route.id ? '✓ Copied' : 'Share'}
        </button>
        <button
          onClick={() => setConfirmDeleteId(route.id)}
          style={{
            fontSize: '0.65rem', padding: '0.4rem 0.6rem',
            border: '1px solid var(--border)', cursor: 'pointer',
            background: 'transparent', color: 'rgba(255,100,100,0.7)',
            fontFamily: FONT, fontWeight: 600,
          }}
        >
          ✕
        </button>
      </>
    )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <style>{`
        .routes-header {
          max-width: 1000px;
          margin: 0 auto;
          padding: 7rem 1.25rem 2.5rem;
          border-bottom: 1px solid var(--border);
        }
        .routes-container {
          max-width: 1000px;
          margin: 0 auto;
        }

        /* Desktop table header */
        .routes-table-header {
          display: none;
          padding: 0.75rem 2.5rem;
          gap: 1rem;
          border-bottom: 1px solid var(--border);
          grid-template-columns: 1fr 110px 140px 110px 200px;
        }

        /* Each route row */
        .route-row {
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
        }
        .route-row:hover {
          background: var(--bg2);
        }

        /* Mobile card — shown by default */
        .route-mobile {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
        }
        .route-mobile-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.75rem 1.25rem;
        }
        .route-mobile-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding-top: 0.25rem;
        }

        /* Desktop row — hidden by default */
        .route-desktop {
          display: none;
          padding: 1.25rem 2.5rem;
          gap: 1rem;
          align-items: center;
          grid-template-columns: 1fr 110px 140px 110px 200px;
        }
        .route-desktop-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        @media (min-width: 640px) {
          .routes-header {
            padding: 7rem 2.5rem 3rem;
          }
          .routes-table-header {
            display: grid;
          }
          .route-mobile {
            display: none;
          }
          .route-desktop {
            display: grid;
          }
        }
      `}</style>

      {/* Header */}
      <div className="routes-header">
        <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--sleeve-gold)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          Your routes
        </p>
        <h1 style={{
          fontFamily: FONT, fontWeight: 700,
          fontSize: 'clamp(2.5rem, 6vw, 4rem)', textTransform: 'uppercase',
          lineHeight: 0.95, marginBottom: '0.75rem',
        }}>
          Saved Routes
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', letterSpacing: '0.04em' }}>
          {loading ? 'Loading...' : `${routes.length} route${routes.length !== 1 ? 's' : ''} saved`}
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', letterSpacing: '0.04em', marginTop: '0.2rem' }}>
          Routes not opened in 30 days are automatically removed.
        </p>
      </div>

      <div className="routes-container">

        {/* Loading */}
        {loading && (
          <div style={{ padding: '4rem 1.25rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--sleeve-gold)', marginRight: '0.5rem' }}>⬤</span>
            Loading routes...
          </div>
        )}

        {/* Empty state */}
        {!loading && routes.length === 0 && (
          <div style={{ padding: '5rem 1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
              You haven't saved any routes yet.
            </p>
            <Link href="/plan" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
              background: 'var(--sleeve-gold)', color: '#fff', textDecoration: 'none',
              fontFamily: FONT, fontWeight: 600,
              fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '0.7rem 1.5rem',
            }}>
              Plan a route
            </Link>
          </div>
        )}

        {/* Desktop table header */}
        {!loading && routes.length > 0 && (
          <div className="routes-table-header">
            {['Name', 'Distance', 'Profile', 'Last opened', ''].map((h, i) => (
              <div key={i} style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                {h}
              </div>
            ))}
          </div>
        )}

        {/* Route list */}
        {routes.map(route => (
          <div key={route.id} className="route-row">

            {/* ── MOBILE ── */}
            <div className="route-mobile">
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
                      fontFamily: FONT, padding: '0.3rem 0.5rem', outline: 'none', width: '100%',
                    }}
                  />
                ) : (
                  <button
                    onClick={() => startRename(route)}
                    title="Click to rename"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: FONT, fontWeight: 600, fontSize: '0.95rem',
                      color: 'var(--text)', textAlign: 'left', padding: 0,
                    }}
                  >
                    {route.name}
                  </button>
                )}
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: '0.2rem', letterSpacing: '0.04em' }}>
                  {route.waypoints.length} waypoints
                </div>
              </div>

              <div className="route-mobile-meta">
                <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                  {formatDistance(route.distance_km)}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.03em' }}>
                  {profileSummary(route.waypoints)}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.03em' }}>
                  {formatDate(route.last_accessed_at)}
                </span>
              </div>

              <div className="route-mobile-actions">
                {actionButtons(route)}
              </div>
            </div>

            {/* ── DESKTOP ── */}
            <div className="route-desktop">
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
                      fontFamily: FONT, padding: '0.3rem 0.5rem', outline: 'none', width: '100%',
                    }}
                  />
                ) : (
                  <button
                    onClick={() => startRename(route)}
                    title="Click to rename"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: FONT, fontWeight: 600, fontSize: '0.95rem',
                      color: 'var(--text)', textAlign: 'left', padding: 0, letterSpacing: '0.02em',
                    }}
                  >
                    {route.name}
                  </button>
                )}
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: '0.2rem', letterSpacing: '0.04em' }}>
                  {route.waypoints.length} waypoints
                </div>
              </div>

              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                {formatDistance(route.distance_km)}
              </div>

              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.03em' }}>
                {profileSummary(route.waypoints)}
              </div>

              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.03em' }}>
                {formatDate(route.last_accessed_at)}
              </div>

              <div className="route-desktop-actions">
                {actionButtons(route)}
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}