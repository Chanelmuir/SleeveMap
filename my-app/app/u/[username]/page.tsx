'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import mapboxgl, { ExpressionSpecification } from 'mapbox-gl'
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

const MAP_STYLES = [
  { label: 'Dark',      value: 'mapbox://styles/mapbox/dark-v11' },
  { label: 'Street',    value: 'mapbox://styles/mapbox/streets-v12' },
  { label: 'Satellite', value: 'mapbox://styles/mapbox/satellite-streets-v12' },
]

const ALL_SPORT_TYPES = ['Run', 'Ride', 'Hike', 'Walk', 'Swim']

interface UserProfile {
  username: string
  full_name: string
  avatar_url: string
  activity_count: number
  is_public: boolean
  is_owner: boolean
  activity_colors: Record<string, string>
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

function addLayers(map: mapboxgl.Map, features: any[]) {
  if (map.getSource('activities')) {
    map.removeLayer('activities-lines-hover')
    map.removeLayer('activities-lines')
    map.removeSource('activities')
  }
  map.addSource('activities', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features },
    generateId: true,
  })
  map.addLayer({
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
      'line-opacity': 0.75,
      'line-width': 1.5,
    },
  })
  map.addLayer({
    id: 'activities-lines-hover',
    type: 'line',
    source: 'activities',
    paint: {
      'line-color': '#ffffff',
      'line-opacity': ['case', ['boolean', ['feature-state', 'hovered'], false], 1, 0],
      'line-width': 3,
    },
  })
}

export default function MapPage() {
  const { username } = useParams<{ username: string }>()
  const router = useRouter()

  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const allFeatures = useRef<any[]>([])
  const currentFeatures = useRef<any[]>([])

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  // Multi-select: empty set = all types shown
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [activityColors, setActivityColors] = useState<Record<string, string>>({
    Run: '#FC4C02', Ride: '#3498DB', Hike: '#27AE60', Walk: '#F39C12', Swim: '#9B59B6',
  })
  const [selectedYear, setSelectedYear] = useState('All')
  const [activityCount, setActivityCount] = useState(0)
  const [hovered, setHovered] = useState<ActivityProperties | null>(null)
  const [showFitButton, setShowFitButton] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState(MAP_STYLES[0].value)
  const [years, setYears] = useState<string[]>([])
  const isFirstRender = useRef(true)

  async function saveColor(type: string, color: string) {
    const updated = { ...activityColors, [type]: color }
    setActivityColors(updated)
    // Update map paint immediately
    if (map.current?.getLayer('activities-lines')) {
      map.current.setPaintProperty('activities-lines', 'line-color', buildColorExpression(updated))
    }
    // Persist to DB
    await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity_colors: updated }),
    })
  }

  function buildColorExpression(colors: Record<string, string>) {
    return [
      'match', ['get', 'type'],
      'Run',  colors.Run  ?? TYPE_COLORS.Run,
      'Ride', colors.Ride ?? TYPE_COLORS.Ride,
      'Hike', colors.Hike ?? TYPE_COLORS.Hike,
      'Walk', colors.Walk ?? TYPE_COLORS.Walk,
      'Swim', colors.Swim ?? TYPE_COLORS.Swim,
      TYPE_COLORS.Default,
    ] as ExpressionSpecification
  }

  function toggleType(type: string) {
    setSelectedTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  function applyFilters(types: Set<string>, year: string) {
    if (!map.current || allFeatures.current.length === 0) return

    const filtered = allFeatures.current.filter(f => {
      // Empty set = all types
      const matchType = types.size === 0 || types.has(f.properties.type)
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

    map.current.on('load', async () => {
      const res = await fetch(`/api/profiles/${username}`)

      if (res.status === 404) { setNotFound(true); setLoading(false); return }
      if (res.status === 403) { setIsPrivate(true); setLoading(false); return }

      const data = await res.json()
      setProfile(data.user)
      if (data.user.activity_colors && Object.keys(data.user.activity_colors).length > 0) {
        setActivityColors(prev => ({ ...prev, ...data.user.activity_colors }))
      }

      allFeatures.current = data.geojson.features
      currentFeatures.current = data.geojson.features
      setActivityCount(data.geojson.features.length)

      const uniqueYears = [...new Set(
        data.geojson.features
          .map((f: any) => new Date(f.properties.start_date).getFullYear().toString())
          .filter(Boolean)
      )].sort((a: any, b: any) => Number(b) - Number(a)) as string[]
      setYears(uniqueYears)

      if (!map.current) return

      addLayers(map.current, data.geojson.features)

      // Apply saved custom colors right after layers are added
      if (data.user.activity_colors && Object.keys(data.user.activity_colors).length > 0) {
        const merged = { Run: '#FC4C02', Ride: '#3498DB', Hike: '#27AE60', Walk: '#F39C12', Swim: '#9B59B6', ...data.user.activity_colors }
        map.current.setPaintProperty('activities-lines', 'line-color', [
          'match', ['get', 'type'],
          'Run',  merged.Run,
          'Ride', merged.Ride,
          'Hike', merged.Hike,
          'Walk', merged.Walk,
          'Swim', merged.Swim,
          '#FC4C02',
        ])
      }

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

      map.current.on('click', 'activities-lines', (e) => {
        if (!e.features?.length) return
        const props = e.features[0].properties as ActivityProperties
        window.open(`https://www.strava.com/activities/${props.strava_id}`, '_blank')
      })

      fitToBounds(map.current, data.geojson.features)
      isFirstRender.current = false
      setLoading(false)
    })

    return () => { map.current?.remove(); map.current = null }
  }, [username])

  // Apply filters when types or year changes
  useEffect(() => {
    if (isFirstRender.current) return
    applyFilters(selectedTypes, selectedYear)
  }, [selectedTypes, selectedYear])

  // Switch map style — re-add layers after style loads
  useEffect(() => {
    if (!map.current || isFirstRender.current) return
    map.current.setStyle(selectedStyle)
    map.current.once('styledata', () => {
      if (currentFeatures.current.length > 0 && map.current) {
        addLayers(map.current, currentFeatures.current)
      }
    })
  }, [selectedStyle])

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
            {notFound ? "This profile doesn't exist." : `@${username}'s sleeve is private.`}
          </p>
          <Link href="/explore" style={{
            marginTop: '1rem', fontSize: '0.7rem', letterSpacing: '0.12em',
            textTransform: 'uppercase', textDecoration: 'none',
            padding: '0.5rem 1.25rem', border: '1px solid var(--border)',
            color: 'var(--muted)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
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

      {/* Profile header — top left */}
      {profile && (
        <div style={{
          position: 'absolute', top: '5rem', left: '1.5rem', zIndex: 10,
          display: 'flex', alignItems: 'center', gap: '0.75rem',
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
              {profile.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>
              {profile.full_name}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.06em', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              @{profile.username}
              {profile.is_owner && !profile.is_public && (
                <span style={{ color: 'var(--sleeve-gold)', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  · Private
                </span>
              )}
            </div>
          </div>
          {profile.is_owner && (
            <Link href="/settings" style={{
              marginLeft: '0.5rem', fontSize: '0.55rem', letterSpacing: '0.1em',
              textTransform: 'uppercase', textDecoration: 'none',
              padding: '0.25rem 0.6rem', border: '1px solid var(--border)',
              color: 'var(--muted)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            }}>
              Settings
            </Link>
          )}
        </div>
      )}

      {/* Filters — top centre */}
      <div style={{
        position: 'absolute', top: '5rem', left: '50%',
        transform: 'translateX(-50%)', zIndex: 10,
        display: 'flex', gap: '0.5rem', alignItems: 'center',
        background: 'rgba(8,8,8,0.9)', border: '1px solid var(--border)',
        padding: '0.6rem 1rem', backdropFilter: 'blur(12px)',
      }}>
        {/* All toggle — clears selection */}
        <button onClick={() => setSelectedTypes(new Set())} style={{
          fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '0.35rem 0.75rem', cursor: 'pointer', border: 'none',
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
          background: selectedTypes.size === 0 ? 'var(--sleeve-gold)' : 'transparent',
          color: selectedTypes.size === 0 ? '#fff' : 'var(--muted)',
          transition: 'all 0.15s',
        }}>
          All
        </button>

        <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />

        {/* Individual type toggles with optional color swatches */}
        {ALL_SPORT_TYPES.map(t => {
          const active = selectedTypes.has(t)
          const color = activityColors[t] ?? TYPE_COLORS[t]
          return (
            <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <button onClick={() => toggleType(t)} style={{
                fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '0.35rem 0.75rem', cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                background: active ? color + '33' : 'transparent',
                color: active ? color : 'var(--muted)',
                border: active ? `1px solid ${color}66` : '1px solid transparent',
                transition: 'all 0.15s',
              }}>
                {t}
              </button>
              {/* Color swatch — only shown for profile owner */}
              {profile?.is_owner && (
                <label title={`Change ${t} colour`} style={{
                  width: 16, height: 6, borderRadius: '2px',
                  background: color, cursor: 'pointer', display: 'block',
                  border: '1px solid rgba(0,0,0,0.3)',
                  transition: 'transform 0.1s',
                }}>
                  <input
                    type="color"
                    value={color}
                    onChange={e => saveColor(t, e.target.value)}
                    style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                  />
                </label>
              )}
            </div>
          )
        })}

        <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />

        {/* Year filter */}
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

      {/* Map style switcher — top right */}
      <div style={{
        position: 'absolute', top: '5rem', right: '1.5rem', zIndex: 10,
        display: 'flex', gap: '0.5rem', alignItems: 'center',
        background: 'rgba(8,8,8,0.9)', border: '1px solid var(--border)',
        padding: '0.6rem 1rem', backdropFilter: 'blur(12px)',
      }}>
        {MAP_STYLES.map(s => (
          <button key={s.value} onClick={() => setSelectedStyle(s.value)} style={{
            fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '0.35rem 0.75rem', cursor: 'pointer', border: 'none',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            background: selectedStyle === s.value ? 'var(--sleeve-gold)' : 'transparent',
            color: selectedStyle === s.value ? 'var(--text)' : 'var(--muted)',
            transition: 'all 0.15s',
          }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Fit to results button */}
      {showFitButton && !loading && (
        <div style={{
          position: 'absolute', top: '8.5rem', left: '50%',
          transform: 'translateX(-50%)', zIndex: 10,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'var(--bg2)', border: '1px solid var(--sleeve-gold)',
          padding: '0.35rem', backdropFilter: 'blur(12px)',
        }}>
          <button onClick={() => {
            if (map.current && currentFeatures.current.length > 0) {
              fitToBounds(map.current, currentFeatures.current)
            }
            setShowFitButton(false)
          }} style={{
            background: 'transparent', border: 'none', color: 'var(--sleeve-gold)',
            padding: '0rem 0.5rem', fontSize: '0.65rem', letterSpacing: '0.12em',
            textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600, cursor: 'pointer',
          }}>
            ⌖ Fit to results
          </button>
          <button onClick={() => setShowFitButton(false)} style={{
            background: 'transparent', border: '1px solid var(--black)',
            color: 'var(--orange)', width: '20px', height: '20px',
            cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700,
            position: 'absolute', top: '0%', right: '-10px',
            transform: 'translateY(-50%)', textShadow: '0 0 2px var(--bg)',
          }}>
            ✖
          </button>
        </div>
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
          <span style={{ color: 'var(--sleeve-gold)', marginRight: '0.75rem' }}>⬤</span>
          Loading sleeve...
        </div>
      )}

      {/* Activity count — bottom left */}
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

      {/* Hover tooltip — bottom right */}
      {hovered && (
        <div style={{
          position: 'absolute', bottom: '2rem', right: '1.5rem',
          background: 'rgba(8,8,8,0.95)', border: '1px solid var(--border)',
          padding: '0.85rem 1.1rem', minWidth: '200px', backdropFilter: 'blur(8px)',
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
        .mapboxgl-ctrl-bottom-right {
          margin-bottom: 0.5rem;
          margin-right: 0.5rem;
        }
        .mapboxgl-ctrl-attrib {
          background: rgba(8,8,8,0.7) !important;
          color: rgba(255,255,255,0.3) !important;
          font-size: 0.55rem !important;
        }
        .mapboxgl-ctrl-attrib a { color: rgba(255,255,255,0.4) !important; }
        .mapboxgl-ctrl-bottom-left { display: none; }
      `}</style>
    </div>
  )
}