'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import Navbar from '../components/Navbar'
import polyline from '@mapbox/polyline'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const MAP_STYLES = [
  { label: 'Dark',      value: 'mapbox://styles/mapbox/dark-v11' },
  { label: 'Street',    value: 'mapbox://styles/mapbox/streets-v12' },
  { label: 'Satellite', value: 'mapbox://styles/mapbox/satellite-streets-v12' },
]

const PROFILES = [
  { label: 'Run',      value: 'mapbox/walking', icon: '🏃' },
  { label: 'Cycle',    value: 'mapbox/cycling', icon: '🚴' },
  { label: 'Straight', value: 'straight',        icon: '↗' },
]

const FRIEND_COLORS = [
  '#00CED1', '#39FF14', '#FF00FF', '#FFD700',
  '#FF6B6B', '#A78BFA', '#34D399', '#FB923C',
]

const ALL_SPORT_TYPES = ['Run', 'Ride', 'Hike', 'Walk', 'Swim']

const TYPE_COLORS: Record<string, string> = {
  Run: '#FC4C02', Ride: '#3498DB', Hike: '#27AE60', Walk: '#F39C12', Swim: '#9B59B6',
}

type ProfileValue = 'mapbox/walking' | 'mapbox/cycling' | 'straight'

interface Waypoint {
  id: string
  lng: number
  lat: number
  nextProfile: ProfileValue
}

interface RouteStats { distanceKm: number; elevationGainM: number | null }
interface PublicProfile { id: string; username: string; full_name: string; avatar_url: string; activity_count: number }

function haversineDistance(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function pointToSegmentDistance(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  if (dx === 0 && dy === 0) return Math.sqrt((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2)
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
  return Math.sqrt((p[0] - (a[0] + t * dx)) ** 2 + (p[1] - (a[1] + t * dy)) ** 2)
}

function findNearestSegment(point: [number, number], waypoints: Waypoint[]): number {
  let minDist = Infinity
  let minIndex = 0
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dist = pointToSegmentDistance(point, [waypoints[i].lng, waypoints[i].lat], [waypoints[i + 1].lng, waypoints[i + 1].lat])
    if (dist < minDist) { minDist = dist; minIndex = i }
  }
  return minIndex
}

function getBounds(waypoints: Waypoint[]): mapboxgl.LngLatBoundsLike {
  const lngs = waypoints.map(w => w.lng)
  const lats = waypoints.map(w => w.lat)
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]]
}

async function fetchSegment(from: Waypoint, to: Waypoint): Promise<{ coords: [number, number][]; distanceM: number }> {
  if (from.nextProfile === 'straight') {
    return { coords: [[from.lng, from.lat], [to.lng, to.lat]], distanceM: haversineDistance([from.lng, from.lat], [to.lng, to.lat]) }
  }
  const url = `https://api.mapbox.com/directions/v5/${from.nextProfile}/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=polyline6&overview=full&access_token=${mapboxgl.accessToken}`
  const res = await fetch(url)
  const data = await res.json()
  if (!data.routes?.length) {
    return { coords: [[from.lng, from.lat], [to.lng, to.lat]], distanceM: haversineDistance([from.lng, from.lat], [to.lng, to.lat]) }
  }
  const route = data.routes[0]
  const decoded = polyline.decode(route.geometry, 6) as [number, number][]
  return { coords: decoded.map(([lat, lng]) => [lng, lat] as [number, number]), distanceM: route.distance }
}

function formatDistance(km: number) { return km >= 1 ? `${km.toFixed(2)} km` : `${Math.round(km * 1000)} m` }

const ELEVATION_ZOOM = 14
const elevationTileCache = new Map<string, Promise<Uint8ClampedArray | null>>()

function loadTilePixels(z: number, x: number, y: number): Promise<Uint8ClampedArray | null> {
  const key = `${z}/${x}/${y}`
  if (elevationTileCache.has(key)) return elevationTileCache.get(key)!

  const promise = new Promise<Uint8ClampedArray | null>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(null); return }
      ctx.drawImage(img, 0, 0)
      try {
        resolve(ctx.getImageData(0, 0, img.width, img.height).data)
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${z}/${x}/${y}.pngraw?access_token=${mapboxgl.accessToken}`
  })

  elevationTileCache.set(key, promise)
  return promise
}

async function getElevation(lng: number, lat: number, zoom = ELEVATION_ZOOM): Promise<number | null> {
  const n = Math.pow(2, zoom)
  const latRad = (lat * Math.PI) / 180
  const xFloat = ((lng + 180) / 360) * n
  const yFloat = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  const x = Math.floor(xFloat)
  const y = Math.floor(yFloat)

  const pixels = await loadTilePixels(zoom, x, y)
  if (!pixels) return null

  const tileSize = Math.sqrt(pixels.length / 4)
  const px = Math.min(tileSize - 1, Math.floor((xFloat - x) * tileSize))
  const py = Math.min(tileSize - 1, Math.floor((yFloat - y) * tileSize))
  const idx = (py * tileSize + px) * 4
  const r = pixels[idx]
  const g = pixels[idx + 1]
  const b = pixels[idx + 2]
  return -10000 + (r * 256 * 256 + g * 256 + b) * 0.1
}

function sampleCoords(coords: [number, number][], maxSamples = 60): [number, number][] {
  if (coords.length <= maxSamples) return coords
  const step = (coords.length - 1) / (maxSamples - 1)
  return Array.from({ length: maxSamples }, (_, i) => coords[Math.round(i * step)])
}

async function computeElevationGain(coords: [number, number][]): Promise<number | null> {
  if (coords.length < 2) return null
  const sampled = sampleCoords(coords)
  const elevations = await Promise.all(sampled.map(([lng, lat]) => getElevation(lng, lat)))
  if (elevations.some(e => e === null)) return null

  let gain = 0
  const NOISE_THRESHOLD = 1 // meters — ignore jitter from tile resolution
  for (let i = 1; i < elevations.length; i++) {
    const diff = (elevations[i] as number) - (elevations[i - 1] as number)
    if (diff > NOISE_THRESHOLD) gain += diff
  }
  return Math.round(gain)
}

function formatElevation(m: number) { return `${Math.round(m)} m` }

function toGPX(coords: [number, number][], name: string): string {
  const points = coords.map(([lng, lat]) => `    <trkpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}"></trkpt>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="SleeveMap" xmlns="http://www.topografix.com/GPX/1/1">\n  <trk>\n    <name>${name}</name>\n    <trkseg>\n${points}\n    </trkseg>\n  </trk>\n</gpx>`
}

function downloadGPX(coords: [number, number][], name: string) {
  const gpx = toGPX(coords, name)
  const blob = new Blob([gpx], { type: 'application/gpx+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name.replace(/\s+/g, '_')}.gpx`
  a.click()
  URL.revokeObjectURL(url)
}

function ProfileBadge({ value, active, onClick }: { value: ProfileValue; active: boolean; onClick: () => void }) {
  const p = PROFILES.find(p => p.value === value)!
  return (
    <button onClick={onClick} title={p.label} style={{
      width: 22, height: 22, borderRadius: '3px', border: 'none',
      background: active ? 'rgba(252,76,2,0.2)' : 'transparent',
      outline: active ? '1px solid rgba(252,76,2,0.5)' : '1px solid var(--border)',
      cursor: 'pointer', fontSize: '0.7rem', lineHeight: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
    }}>
      {p.icon}
    </button>
  )
}

export default function RoutePlannerPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const routeCoordsRef = useRef<[number, number][]>([])
  const friendCacheRef = useRef<Map<string, any>>(new Map())
  const ownColorsRef = useRef<Record<string, string>>({
    Run: '#FC4C02', Ride: '#3498DB', Hike: '#27AE60', Walk: '#F39C12', Swim: '#9B59B6',
  })

  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [routeStats, setRouteStats] = useState<RouteStats | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const ownGeojsonRef = useRef<any>(null)
  const [selectedStyle, setSelectedStyle] = useState(MAP_STYLES[0].value)
  const [defaultProfile, setDefaultProfile] = useState<ProfileValue>('mapbox/walking')
  const [routeName, setRouteName] = useState('My Route')
  const [loading, setLoading] = useState(false)
  const heatmapLoadedRef = useRef(false)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const isInitialStyleRender = useRef(true)

  const [publicProfiles, setPublicProfiles] = useState<PublicProfile[]>([])
  const [activeFriends, setActiveFriends] = useState<Set<string>>(new Set())
  const [friendSearch, setFriendSearch] = useState('')
  const [loadingFriend, setLoadingFriend] = useState<string | null>(null)

  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const pendingSharedRouteRef = useRef<any>(undefined)
  const historyRef = useRef<Waypoint[][]>([])
  const MAX_HISTORY = 50
  const [insertMode, setInsertMode] = useState(false)

  // Mobile sidebar drawer
  const [mobilePanel, setMobilePanel] = useState(false)

  function pushHistory(snapshot: Waypoint[]) {
    historyRef.current.push(snapshot.map(w => ({ ...w })))
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift()
  }

  function toggleType(type: string) {
    setSelectedTypes(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  function filterFeatures(features: any[], types: Set<string>) {
    if (types.size === 0) return features
    return features.filter(f => types.has(f.properties?.type))
  }

  useEffect(() => {
    fetch('/api/favourites')
      .then(r => r.json())
      .then((data: any[]) => setPublicProfiles(data ?? []))
      .catch(() => {})

    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.activity_colors) {
          ownColorsRef.current = { ...ownColorsRef.current, ...data.activity_colors }
        }
      })
      .catch(() => {})
  }, [])

  function friendLayerId(username: string) { return `friend-${username}-lines` }
  function friendSourceId(username: string) { return `friend-${username}` }

  function heatmapColorForStyle(style: string) {
    return style.includes('satellite') ? '#00ff1e' : style.includes('streets') ? '#e85d00' : '#FC4C02'
  }
  function heatmapOpacityForStyle(style: string) {
    return style.includes('satellite') ? 0.55 : style.includes('streets') ? 0.55 : 0.45
  }

  async function toggleFriend(profile: PublicProfile, colorIndex: number) {
    if (!map.current) return
    const { username } = profile
    const layerId = friendLayerId(username)
    const sourceId = friendSourceId(username)

    if (activeFriends.has(username)) {
      if (map.current.getLayer(layerId)) map.current.removeLayer(layerId)
      if (map.current.getSource(sourceId)) map.current.removeSource(sourceId)
      setActiveFriends(prev => { const n = new Set(prev); n.delete(username); return n })
      return
    }

    setLoadingFriend(username)
    let geojson = friendCacheRef.current.get(username)

    if (!geojson) {
      try {
        const res = await fetch(`/api/profiles/${username}`)
        if (!res.ok) { setLoadingFriend(null); return }
        const data = await res.json()
        geojson = data.geojson
        friendCacheRef.current.set(username, geojson)
      } catch {
        setLoadingFriend(null)
        return
      }
    }

    const color = FRIEND_COLORS[colorIndex % FRIEND_COLORS.length]

    if (!map.current.getSource(sourceId)) {
      const filtered = { ...geojson, features: filterFeatures(geojson.features, selectedTypes) }
      map.current.addSource(sourceId, { type: 'geojson', data: filtered })
    }
    if (!map.current.getLayer(layerId)) {
      const beforeLayer = map.current.getLayer('route-casing') ? 'route-casing' : undefined
      map.current.addLayer({
        id: layerId, type: 'line', source: sourceId,
        paint: { 'line-color': color, 'line-opacity': 0.55, 'line-width': 1.4 },
      }, beforeLayer)
    }

    setActiveFriends(prev => new Set([...prev, username]))
    setLoadingFriend(null)
  }

  async function reloadFriendLayers() {
    if (!map.current) return
    for (const [i, profile] of publicProfiles.entries()) {
      if (!activeFriends.has(profile.username)) continue
      const geojson = friendCacheRef.current.get(profile.username)
      if (!geojson) continue
      const sourceId = friendSourceId(profile.username)
      const layerId = friendLayerId(profile.username)
      const color = FRIEND_COLORS[i % FRIEND_COLORS.length]
      if (!map.current.getSource(sourceId)) {
        const filtered = { ...geojson, features: filterFeatures(geojson.features, selectedTypes) }
        map.current.addSource(sourceId, { type: 'geojson', data: filtered })
      }
      if (!map.current.getLayer(layerId)) {
        const beforeLayer = map.current.getLayer('route-casing') ? 'route-casing' : undefined
        map.current.addLayer({
          id: layerId, type: 'line', source: sourceId,
          paint: { 'line-color': color, 'line-opacity': 0.55, 'line-width': 1.4 },
        }, beforeLayer)
      }
    }
  }

  const buildRoute = useCallback(async (wps: Waypoint[]) => {
    if (wps.length < 2 || !map.current) return
    setLoading(true)
    const segments = await Promise.all(wps.slice(0, -1).map((wp, i) => fetchSegment(wp, wps[i + 1])))
    const allCoords: [number, number][] = []
    segments.forEach((seg, i) => {
      if (i === 0) allCoords.push(...seg.coords)
      else allCoords.push(...seg.coords.slice(1))
    })
    routeCoordsRef.current = allCoords
    const totalDistanceM = segments.reduce((s, seg) => s + seg.distanceM, 0)
    const source = map.current.getSource('route') as mapboxgl.GeoJSONSource
    source?.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: allCoords }, properties: {} })
    setRouteStats({ distanceKm: totalDistanceM / 1000, elevationGainM: null })
    setLoading(false)

    computeElevationGain(allCoords).then(gain => {
      setRouteStats(prev => (prev ? { ...prev, elevationGainM: gain } : prev))
    })
  }, [])

  async function shareRoute() {
    if (waypoints.length < 2) return
    setSharing(true)
    const res = await fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: routeName,
        waypoints: waypoints.map(w => ({ lng: w.lng, lat: w.lat, nextProfile: w.nextProfile })),
        distance_km: routeStats?.distanceKm ?? null,
      }),
    })
    const data = await res.json()
    const url = `${window.location.origin}/plan/${data.id}`
    setShareUrl(url)
    navigator.clipboard.writeText(url)
    setSharing(false)
  }

  const addMarker = useCallback(
    (wp: Waypoint, index: number, total: number, onDragEnd: (wp: Waypoint, lngLat: mapboxgl.LngLat) => void) => {
      if (!map.current) return
      const isFirst = index === 0
      const isLast = index === total - 1
      const profile = PROFILES.find(p => p.value === wp.nextProfile)

      const el = document.createElement('div')
      el.style.cssText = `
        width: 26px; height: 26px; border-radius: 50%;
        background: ${isFirst ? '#27AE60' : isLast ? '#FC4C02' : 'rgba(30,30,30,0.95)'};
        border: 2px solid ${isFirst ? '#1a8a47' : isLast ? '#c93d01' : 'rgba(255,255,255,0.3)'};
        cursor: grab; display: flex; align-items: center; justify-content: center;
        font-size: ${isFirst || isLast ? '10px' : '9px'};
        font-weight: 700; color: #fff;
        font-family: 'Barlow Condensed', sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.6);
        user-select: none;
      `
      if (!isFirst && !isLast && profile) {
        el.textContent = profile.icon
        el.style.fontSize = '11px'
      } else {
        el.textContent = isFirst ? 'S' : 'E'
      }

      const marker = new mapboxgl.Marker({ element: el, draggable: true }).setLngLat([wp.lng, wp.lat]).addTo(map.current!)
      marker.on('dragend', () => onDragEnd(wp, marker.getLngLat()))
      markersRef.current.set(wp.id, marker)
    }, []
  )

  const rebuildMarkers = useCallback(
    (wps: Waypoint[], onDragEnd: (wp: Waypoint, lngLat: mapboxgl.LngLat) => void) => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current.clear()
      wps.forEach((wp, i) => addMarker(wp, i, wps.length, onDragEnd))
    }, [addMarker]
  )

  const loadHeatmap = useCallback(async () => {
    if (!map.current || heatmapLoadedRef.current) return
    try {
      const res = await fetch('/api/activities')
      if (!res.ok) return
      const geojson = await res.json()
      if (!geojson.features?.length) return
      ownGeojsonRef.current = geojson
      const filtered = { ...geojson, features: filterFeatures(geojson.features, selectedTypes) }
      map.current.addSource('heatmap-activities', { type: 'geojson', data: filtered })
      const style = (map.current as any).__mapStyle ?? ''
      map.current.addLayer({
        id: 'heatmap-lines', type: 'line', source: 'heatmap-activities',
        paint: {
          'line-color': heatmapColorForStyle(style),
          'line-opacity': heatmapOpacityForStyle(style),
          'line-width': 1.5,
        },
      })
      heatmapLoadedRef.current = true
      const c = ownColorsRef.current
      map.current.setPaintProperty('heatmap-lines', 'line-color', [
        'match', ['get', 'type'],
        'Run', c.Run ?? '#FC4C02', 'Ride', c.Ride ?? '#3498DB', 'Hike', c.Hike ?? '#27AE60',
        'Walk', c.Walk ?? '#F39C12', 'Swim', c.Swim ?? '#9B59B6', '#FC4C02',
      ])
    } catch { /* not logged in */ }
  }, [])

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    if (pendingSharedRouteRef.current === undefined) {
      const saved = sessionStorage.getItem('loadRoute')
      if (saved) {
        sessionStorage.removeItem('loadRoute')
        try { pendingSharedRouteRef.current = JSON.parse(saved) } catch { pendingSharedRouteRef.current = null }
      } else {
        pendingSharedRouteRef.current = null
      }
    }

    const mapInstance = new mapboxgl.Map({ container: mapContainer.current, style: 'mapbox://styles/mapbox/dark-v11', center: [0, 30], zoom: 2 })
    map.current = mapInstance

    let layersInitialized = false
    let cancelled = false

    const handleDragEnd = (wp: Waypoint, lngLat: mapboxgl.LngLat) => {
      setWaypoints(prev => {
        pushHistory(prev)
        const updated = prev.map(w => w.id === wp.id ? { ...w, lng: lngLat.lng, lat: lngLat.lat } : w)
        rebuildMarkers(updated, handleDragEnd)
        buildRoute(updated)
        return updated
      })
    }

    map.current.on('load', () => {
      if (cancelled || layersInitialized) return
      layersInitialized = true

      mapInstance.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} } })
      mapInstance.addLayer({ id: 'route-casing', type: 'line', source: 'route', paint: { 'line-color': '#000', 'line-width': 6, 'line-opacity': 0.4 } })
      mapInstance.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#ffffff', 'line-width': 5, 'line-opacity': 1, 'line-border-color': '#000000', 'line-border-width': 1 } })
      loadHeatmap()

      if (pendingSharedRouteRef.current) {
        setRouteName(pendingSharedRouteRef.current.name)
        const loadedWaypoints: Waypoint[] = pendingSharedRouteRef.current.waypoints.map((w: any, i: number) => ({
          id: w.id ?? `wp-loaded-${i}`, lng: w.lng, lat: w.lat, nextProfile: w.nextProfile,
        }))
        setWaypoints(loadedWaypoints)
        rebuildMarkers(loadedWaypoints, handleDragEnd)
        if (loadedWaypoints.length >= 2) buildRoute(loadedWaypoints)
        mapInstance.fitBounds(getBounds(loadedWaypoints), { padding: 80, duration: 0 })
      }
    })

    map.current.on('click', (e) => {
      if (cancelled) return
      if ((e.originalEvent.target as HTMLElement).closest('.mapboxgl-marker')) return

      const profile = (map.current as any).__defaultProfile as ProfileValue ?? 'mapbox/walking'
      const clickPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      const isCtrlClick = e.originalEvent.ctrlKey || e.originalEvent.metaKey
      const isInsertModeActive = (map.current as any).__insertMode === true

      if (isCtrlClick || isInsertModeActive) {
        setWaypoints(prev => {
          pushHistory(prev)
          if (prev.length < 2) {
            const newWp: Waypoint = { id: `wp-${Date.now()}`, lng: e.lngLat.lng, lat: e.lngLat.lat, nextProfile: profile }
            const updated = [...prev, newWp]
            rebuildMarkers(updated, handleDragEnd)
            if (updated.length >= 2) buildRoute(updated)
            return updated
          }
          const segmentIndex = findNearestSegment(clickPoint, prev)
          const newWp: Waypoint = { id: `wp-${Date.now()}`, lng: e.lngLat.lng, lat: e.lngLat.lat, nextProfile: profile }
          const updated = [...prev.slice(0, segmentIndex + 1), newWp, ...prev.slice(segmentIndex + 1)]
          rebuildMarkers(updated, handleDragEnd)
          buildRoute(updated)
          return updated
        })
        if (isInsertModeActive) { (map.current as any).__insertMode = false; setInsertMode(false) }
        return
      }

      const newWp: Waypoint = { id: `wp-${Date.now()}`, lng: e.lngLat.lng, lat: e.lngLat.lat, nextProfile: profile }
      setWaypoints(prev => {
        pushHistory(prev)
        const withUpdatedLast = prev.length > 0
          ? prev.map((w, i) => i === prev.length - 1 ? { ...w, nextProfile: profile } : w)
          : prev
        const updated = [...withUpdatedLast, newWp]
        rebuildMarkers(updated, handleDragEnd)
        if (updated.length >= 2) buildRoute(updated)
        return updated
      })
    })

    return () => { cancelled = true; mapInstance.remove(); if (map.current === mapInstance) map.current = null }
  }, [])

  useEffect(() => { if (map.current) (map.current as any).__defaultProfile = defaultProfile }, [defaultProfile])
  useEffect(() => { if (map.current) (map.current as any).__mapStyle = selectedStyle }, [selectedStyle])
  useEffect(() => { if (map.current) (map.current as any).__insertMode = insertMode }, [insertMode])

  useEffect(() => {
    if (!map.current || !heatmapLoadedRef.current) return
    const v = showHeatmap ? 'visible' : 'none'
    if (map.current.getLayer('heatmap-lines')) map.current.setLayoutProperty('heatmap-lines', 'visibility', v)
  }, [showHeatmap])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!map.current) return
    if (ownGeojsonRef.current && map.current.getSource('heatmap-activities')) {
      const src = map.current.getSource('heatmap-activities') as mapboxgl.GeoJSONSource
      src.setData({ ...ownGeojsonRef.current, features: filterFeatures(ownGeojsonRef.current.features, selectedTypes) })
    }
    for (const username of activeFriends) {
      const geojson = friendCacheRef.current.get(username)
      if (!geojson) continue
      const src = map.current.getSource(friendSourceId(username)) as mapboxgl.GeoJSONSource
      if (src) src.setData({ ...geojson, features: filterFeatures(geojson.features, selectedTypes) })
    }
  }, [selectedTypes, activeFriends])

  useEffect(() => {
    if (!map.current) return
    if (isInitialStyleRender.current) { isInitialStyleRender.current = false; return }

    const handleDragEnd = (wp: Waypoint, lngLat: mapboxgl.LngLat) => {
      setWaypoints(prev => {
        pushHistory(prev)
        const updated = prev.map(w => w.id === wp.id ? { ...w, lng: lngLat.lng, lat: lngLat.lat } : w)
        rebuildMarkers(updated, handleDragEnd)
        buildRoute(updated)
        return updated
      })
    }

    map.current.setStyle(selectedStyle)
    map.current.once('styledata', () => {
      if (!map.current) return
      map.current.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: routeCoordsRef.current }, properties: {} } })
      map.current.addLayer({ id: 'route-casing', type: 'line', source: 'route', paint: { 'line-color': '#000', 'line-width': 6, 'line-opacity': 0.4 } })
      map.current.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#ffffff', 'line-width': 5, 'line-opacity': 1, 'line-border-color': '#000000', 'line-border-width': 1 } })
      heatmapLoadedRef.current = false
      if (showHeatmap) loadHeatmap()
      map.current?.once('idle', () => {
        if (!map.current?.getLayer('heatmap-lines')) return
        const s = selectedStyle
        map.current.setPaintProperty('heatmap-lines', 'line-color', [
          'match', ['get', 'type'],
          'Run', ownColorsRef.current.Run ?? '#FC4C02', 'Ride', ownColorsRef.current.Ride ?? '#3498DB',
          'Hike', ownColorsRef.current.Hike ?? '#27AE60', 'Walk', ownColorsRef.current.Walk ?? '#F39C12',
          'Swim', ownColorsRef.current.Swim ?? '#9B59B6', heatmapColorForStyle(s),
        ])
        map.current.setPaintProperty('heatmap-lines', 'line-opacity', heatmapOpacityForStyle(s))
      })
      reloadFriendLayers()
      rebuildMarkers(waypoints, handleDragEnd)
    })
  }, [selectedStyle])

  function updateWaypointProfile(id: string, profile: ProfileValue) {
    setWaypoints(prev => {
      pushHistory(prev)
      const updated = prev.map(w => w.id === id ? { ...w, nextProfile: profile } : w)
      buildRoute(updated)
      return updated
    })
  }

  function removeWaypoint(id: string) {
    markersRef.current.get(id)?.remove()
    markersRef.current.delete(id)
    setWaypoints(prev => {
      pushHistory(prev)
      const updated = prev.filter(w => w.id !== id)
      const handleDragEnd = (wp: Waypoint, lngLat: mapboxgl.LngLat) => {
        pushHistory(prev)
        setWaypoints(p => {
          const u = p.map(w => w.id === wp.id ? { ...w, lng: lngLat.lng, lat: lngLat.lat } : w)
          buildRoute(u)
          return u
        })
      }
      rebuildMarkers(updated, handleDragEnd)
      if (updated.length >= 2) buildRoute(updated)
      else {
        routeCoordsRef.current = []
        setRouteStats(null)
        const src = map.current?.getSource('route') as mapboxgl.GeoJSONSource
        src?.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} })
      }
      return updated
    })
  }

  function clearAll() {
    pushHistory(waypoints)
    markersRef.current.forEach(m => m.remove())
    markersRef.current.clear()
    routeCoordsRef.current = []
    setWaypoints([])
    setRouteStats(null)
    const src = map.current?.getSource('route') as mapboxgl.GeoJSONSource
    src?.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} })
  }

  function reverseRoute() {
    setWaypoints(prev => {
      pushHistory(prev)
      const reversed = [...prev].reverse()
      const handleDragEnd = (wp: Waypoint, lngLat: mapboxgl.LngLat) => {
        setWaypoints(p => {
          pushHistory(prev)
          const u = p.map(w => w.id === wp.id ? { ...w, lng: lngLat.lng, lat: lngLat.lat } : w)
          buildRoute(u)
          return u
        })
      }
      rebuildMarkers(reversed, handleDragEnd)
      buildRoute(reversed)
      return reversed
    })
  }

  function undo() {
    if (historyRef.current.length === 0) return
    const previous = historyRef.current.pop()!
    const handleDragEnd = (wp: Waypoint, lngLat: mapboxgl.LngLat) => {
      setWaypoints(prev => {
        pushHistory(prev)
        const updated = prev.map(w => w.id === wp.id ? { ...w, lng: lngLat.lng, lat: lngLat.lat } : w)
        rebuildMarkers(updated, handleDragEnd)
        buildRoute(updated)
        return updated
      })
    }
    setWaypoints(previous)
    rebuildMarkers(previous, handleDragEnd)
    if (previous.length >= 2) {
      buildRoute(previous)
    } else {
      routeCoordsRef.current = []
      setRouteStats(null)
      const src = map.current?.getSource('route') as mapboxgl.GeoJSONSource
      src?.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} })
    }
  }

  const canExport = routeCoordsRef.current.length > 0
  const filteredProfiles = publicProfiles.filter(p =>
    p.full_name?.toLowerCase().includes(friendSearch.toLowerCase()) ||
    p.username?.toLowerCase().includes(friendSearch.toLowerCase())
  )

  // ── Shared sidebar content — rendered once, used in both the
  //    desktop sidebar and the mobile slide-up drawer ──────────

  const sidebarBody = (
    <>
      {/* Route name */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.58rem', letterSpacing: '0.2em', color: 'var(--sleeve-gold)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Route Planner
        </p>
        <input
          value={routeName}
          onChange={e => setRouteName(e.target.value)}
          style={{
            background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
            color: 'var(--text)', fontSize: '1.1rem', fontWeight: 700,
            fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase',
            outline: 'none', width: '100%', paddingBottom: '0.25rem',
          }}
        />
        <p style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: '0.5rem', letterSpacing: '0.04em' }}>
          Tap the map to add waypoints
        </p>
      </div>

      {/* Insert mode toggle */}
      <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setInsertMode(v => !v)}
          disabled={waypoints.length < 2}
          style={{
            width: '100%', padding: '0.6rem', cursor: waypoints.length >= 2 ? 'pointer' : 'default',
            border: `1px solid ${insertMode ? 'var(--sleeve-gold)' : 'var(--border)'}`,
            background: insertMode ? 'rgba(166, 124, 59, 0.15)' : 'transparent',
            color: insertMode ? 'var(--sleeve-gold)' : waypoints.length >= 2 ? 'var(--muted)' : 'var(--disabled-fg)',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase',
            transition: 'all 0.15s',
          }}
        >
          {insertMode ? 'Tap map to insert...' : 'Insert point'}
        </button>
        <p style={{ fontSize: '0.58rem', color: 'var(--muted)', marginTop: '0.4rem', opacity: 0.6, lineHeight: 1.5 }}>
          Or Ctrl+click on desktop
        </p>
      </div>

      {/* Default profile */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.58rem', letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
          Next segment
        </p>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {PROFILES.map(p => (
            <button key={p.value} onClick={() => setDefaultProfile(p.value as ProfileValue)} style={{
              flex: 1, padding: '0.5rem 0.25rem', cursor: 'pointer',
              border: `1px solid ${defaultProfile === p.value ? 'var(--sleeve-gold)' : 'var(--border)'}`,
              background: defaultProfile === p.value ? 'rgba(166, 124, 59, 0.1)' : 'transparent',
              color: defaultProfile === p.value ? 'var(--sleeve-gold)' : 'var(--muted)',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase',
              transition: 'all 0.15s',
            }}>
              <div style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>{p.icon}</div>
              {p.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '0.58rem', color: 'var(--muted)', marginTop: '0.5rem', opacity: 0.6, lineHeight: 1.5 }}>
          Applies to the next waypoint you place. Change per-waypoint below.
        </p>
      </div>

      {/* Stats */}
      {routeStats && (
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1.5rem' }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1.6rem', color: 'var(--text)', lineHeight: 1 }}>
              {formatDistance(routeStats.distanceKm)}
            </div>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginTop: '0.25rem' }}>
              Distance
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1.6rem', color: 'var(--text)', lineHeight: 1 }}>
              {routeStats.elevationGainM === null ? '…' : `+${formatElevation(routeStats.elevationGainM)}`}
            </div>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginTop: '0.25rem' }}>
              Elevation
            </div>
          </div>
        </div>
      )}

      {/* Friends */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.58rem', letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
          Starred athletes
        </p>
        <input
          type="text"
          placeholder="Search athletes..."
          value={friendSearch}
          onChange={e => setFriendSearch(e.target.value)}
          style={{
            width: '100%', background: 'var(--surface-soft)',
            border: '1px solid var(--border)', color: 'var(--text)',
            padding: '0.4rem 0.6rem', fontSize: '0.65rem',
            fontFamily: "'DM Mono', monospace", outline: 'none',
            marginBottom: '0.6rem', borderRadius: '2px',
          }}
        />

        {publicProfiles.length === 0 && (
          <p style={{ fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.7, lineHeight: 1.7 }}>
            No starred athletes yet. Star athletes on the{' '}
            <a href="/explore" style={{ color: 'var(--sleeve-gold)', textDecoration: 'none' }}>Explorer page</a>
            {' '}to add their heatmaps here.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {filteredProfiles.map((profile, i) => {
            const isActive = activeFriends.has(profile.username)
            const isLoading = loadingFriend === profile.username
            const color = FRIEND_COLORS[i % FRIEND_COLORS.length]
            const initials = profile.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

            return (
              <button
                key={profile.id}
                onClick={() => toggleFriend(profile, i)}
                disabled={isLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.5rem 0.6rem', cursor: 'pointer',
                  background: isActive ? `${color}12` : 'var(--surface-soft)',
                  border: `1px solid ${isActive ? color + '44' : 'var(--border)'}`,
                  transition: 'all 0.15s', textAlign: 'left',
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name}
                      style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'var(--surface-strong)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.55rem', fontWeight: 700, color: 'var(--muted)',
                      fontFamily: "'Barlow Condensed', sans-serif",
                    }}>
                      {initials}
                    </div>
                  )}
                  {isActive && (
                    <div style={{
                      position: 'absolute', bottom: -1, right: -1,
                      width: 8, height: 8, borderRadius: '50%',
                      background: color, border: '1.5px solid var(--bg2)',
                    }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.7rem', fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 600, color: isActive ? color : 'var(--text)',
                    letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {profile.full_name}
                  </div>
                  <div style={{ fontSize: '0.58rem', color: 'var(--muted)' }}>
                    {profile.activity_count.toLocaleString()} activities
                  </div>
                </div>

                <div style={{
                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${isActive ? color : 'var(--border)'}`,
                  background: isActive ? color : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isLoading && (
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      border: '1px solid var(--muted)', borderTopColor: 'transparent',
                      animation: 'spin 0.6s linear infinite',
                    }} />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Activity type filter */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.58rem', letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
          Activity types
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          <button onClick={() => setSelectedTypes(new Set())} style={{
            padding: '0.3rem 0.6rem', cursor: 'pointer', borderRadius: '2px',
            border: `1px solid ${selectedTypes.size === 0 ? 'var(--sleeve-gold)' : 'var(--border)'}`,
            background: selectedTypes.size === 0 ? 'rgba(166, 124, 59, 0.1)' : 'transparent',
            color: selectedTypes.size === 0 ? 'var(--sleeve-gold)' : 'var(--muted)',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase',
            transition: 'all 0.15s',
          }}>
            All
          </button>
          {ALL_SPORT_TYPES.map(t => {
            const active = selectedTypes.has(t)
            const color = TYPE_COLORS[t]
            return (
              <button key={t} onClick={() => toggleType(t)} style={{
                padding: '0.3rem 0.6rem', cursor: 'pointer', borderRadius: '2px',
                background: active ? color + '22' : 'transparent',
                color: active ? color : 'var(--muted)',
                border: active ? `1px solid ${color}66` : '1px solid var(--border)',
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}>
                {t}
              </button>
            )
          })}
        </div>
      </div>

      {/* Map style + heatmap toggle */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.58rem', letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
          Map style
        </p>
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
          {MAP_STYLES.map(s => (
            <button key={s.value} onClick={() => setSelectedStyle(s.value)} style={{
              flex: 1, padding: '0.4rem 0.2rem', cursor: 'pointer',
              border: `1px solid ${selectedStyle === s.value ? 'var(--emphasis-border)' : 'var(--border)'}`,
              background: selectedStyle === s.value ? 'var(--surface-strong)' : 'transparent',
              color: selectedStyle === s.value ? 'var(--text)' : 'var(--muted)',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase',
              transition: 'all 0.15s',
            }}>
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.62rem', color: 'var(--muted)', letterSpacing: '0.04em' }}>Show my activities</span>
          <button onClick={() => setShowHeatmap(v => !v)} style={{
            width: '36px', height: '20px', borderRadius: '10px', border: 'none',
            background: showHeatmap ? 'var(--sleeve-gold)' : 'var(--surface-strong)',
            cursor: 'pointer', padding: '2px',
            display: 'flex', alignItems: 'center',
            justifyContent: showHeatmap ? 'flex-end' : 'flex-start',
            transition: 'background 0.2s', flexShrink: 0,
          }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
          </button>
        </div>
      </div>

      {/* Share */}
      <div style={{ padding: '1rem 1.5rem 0' }}>
        <button
          onClick={shareRoute}
          disabled={waypoints.length < 2 || sharing}
          style={{
            width: '100%', padding: '0.6rem', cursor: waypoints.length > 0 ? 'pointer' : 'default',
            border: '1px solid var(--border)', background: 'transparent',
            color: waypoints.length > 0 ? 'var(--sleeve-gold)' : 'var(--disabled-fg)',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}
        >
          {sharing ? 'Saving...' : shareUrl ? '✓ Link copied' : '⤴ Save to my profile'}
        </button>
      </div>

      {/* Export / Undo / Reverse / Clear */}
      <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button
          onClick={() => downloadGPX(routeCoordsRef.current, routeName)}
          disabled={!canExport}
          style={{
            padding: '0.75rem', cursor: canExport ? 'pointer' : 'default',
            border: 'none', borderRadius: '2px',
            background: canExport ? 'var(--sleeve-gold)' : 'var(--surface-soft)',
            color: canExport ? '#fff' : 'var(--muted)',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            transition: 'all 0.15s',
          }}
        >
          ↓ Export GPX
        </button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={undo} disabled={historyRef.current.length === 0} style={{
            flex: 1, padding: '0.6rem', cursor: 'pointer',
            border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            ↺ Undo
          </button>
          <button onClick={reverseRoute} disabled={waypoints.length < 2} style={{
            flex: 1, padding: '0.6rem', cursor: waypoints.length >= 2 ? 'pointer' : 'default',
            border: '1px solid var(--border)', background: 'transparent',
            color: waypoints.length >= 2 ? 'var(--muted)' : 'var(--disabled-fg)',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            ⇄ Reverse
          </button>
          <button onClick={clearAll} disabled={waypoints.length === 0} style={{
            flex: 1, padding: '0.6rem', cursor: waypoints.length > 0 ? 'pointer' : 'default',
            border: '1px solid var(--border)', background: 'transparent',
            color: waypoints.length > 0 ? 'var(--sleeve-gold)' : 'var(--disabled-fg)',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            ✕ Clear
          </button>
        </div>
      </div>
    </>
  )

  // ── Render ───────────────────────────────────────────────

  return (
    <div style={{ height: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{ display: 'flex', flex: 1, marginTop: '3.5rem', overflow: 'hidden', position: 'relative' }}>

        {/* ── Desktop sidebar — hidden below md ── */}
        <div
          className="hidden md:flex"
          style={{
            width: '280px', flexShrink: 0,
            background: 'var(--bg2)', borderRight: '1px solid var(--border)',
            flexDirection: 'column', overflowY: 'auto',
          }}
        >
          {sidebarBody}
        </div>

        {/* ── Map ─────────────────────────── */}
        <div style={{ position: 'relative', flex: 1 }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

          {loading && (
            <div style={{
              position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--panel-bg)', border: '1px solid var(--border)',
              padding: '0.5rem 1rem', fontSize: '0.65rem', letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--muted)',
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>
              <span style={{ color: 'var(--sleeve-gold)', marginRight: '0.5rem' }}>⬤</span>
              Calculating route...
            </div>
          )}

          {/* Mobile toggle button */}
          <button
            className="flex md:hidden"
            onClick={() => setMobilePanel(v => !v)}
            style={{
              position: 'absolute', top: '1.5rem', left: '0.8rem', zIndex: 20,
              width: 48, height: 48, borderRadius: '50%',
              background: mobilePanel ? 'var(--sleeve-gold)' : 'var(--panel-bg)',
              border: '1px solid var(--sleeve-gold)',
              color: mobilePanel ? 'var(--bg)' : 'var(--sleeve-gold)',
              fontSize: '1.2rem', cursor: 'pointer',
              alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}
            aria-label="Toggle route controls"
          >
            {mobilePanel ? '✕' : '☰'}
          </button>

          {/* Mobile slide-up drawer */}
          {mobilePanel && (
            <div
              className="md:hidden"
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 15,
                background: 'var(--bg2)', borderTop: '1px solid var(--border)',
                backdropFilter: 'blur(16px)',
                maxHeight: '78vh', overflowY: 'auto',
                paddingBottom: '1.5rem',
              }}
            >
              {sidebarBody}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .mapboxgl-ctrl-bottom-right { margin-bottom: 0.5rem; margin-right: 0.5rem; }
        .mapboxgl-ctrl-attrib {
          background: var(--panel-bg) !important;
          color: var(--muted) !important;
          font-size: 0.55rem !important;
        }
        .mapboxgl-ctrl-attrib a { color: var(--muted) !important; }
        .mapboxgl-ctrl-bottom-left { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}