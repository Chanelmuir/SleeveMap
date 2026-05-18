import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import polyline from '@mapbox/polyline'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const userId = req.cookies.get('user_id')?.value
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const year = searchParams.get('year')

  const { data, error } = await supabase.rpc('get_activities_geojson', {
    p_user_id: userId,
    p_type: type ?? null,
    p_year: year ? parseInt(year) : null,
  })

  if (error) {
    console.error('Activities fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Build GeoJSON on the server from the returned encoded polylines
  const features = (data ?? [])
    .filter((row: any) => row.geometry)
    .map((row: any) => {
      const coords = polyline.decode(row.geometry) // [[lat, lng], ...]
      return {
        type: 'Feature',
        id: row.strava_id,
        geometry: {
          type: 'LineString',
          coordinates: coords.map(([lat, lng]) => [lng, lat]),
        },
        properties: {
          id:            row.id,
          strava_id:     row.strava_id,
          name:          row.name,
          type:          row.type,
          start_date:    row.start_date,
          distance_m:    row.distance_m,
          moving_time_s: row.moving_time_s,
          elevation_m:   row.elevation_m,
        },
      }
    })

  return NextResponse.json({
    type: 'FeatureCollection',
    features,
  })
}