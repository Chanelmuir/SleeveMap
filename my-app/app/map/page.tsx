'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MapPage() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.username) {
          router.replace(`/u/${data.username}`)
        } else {
          router.replace('/')
        }
      })
      .catch(() => router.replace('/'))
  }, [])

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '1rem', letterSpacing: '0.15em',
      textTransform: 'uppercase', color: 'var(--muted)',
    }}>
      <span style={{ color: 'var(--sleeve-gold)', marginRight: '0.75rem' }}>⬤</span>
      Loading...
    </div>
  )
}