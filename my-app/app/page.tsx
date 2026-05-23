'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'

interface SiteStats {
  totalActivities: number
  publicProfiles: number
  totalDistanceKm: number
  chanelActivities: number
  chanelDistanceKm: number
}

function formatStat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export default function HomePage() {
  const [stats, setStats] = useState<SiteStats | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})

    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setLoggedIn(true) })
      .catch(() => {})
  }, [])

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section style={{
        position: 'relative', minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', padding: '8rem 2rem 4rem',
      }}>
        {/* Animated route background */}
        <svg
          style={{ position: 'absolute', inset: 0, opacity: 0.35 }}
          viewBox="0 0 1200 900"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {[150, 300, 450, 600, 750].map(y => (
            <line key={y} x1="0" y1={y} x2="1200" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
          ))}
          {[200, 400, 600, 800, 1000].map(x => (
            <line key={x} x1={x} y1="0" x2={x} y2="900" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
          ))}
          <path className="route-path"
            d="M 80 600 C 120 560 180 520 240 500 C 300 480 340 460 380 420 C 420 380 460 340 500 300 C 540 260 570 230 600 200 C 630 170 670 150 700 140"
            fill="none" stroke="rgba(252,76,2,0.6)" strokeWidth="1.5"
            style={{ animationDuration: '4s', animationDelay: '0.2s' }}/>
          <path className="route-path"
            d="M 100 620 C 140 580 190 535 250 515 C 310 495 350 475 395 435 C 435 395 470 355 512 315 C 552 275 580 248 610 218 C 640 188 678 165 706 154"
            fill="none" stroke="rgba(252,76,2,0.35)" strokeWidth="1"
            style={{ animationDuration: '4s', animationDelay: '0.5s' }}/>
          <path className="route-path"
            d="M 60 640 C 110 590 175 545 230 520 C 285 495 330 468 375 428 C 418 388 458 348 498 308 C 538 268 568 238 598 208 C 626 180 660 156 690 145"
            fill="none" stroke="rgba(252,76,2,0.4)" strokeWidth="1.2"
            style={{ animationDuration: '4s', animationDelay: '0.8s' }}/>
          <path className="route-path"
            d="M 700 140 C 730 155 770 175 810 200 C 850 225 880 258 910 295 C 940 332 960 368 980 408 C 1000 448 1020 488 1040 530"
            fill="none" stroke="rgba(252,76,2,0.5)" strokeWidth="1.5"
            style={{ animationDuration: '3.5s', animationDelay: '1.8s' }}/>
          <path className="route-path"
            d="M 200 750 C 240 720 290 690 340 665 C 390 640 440 618 490 595 C 540 572 580 555 615 540 C 650 525 690 515 710 510"
            fill="none" stroke="rgba(252,76,2,0.3)" strokeWidth="1"
            style={{ animationDuration: '3s', animationDelay: '2.2s' }}/>
          <path className="route-path"
            d="M 850 800 C 870 770 890 730 910 690 C 930 650 945 610 955 570 C 965 530 970 490 975 455"
            fill="none" stroke="rgba(252,76,2,0.4)" strokeWidth="1.2"
            style={{ animationDuration: '2.5s', animationDelay: '2.8s' }}/>
          {/* Hotspots */}
          <circle cx="600" cy="200" r="8" fill="rgba(252,76,2,0.12)"/>
          <circle cx="600" cy="200" r="4" fill="rgba(252,76,2,0.25)"/>
          <circle cx="700" cy="140" r="10" fill="rgba(252,76,2,0.15)"/>
          <circle cx="700" cy="140" r="5" fill="rgba(252,76,2,0.35)"/>
        </svg>

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: '760px' }}>
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            Powered by Strava
          </p>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: 'clamp(3.5rem, 10vw, 7rem)', lineHeight: 0.95,
            textTransform: 'uppercase', marginBottom: '1.5rem',
          }}>
            Cover every<br/>
            <span style={{ color: 'var(--sleeve-gold)' }}>road.</span>
          </h1>
          <p style={{ fontSize: '0.85rem', lineHeight: 1.8, color: 'var(--muted)', maxWidth: '440px', margin: '0 auto 2.5rem' }}>
            Connect your Strava and see every road you&apos;ve ever covered — stitched together on a single map. Streets are the arms of a city, your runs are the sleeves keeping them warm.
          </p>
          <Link href={loggedIn ? '/map' : '/api/auth/strava'} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
            background: 'var(--orange)', color: '#fff', textDecoration: 'none',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: '0.95rem', letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '0.9rem 2rem', borderRadius: '2px',
          }}>
            {loggedIn ? null : <StravaIcon />}
            {loggedIn ? 'You\'re signed in! View your sleeve' : 'Connect with Strava'}
          </Link>
          {!loggedIn && (
            <p style={{ marginTop: '1.2rem', fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.05em' }}>
              Free to use &nbsp;·&nbsp; Your data, your map
            </p>
          )}
        </div>
        {/* Database stats strip */}
        <div className="stats-strip" style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 4rem)',
          maxWidth: '1000px',
          borderTop: '1px solid var(--border)', 
          borderBottom: '1px solid var(--border)',
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          textAlign: 'center',
        }}>
          {[
            {
              num: stats ? formatStat(stats.totalActivities) : '—',
              label: 'Routes mapped',
            },
            {
              num: stats ? formatStat(stats.totalDistanceKm) : '—',
              label: 'Kilometres covered',
            },
            {
              num: stats ? formatStat(stats.publicProfiles) : '—',
              label: 'Public profiles',
            },
          ].map((s, i) => (
            <div key={s.label} className="stat" style={{
              padding: '2rem 1rem',
              borderRight: i < 2 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                fontSize: 'clamp(2rem, 5vw, 2.8rem)', color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1,
                transition: 'opacity 0.3s',
                opacity: stats ? 1 : 0.3,
              }}>{s.num}</div>
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', marginTop: '0.4rem' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ maxWidth: '1100px', margin: '0 auto', padding: '6rem 2rem' }}>
        <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--sleeve-gold)', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Why SleeveMap?
        </p>
        <h2 style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
          fontSize: 'clamp(2rem, 5vw, 3.5rem)', textTransform: 'uppercase',
          lineHeight: 1.05, marginBottom: '3rem',
        }}>
          Designed for<br/>street collectors
        </h2>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1px', background: 'var(--border)', border: '1px solid var(--border)',
        }}>
          {features.map(f => (
            <div key={f.title} style={{ background: 'var(--bg)', padding: '2rem', transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--sleeve-dark)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}>
              <div style={{ color: 'var(--sleeve-gold)', marginBottom: '1.25rem' }}>{f.icon}</div>
              <h3 style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                fontSize: '1.15rem', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.6rem',
              }}>{f.title}</h3>
              <p style={{ fontSize: '0.75rem', lineHeight: 1.8, color: 'var(--muted)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EXAMPLE MAP */}
      <section id="explore" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="example-inner" style={{
          maxWidth: '1100px', margin: '0 auto', padding: '5rem 2rem',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--sleeve-gold)', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Public profiles
            </p>
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              fontSize: 'clamp(2rem, 5vw, 3.5rem)', textTransform: 'uppercase',
              lineHeight: 1.05, marginBottom: '1.5rem',
            }}>
              Share your<br/>sleeve
            </h2>
            <p style={{ fontSize: '0.78rem', lineHeight: 1.9, color: 'var(--muted)', marginBottom: '2rem' }}>
              Every public profile gets a clean URL you can share anywhere. Show the world every road you&apos;ve covered — no account needed to view.
            </p>
            <Link href="/explore" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
              background: 'var(--orange)', color: '#fff', textDecoration: 'none',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '0.7rem 1.5rem', borderRadius: '2px',
            }}>
              Explore public maps
            </Link>
          </div>

          {/* Example map */}
          <div style={{ position: 'relative', aspectRatio: '1', background: '#0d0d0d', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <img src="/example_map.png" alt="Example sleeve map" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
            <div style={{
              position: 'absolute', top: '1rem', left: '1rem',
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              background: 'rgba(8,8,8,0.9)', border: '1px solid var(--border)',
              padding: '0.4rem 0.75rem', fontSize: '0.65rem', letterSpacing: '0.08em', color: 'var(--muted)',
            }}>
              <img src="https://dgalywyr863hv.cloudfront.net/pictures/athletes/31069937/11808415/9/large.jpg" alt="Example avatar" style={{ width: 21, height: 21, borderRadius: '50%', background: 'var(--white)', opacity: 0.8 }}/>
              the_sleeve
            </div>
            <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'rgba(8,8,8,0.9)', border: '1px solid var(--border)', padding: '0.4rem 0.75rem' }}>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.08em', color: 'var(--muted)' }}><strong style={{ color: 'var(--text)', fontWeight: 400 }}>{stats?.chanelActivities}</strong> activities</span>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.08em', color: 'var(--muted)' }}><strong style={{ color: 'var(--text)', fontWeight: 400 }}>{stats?.chanelDistanceKm?.toLocaleString()}</strong> km total</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '2rem 2.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '0.65rem', letterSpacing: '0.08em', color: 'var(--muted)',
      }}>
        <Link href="/" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1.2rem', color: 'var(--text)', textDecoration: 'none' }}>
          Sleeve<span style={{ color: 'var(--sleeve-gold)' }}>Map</span>
        </Link>
        <div style={{ display: 'flex', gap: '2rem' }}>
          {[['Privacy', '/privacy'], ['Terms', '/terms'], ['GitHub', 'https://github.com/Chanelmuir/Strava-Heatmap']].map(([label, href]) => (
            <Link key={label} href={href} style={{ color: 'var(--muted)', textDecoration: 'none' }}>{label}</Link>
          ))}
        </div>
      </footer>
    </>
  )
}

function StravaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
    </svg>
  )
}

const features = [
  {
    title: 'Every street, one view',
    desc: 'Every run, ride, and hike layered on a single map. Watch your sleeve\'s fill out as you cover more ground.',
    icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>,
  },
  {
    title: 'Instant sync',
    desc: 'After connecting Strava, your entire history is fetched and stored. New activities stitch themselves in automatically via webhooks.',
    icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
  },
  {
    title: 'Public sleeves',
    desc: "Optionally share your sleeve at a public URL. Show the world how much ground you've covered — or stitch in silence...",
    icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>,
  },
  {
    title: 'Filter by anything',
    desc: 'Narrow by sport type, year, distance, or date range. See exactly how your sleeve has grown over time.',
    icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/></svg>,
  },
  {
    title: 'Plan with Friends',
    desc: 'Use our planning tool to map out routes with friends. See where your sleeves overlap, and find new streets together.',
    icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>,
  },
  {
    title: 'Private by default',
    desc: 'Your sleeve is yours. Maps are private until you choose to share. Strava tokens are stored securely, never exposed.',
    icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
  },
]