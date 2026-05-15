'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'

interface Profile {
  id: string
  username: string
  full_name: string
  avatar_url: string
  is_public: boolean
  last_synced_at: string | null
  activity_count: number
}

function Avatar({ name, avatarUrl, size = 40 }: { name: string; avatarUrl?: string; size?: number }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name} style={{
        width: size, height: size, borderRadius: '50%',
        objectFit: 'cover', flexShrink: 0,
      }} />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'rgba(252,76,2,0.2)', border: '1px solid rgba(252,76,2,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
      fontSize: size * 0.35, color: 'var(--orange)', flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

export default function ExplorePage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'All' | 'Public' | 'Private'>('All')

  useEffect(() => {
    fetch('/api/profiles')
      .then(r => r.json())
      .then(data => {
        setProfiles(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = profiles.filter(p => {
    const matchSearch =
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.username?.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'All' ||
      (filter === 'Public' && p.is_public) ||
      (filter === 'Private' && !p.is_public)
    return matchSearch && matchFilter
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      {/* Header */}
      <div style={{
        maxWidth: '1100px', margin: '0 auto',
        padding: '7rem 2.5rem 3rem',
        borderBottom: '1px solid var(--border)',
      }}>
        <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          Community
        </p>
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', textTransform: 'uppercase',
          lineHeight: 0.95, marginBottom: '0.75rem',
        }}>
          Explorer
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', letterSpacing: '0.04em' }}>
          {loading ? 'Loading...' : `${profiles.length} athlete${profiles.length !== 1 ? 's' : ''} on SleeveMap`}
        </p>
      </div>

      {/* Controls */}
      <div style={{
        maxWidth: '1100px', margin: '0 auto',
        padding: '1.25rem 2.5rem',
        display: 'flex', gap: '1rem', alignItems: 'center',
        borderBottom: '1px solid var(--border)',
      }}>
        <input
          type="text"
          placeholder="Search athletes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            color: 'var(--text)', padding: '0.5rem 1rem',
            fontSize: '0.75rem', letterSpacing: '0.05em',
            fontFamily: "'DM Mono', monospace", outline: 'none',
            width: '220px', borderRadius: '2px',
          }}
        />

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {(['All', 'Public', 'Private'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '0.4rem 0.85rem', borderRadius: '2px', cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              background: filter === f ? 'var(--orange)' : 'transparent',
              color: filter === f ? '#fff' : 'var(--muted)',
              border: filter === f ? 'none' : '1px solid var(--border)',
              transition: 'all 0.15s',
            }}>
              {f}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.08em' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table header */}
      <div style={{
        maxWidth: '1100px', margin: '0 auto',
        padding: '0.75rem 2.5rem',
        display: 'grid', gridTemplateColumns: '1fr 120px 120px 160px',
        gap: '1rem', borderBottom: '1px solid var(--border)',
      }}>
        {['Athlete', 'Activities', 'Status', ''].map(h => (
          <div key={h} style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase' }}>
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {loading && (
          <div style={{ padding: '4rem 2.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
            <span style={{ color: 'var(--orange)', marginRight: '0.5rem' }}>⬤</span>
            Loading athletes...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: '4rem 2.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
            No athletes found
          </div>
        )}

        {filtered.map(profile => (
          <div
            key={profile.id}
            style={{
              padding: '1.25rem 2.5rem',
              display: 'grid', gridTemplateColumns: '1fr 120px 120px 160px',
              gap: '1rem', alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Athlete */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Avatar name={profile.full_name} avatarUrl={profile.avatar_url} />
              <div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                  fontSize: '1rem', color: 'var(--text)', marginBottom: '0.2rem',
                }}>
                  {profile.full_name}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.05em' }}>
                  @{profile.username}
                </div>
              </div>
            </div>

            {/* Activity count */}
            <div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                fontSize: '1.3rem', color: 'var(--text)', lineHeight: 1,
              }}>
                {profile.activity_count.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '0.2rem' }}>
                activities
              </div>
            </div>

            {/* Public / Private badge */}
            <div>
              <span style={{
                fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '0.25rem 0.6rem',
                background: profile.is_public ? 'rgba(252,76,2,0.1)' : 'rgba(255,255,255,0.04)',
                color: profile.is_public ? 'var(--orange)' : 'var(--muted)',
                border: `1px solid ${profile.is_public ? 'rgba(252,76,2,0.25)' : 'var(--border)'}`,
              }}>
                {profile.is_public ? 'Public' : 'Private'}
              </span>
            </div>

            {/* Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {profile.is_public ? (
                <Link href={`/u/${profile.username}`} style={{
                  fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                  textDecoration: 'none', padding: '0.45rem 1.1rem',
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                  background: 'var(--orange)', color: '#fff', borderRadius: '2px',
                }}>
                  View Map
                </Link>
              ) : (
                <span style={{
                  fontSize: '0.65rem', color: 'var(--muted)',
                  letterSpacing: '0.06em', fontStyle: 'italic',
                }}>
                  Private
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 2.5rem' }}>
        <p style={{ fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.06em' }}>
          All signed-up athletes are listed. Only public profiles have viewable maps.
        </p>
      </div>
    </div>
  )
}