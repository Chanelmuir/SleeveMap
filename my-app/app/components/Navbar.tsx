'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface UserProfile {
  username: string
  full_name: string
  avatar_url: string
}

export default function Navbar() {
  const pathname = usePathname()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [avatarHovered, setAvatarHovered] = useState(false)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setProfile(data) })
      .catch(() => {})
  }, [])

  const navLink = (href: string, label: string) => {
    const active = pathname === href
    return (
      <Link href={href} style={{
        color: active ? 'var(--text)' : 'var(--muted)',
        textDecoration: 'none',
        fontSize: '0.75rem',
        letterSpacing: '0.08em',
        transition: 'color 0.2s',
        borderBottom: active ? '1px solid var(--orange)' : '1px solid transparent',
        paddingBottom: '2px',
      }}>
        {label}
      </Link>
    )
  }

  const initials = profile?.full_name
    ?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '1.25rem 2.5rem',
      borderBottom: '1px solid var(--border)',
      background: 'rgba(8,8,8,0.85)',
      backdropFilter: 'blur(12px)',
    }}>
      {/* Logo */}
      <Link href="/" style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700, fontSize: '1.4rem',
        letterSpacing: '0.05em', color: 'var(--text)',
        textDecoration: 'none',
      }}>
        Sleeve<span style={{ color: 'var(--orange)' }}>Map</span>
      </Link>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        {navLink('/explore', 'Explorer')}
        {navLink('/plan', 'Plan')}

        {profile ? (
          // Logged in — nav links + avatar
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            {navLink('/map', 'My Map')}

            {/* Avatar linking to settings */}
            <Link
              href="/settings"
              onMouseEnter={() => setAvatarHovered(true)}
              onMouseLeave={() => setAvatarHovered(false)}
              title={`${profile.full_name} · Settings`}
              style={{
                display: 'block', textDecoration: 'none',
                borderRadius: '50%',
                outline: avatarHovered ? '2px solid var(--orange)' : '2px solid transparent',
                outlineOffset: '2px',
                transition: 'outline-color 0.2s',
              }}
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    objectFit: 'cover', display: 'block',
                    opacity: avatarHovered ? 0.85 : 1,
                    transition: 'opacity 0.2s',
                  }}
                />
              ) : (
                // Fallback initials avatar
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(252,76,2,0.2)',
                  border: '1px solid rgba(252,76,2,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700, fontSize: '0.75rem', color: 'var(--orange)',
                }}>
                  {initials}
                </div>
              )}
            </Link>
          </div>
        ) : (
          // Logged out — Strava connect button
          <Link href="/api/auth/strava" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--orange)', color: '#fff',
            textDecoration: 'none',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600, fontSize: '0.8rem',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '0.45rem 1rem', borderRadius: '2px',
          }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
            </svg>
            Connect Strava
          </Link>
        )}
      </div>
    </nav>
  )
}