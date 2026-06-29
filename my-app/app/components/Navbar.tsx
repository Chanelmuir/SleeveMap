'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import ThemeToggle from './ThemeToggle'

interface UserProfile {
  username: string
  full_name: string
  avatar_url: string
}

export default function Navbar() {
  const pathname = usePathname()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [avatarHovered, setAvatarHovered] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setProfile(data) })
      .catch(() => {})
  }, [])

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const navLink = (href: string, label: string, mobile = false) => {
    const active = (pathname === href)
    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        style={{
          color: active ? 'var(--text)' : 'var(--muted)',
          textDecoration: 'none',
          fontSize: mobile ? '0.95rem' : '0.75rem',
          letterSpacing: '0.08em',
          transition: 'color 0.2s',
          borderBottom: active && !mobile ? '1px solid var(--sleeve-gold)' : '1px solid transparent',
          paddingBottom: mobile ? 0 : '2px',
          fontFamily: mobile ? "'Barlow Condensed', sans-serif" : undefined,
          fontWeight: mobile ? 600 : undefined,
        }}
      >
        {label}
      </Link>
    )
  }

  const initials = profile?.full_name
    ?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const avatarBlock = (
    <Link
      href="/settings"
      onClick={() => setMobileOpen(false)}
      onMouseEnter={() => setAvatarHovered(true)}
      onMouseLeave={() => setAvatarHovered(false)}
      title={`${profile?.full_name} · Settings`}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        textDecoration: 'none',
      }}
    >
      <div style={{
        borderRadius: '50%',
        outline: avatarHovered ? '2px solid var(--sleeve-gold)' : '2px solid transparent',
        outlineOffset: '2px',
        transition: 'outline-color 0.2s',
      }}>
        {profile?.avatar_url ? (
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
      </div>
    </Link>
  )

  const connectButton = (
    <Link
      href="/api/auth/strava"
      onClick={() => setMobileOpen(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
        background: 'var(--orange)', color: '#fff',
        textDecoration: 'none',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 600, fontSize: '0.8rem',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        padding: '0.45rem 1rem', borderRadius: '2px',
        width: 'fit-content',
      }}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
      </svg>
      Connect Strava
    </Link>
  )

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      borderBottom: '1px solid var(--border)',
      background: 'var(--nav-bg)',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.1rem 1.25rem',
      }}
      className="sm:px-10"
      >
        {/* Logo */}
        <Link href="/" onClick={() => setMobileOpen(false)} style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700, fontSize: '1.4rem',
          letterSpacing: '0.05em', color: 'var(--text)',
          textDecoration: 'none', flexShrink: 0,
        }}>
          Sleeve<span style={{ color: 'var(--sleeve-gold)' }}>Map</span>
        </Link>

        {/* Desktop nav — hidden below md */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: '2rem' }}>
          {navLink('/explore', 'Explorer')}
          {navLink('/plan', 'Plan')}
          {profile && navLink('/routes', 'Routes')}

          {profile ? (
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              {navLink('/map', 'My Map')}
              {avatarBlock}
            </div>
          ) : (
            connectButton
          )}

          <ThemeToggle />
        </div>

        {/* Mobile controls — theme toggle + hamburger, hidden at md+ */}
        <div className="flex md:hidden" style={{ alignItems: 'center', gap: '0.75rem' }}>
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(v => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px',
              color: 'var(--text)', cursor: 'pointer',
            }}
          >
            {mobileOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--bg)',
            padding: '1.25rem 1.5rem 1.5rem',
            display: 'flex', flexDirection: 'column', gap: '1.1rem',
          }}
        >
          {navLink('/explore', 'Explorer', true)}
          {navLink('/plan', 'Plan', true)}
          {profile && navLink('/routes', 'Routes', true)}
          {profile && navLink('/map', 'My Map', true)}

          <div style={{ height: 1, background: 'var(--border)', margin: '0.25rem 0' }} />

          {profile ? avatarBlock : connectButton}
        </div>
      )}
    </nav>
  )
}