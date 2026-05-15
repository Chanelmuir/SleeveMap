'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SyncOnLoadInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!searchParams.get('syncing')) return

    setStatus('Syncing your activities...')

    fetch('/api/sync', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        setStatus(`Synced ${data.synced} activities`)
        router.replace('/map')
      })
      .catch(() => setStatus('Sync failed — try refreshing'))
  }, [])

  if (!status) return null

  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem',
      background: 'var(--bg2)', border: '1px solid var(--border)',
      padding: '0.75rem 1.25rem', fontSize: '0.75rem',
      letterSpacing: '0.05em', color: 'var(--muted)',
      zIndex: 200,
    }}>
      <span style={{ color: 'var(--orange)', marginRight: '0.5rem' }}>⬤</span>
      {status}
    </div>
  )
}

export default function SyncOnLoad() {
  return (
    <Suspense fallback={null}>
      <SyncOnLoadInner />
    </Suspense>
  )
}