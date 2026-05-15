import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import polyline from '@mapbox/polyline'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  const { username } = await params

  // Check user exists and is public
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, username, full_name, avatar_url, is_public, last_synced_at')
    .eq('username', username)
    .single()

  if (userError || !user) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (!user.is_public) {
    return NextResponse.json({ error: 'Profile is private' }, { status: 403 })
  }

  // Get activity count
  const { count } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Get activities as encoded polylines
  const { data: activities, error: actError } = await supabase
    .rpc('get_public_activities_geojson', { p_username: username })

  if (actError) {
    console.error('Public activities fetch error:', actError)
    return NextResponse.json({ error: actError.message }, { status: 500 })
  }

  const features = (activities ?? [])
    .filter((row: any) => row.geometry)
    .map((row: any) => {
      const coords = polyline.decode(row.geometry)
      return {
        type: 'Feature',
        id: row.strava_id,
        geometry: {
          type: 'LineString',
          coordinates: coords.map(([lat, lng]: [number, number]) => [lng, lat]),
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
          city:          row.city,
          country:       row.country,
        },
      }
    })

  return NextResponse.json({
    user: {
      username: user.username,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      activity_count: count ?? 0,
    },
    geojson: {
      type: 'FeatureCollection',
      features,
    },
  })
}