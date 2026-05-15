'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import Link from 'next/link'
import Navbar from '../../components/Navbar'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const TYPE_COLORS: Record<string, string> = {
  Run:     '#FC4C02',
  Ride:    '#3498DB',
  Hike:    '#27AE60',
  Walk:    '#F39C12',
  Swim:    '#9B59B6',
  Default: '#FC4C02',
}

const SPORT_TYPES = ['All', 'Run', 'Ride', 'Hike', 'Walk', 'Swim']

interface UserProfile {
  username: string
  full_name: string
  avatar_url: string
  activity_count: number
}

interface ActivityProperties {
  id: string
  strava_id: number
  name: string
  type: string
  start_date: string
  distance_m: number
  moving_time_s: number
  elevation_m: number
  city: string | null
  country: string | null
}

function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fitToBounds(map: mapboxgl.Map, features: any[]) {
  const coords = features.flatMap((f: any) => f.geometry?.coordinates ?? [])
  if (coords.length === 0) return
  const bounds = coords.reduce(
    (b: mapboxgl.LngLatBounds, c: [number, number]) => b.extend(c),
    new mapboxgl.LngLatBounds(coords[0], coords[0])
  )
  map.fitBounds(bounds, { padding: 60, duration: 1000 })
}

export default function PublicMapPage() {
  const { username } = useParams<{ username: string }>()

  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const allFeatures = useRef<any[]>([])
  const currentFeatures = useRef<any[]>([])

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedType, setSelectedType] = useState('All')
  const [activityCount, setActivityCount] = useState(0)
  const [hovered, setHovered] = useState<ActivityProperties | null>(null)
  const [showFitButton, setShowFitButton] = useState(false)
  const [years, setYears] = useState<string[]>([])
  const [selectedYear, setSelectedYear] = useState('All')
  const isFirstRender = useRef(true)

  function applyFilters(type: string, year: string) {
    if (!map.current || allFeatures.current.length === 0) return

    const filtered = allFeatures.current.filter(f => {
      const matchType = type === 'All' || f.properties.type === type
      const matchYear = year === 'All' ||
        new Date(f.properties.start_date).getFullYear().toString() === year
      return matchType && matchYear
    })

    currentFeatures.current = filtered
    setActivityCount(filtered.length)

    const source = map.current.getSource('activities') as mapboxgl.GeoJSONSource
    if (source) {
      source.setData({ type: 'FeatureCollection', features: filtered })
    }

    if (!isFirstRender.current) setShowFitButton(true)
  }

  // Initialise map and load data
  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [0, 30],
      zoom: 2,
    })

    let hoveredId: string | number | null = null

    map.current.on('mousemove', 'activities-lines', (e) => {
      if (!e.features?.length || !map.current) return
      map.current.getCanvas().style.cursor = 'pointer'
      const feature = e.features[0]
      if (hoveredId !== null) {
        map.current.setFeatureState({ source: 'activities', id: hoveredId }, { hovered: false })
      }
      hoveredId = feature.id ?? null
      if (hoveredId !== null) {
        map.current.setFeatureState({ source: 'activities', id: hoveredId }, { hovered: true })
      }
      setHovered(feature.properties as ActivityProperties)
    })

    map.current.on('mouseleave', 'activities-lines', () => {
      if (!map.current) return
      map.current.getCanvas().style.cursor = ''
      if (hoveredId !== null) {
        map.current.setFeatureState({ source: 'activities', id: hoveredId }, { hovered: false })
        hoveredId = null
      }
      setHovered(null)
    })

    map.current.on('load', async () => {
      const res = await fetch(`/api/profiles/${username}`)

      if (res.status === 404) { setNotFound(true); setLoading(false); return }
      if (res.status === 403) { setIsPrivate(true); setLoading(false); return }

      const data = await res.json()
      setProfile(data.user)

      allFeatures.current = data.geojson.features
      currentFeatures.current = data.geojson.features
      setActivityCount(data.geojson.features.length)

      // Extract years
      const uniqueYears = [...new Set(
        data.geojson.features
          .map((f: any) => new Date(f.properties.start_date).getFullYear().toString())
          .filter(Boolean)
      )].sort((a: any, b: any) => Number(b) - Number(a)) as string[]
      setYears(uniqueYears)

      if (!map.current) return

      map.current.addSource('activities', {
        type: 'geojson',
        data: data.geojson,
        generateId: true,
      })

      map.current.addLayer({
        id: 'activities-lines',
        type: 'line',
        source: 'activities',
        paint: {
          'line-color': [
            'match', ['get', 'type'],
            'Run',  TYPE_COLORS.Run,
            'Ride', TYPE_COLORS.Ride,
            'Hike', TYPE_COLORS.Hike,
            'Walk', TYPE_COLORS.Walk,
            'Swim', TYPE_COLORS.Swim,
            TYPE_COLORS.Default,
          ],
          'line-opacity': 0.5,
          'line-width': 1.5,
        },
      })

      map.current.addLayer({
        id: 'activities-lines-hover',
        type: 'line',
        source: 'activities',
        paint: {
          'line-color': '#ffffff',
          'line-opacity': ['case', ['boolean', ['feature-state', 'hovered'], false], 1, 0],
          'line-width': 3,
        },
      })

      fitToBounds(map.current, data.geojson.features)
      isFirstRender.current = false
      setLoading(false)
    })

    return () => { map.current?.remove(); map.current = null }
  }, [username])

  // Apply filters when type or year changes
  useEffect(() => {
    if (isFirstRender.current) return
    applyFilters(selectedType, selectedYear)
  }, [selectedType, selectedYear])

  // ── Error states ──────────────────────────────────────────

  if (notFound || isPrivate) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Navbar />
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', gap: '1rem',
          fontFamily: "'Barlow Condensed', sans-serif", textAlign: 'center',
          padding: '2rem',
        }}>
          <h1 style={{ fontSize: '4rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text)' }}>
            {notFound ? '404' : 'Private'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', letterSpacing: '0.05em' }}>
            {notFound
              ? 'This profile doesn\'t exist.'
              : `@${username}'s sleeve is private.`}
          </p>
          <Link href="/explore" style={{
            marginTop: '1rem', fontSize: '0.7rem', letterSpacing: '0.12em',
            textTransform: 'uppercase', textDecoration: 'none',
            padding: '0.5rem 1.25rem', border: '1px solid var(--border)',
            color: 'var(--muted)', fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600,
          }}>
            ← Back to Explorer
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* Profile header bar */}
      {profile && (
        <div style={{
          position: 'absolute', top: '4.5rem', left: '1.5rem',
          zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'rgba(8,8,8,0.9)', border: '1px solid var(--border)',
          padding: '0.6rem 1rem', backdropFilter: 'blur(12px)',
        }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name}
              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(252,76,2,0.2)', border: '1px solid rgba(252,76,2,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              fontSize: '0.65rem', color: 'var(--orange)',
            }}>
              {profile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>
              {profile.full_name}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.06em' }}>
              @{profile.username}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{
        position: 'absolute', top: '4.5rem', left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10, display: 'flex', gap: '0.5rem', alignItems: 'center',
        background: 'rgba(8,8,8,0.9)', border: '1px solid var(--border)',
        padding: '0.6rem 1rem', backdropFilter: 'blur(12px)',
      }}>
        {SPORT_TYPES.map(t => (
          <button key={t} onClick={() => setSelectedType(t)} style={{
            fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '0.35rem 0.75rem', cursor: 'pointer', border: 'none',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            background: selectedType === t ? 'var(--orange)' : 'transparent',
            color: selectedType === t ? '#fff' : 'var(--muted)',
            transition: 'all 0.15s',
          }}>
            {t}
          </button>
        ))}

        <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 0.25rem' }} />

        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={{
          background: 'transparent', border: 'none', color: 'var(--muted)',
          fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
          cursor: 'pointer', outline: 'none',
        }}>
          <option value="All">All years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Fit to results button */}
      {showFitButton && !loading && (
        <button onClick={() => {
          if (map.current && currentFeatures.current.length > 0) {
            fitToBounds(map.current, currentFeatures.current)
            setShowFitButton(false)
          }
        }} style={{
          position: 'absolute', top: '8rem', left: '50%',
          transform: 'translateX(-50%)', zIndex: 10,
          background: 'var(--bg2)', border: '1px solid var(--orange)',
          color: 'var(--orange)', padding: '0.5rem 1.25rem',
          fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
          cursor: 'pointer', backdropFilter: 'blur(12px)',
        }}>
          ⌖ Fit to results
        </button>
      )}

      {/* Map */}
      <div ref={mapContainer} style={{ flex: 1, marginTop: '3.5rem' }} />

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(8,8,8,0.7)', zIndex: 5,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: '1.2rem', letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--muted)',
        }}>
          <span style={{ color: 'var(--orange)', marginRight: '0.75rem' }}>⬤</span>
          Loading sleeve...
        </div>
      )}

      {/* Activity count */}
      {!loading && (
        <div style={{
          position: 'absolute', bottom: '2rem', left: '1.5rem',
          background: 'rgba(8,8,8,0.9)', border: '1px solid var(--border)',
          padding: '0.6rem 1rem', fontSize: '0.65rem',
          letterSpacing: '0.1em', color: 'var(--muted)',
          fontFamily: "'Barlow Condensed', sans-serif",
        }}>
          <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1rem' }}>
            {activityCount.toLocaleString()}
          </span>
          {'  '}activities
        </div>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute', bottom: '2rem', right: '1.5rem',
          background: 'rgba(8,8,8,0.95)', border: '1px solid var(--border)',
          padding: '0.85rem 1.1rem', minWidth: '200px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: '1rem', color: 'var(--text)', marginBottom: '0.5rem',
          }}>
            {hovered.name}
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {[
              { val: formatDistance(hovered.distance_m), label: 'dist' },
              { val: formatTime(hovered.moving_time_s), label: 'time' },
              { val: `${Math.round(hovered.elevation_m)}m`, label: 'elev' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--text)', fontSize: '0.85rem', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600 }}>
                  {s.val}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: '0.5rem', fontSize: '0.6rem',
            color: TYPE_COLORS[hovered.type] ?? TYPE_COLORS.Default,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {hovered.type}
            {hovered.city ? ` · ${hovered.city}` : ''}
            {hovered.country ? `, ${hovered.country}` : ''}
          </div>
        </div>
      )}

      <style>{`
        .mapboxgl-ctrl-bottom-right { display: none; }
        .mapboxgl-ctrl-bottom-left { display: none; }
      `}</style>
    </div>
  )
}