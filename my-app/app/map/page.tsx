'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import Navbar from '../components/Navbar'
import SyncOnLoad from '../components/SyncOnLoad'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const SPORT_TYPES = ['All', 'Run', 'Ride', 'Hike', 'Walk', 'Swim']

const TYPE_COLORS: Record<string, string> = {
  Run:     '#FC4C02',
  Ride:    '#3498DB',
  Hike:    '#27AE60',
  Walk:    '#F39C12',
  Swim:    '#9B59B6',
  Default: '#FC4C02',
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

// Fit the map to the bounds of a GeoJSON feature collection
function fitToBounds(map: mapboxgl.Map, features: any[]) {
  const coords = features.flatMap((f: any) => f.geometry?.coordinates ?? [])
  if (coords.length === 0) return
  const bounds = coords.reduce(
    (b: mapboxgl.LngLatBounds, c: [number, number]) => b.extend(c),
    new mapboxgl.LngLatBounds(coords[0], coords[0])
  )
  map.fitBounds(bounds, { padding: 60, duration: 1000 })
}

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const currentFeatures = useRef<any[]>([]) // keep features for the re-centre button

  const [loading, setLoading] = useState(true)
  const [firstLoad, setFirstLoad] = useState(true)
  const [showFitButton, setShowFitButton] = useState(false)
  const [activityCount, setActivityCount] = useState(0)
  const [selectedType, setSelectedType] = useState('All')
  const [selectedYear, setSelectedYear] = useState<string>('All')
  const [years, setYears] = useState<string[]>([])
  const [hovered, setHovered] = useState<ActivityProperties | null>(null)

  async function loadActivities(type: string, year: string) {
    if (!map.current) return
    setLoading(true)
    setShowFitButton(false)

    const params = new URLSearchParams()
    if (type !== 'All') params.set('type', type)
    if (year !== 'All') params.set('year', year)

    const res = await fetch(`/api/activities?${params.toString()}`)
    const geojson = await res.json()

    if (!geojson.features) {
      setLoading(false)
      return
    }

    setActivityCount(geojson.features.length)
    currentFeatures.current = geojson.features

    // Extract unique years on first load only
    if (years.length === 0) {
      const uniqueYears = [...new Set(
        geojson.features
          .map((f: any) => new Date(f.properties.start_date).getFullYear().toString())
          .filter(Boolean)
      )].sort((a: any, b: any) => Number(b) - Number(a)) as string[]
      setYears(uniqueYears)
    }

    // Remove existing layers/source if reloading
    if (map.current.getSource('activities')) {
      map.current.removeLayer('activities-lines')
      map.current.removeLayer('activities-lines-hover')
      map.current.removeSource('activities')
    }

    map.current.addSource('activities', {
      type: 'geojson',
      data: geojson,
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
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'hovered'], false],
          1, 0,
        ],
        'line-width': 3,
      },
    })

    if (firstLoad) {
      // Auto-fit on first load only
      fitToBounds(map.current, geojson.features)
      setFirstLoad(false)
    } else {
      // On filter changes, show the button instead
      setShowFitButton(true)
    }

    setLoading(false)
  }

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [0, 30],
      zoom: 2,
    })

    map.current.on('load', () => {
      loadActivities('All', 'All')
    })

    let hoveredId: string | number | null = null

    map.current.on('mousemove', 'activities-lines', (e) => {
      if (!e.features?.length || !map.current) return
      map.current.getCanvas().style.cursor = 'pointer'

      const feature = e.features[0]
      const props = feature.properties as ActivityProperties

      if (hoveredId !== null) {
        map.current.setFeatureState({ source: 'activities', id: hoveredId }, { hovered: false })
      }
      hoveredId = feature.id ?? null
      if (hoveredId !== null) {
        map.current.setFeatureState({ source: 'activities', id: hoveredId }, { hovered: true })
      }
      setHovered(props)
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

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Reload when filters change (skip on initial render)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!map.current) return
    if (map.current.isStyleLoaded()) {
      loadActivities(selectedType, selectedYear)
    } else {
      map.current.once('load', () => loadActivities(selectedType, selectedYear))
    }
  }, [selectedType, selectedYear])

  return (
    <div style={{ height: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <SyncOnLoad />

      {/* Controls bar */}
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

        <select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          style={{
            background: 'transparent', border: 'none', color: 'var(--muted)',
            fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="All">All years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Fit to results button — appears after filter changes */}
      {showFitButton && !loading && (
        <button
          onClick={() => {
            if (map.current && currentFeatures.current.length > 0) {
              fitToBounds(map.current, currentFeatures.current)
              setShowFitButton(false)
            }
          }}
          style={{
            position: 'absolute', top: '8rem', left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            background: 'var(--bg2)', border: '1px solid var(--orange)',
            color: 'var(--orange)', padding: '0.5rem 1.25rem',
            fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            cursor: 'pointer', backdropFilter: 'blur(12px)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(252,76,2,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg2)')}
        >
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
          Loading activities...
        </div>
      )}

      {/* Activity count badge */}
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
            fontSize: '1rem', letterSpacing: '0.04em', color: 'var(--text)',
            marginBottom: '0.5rem',
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