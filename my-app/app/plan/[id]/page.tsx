'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function SharedRoutePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/routes/${id}`)
      .then(r => {
        if (!r.ok) throw new Error(`Route not found (${r.status})`)
        return r.json()
      })
      .then(data => {
        sessionStorage.setItem('loadRoute', JSON.stringify(data))
        router.replace('/plan')
      })
      .catch(err => {
        console.error('Failed to load shared route:', err)
        setError(err.message)
      })
  }, [id])

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', 
      alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
        {error}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', 
    alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
      Loading route...
    </div>
  )
}