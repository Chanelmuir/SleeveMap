import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import polyline from '@mapbox/polyline'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Decode summary_polyline into [[lng, lat], ...] coordinate array
function decodePolyline(encoded: string): [number, number][] | null {
  try {
    const coords = polyline.decode(encoded) // returns [[lat, lng], ...]
    if (coords.length < 2) return null
    return coords.map(([lat, lng]) => [lng, lat]) // flip to [lng, lat] for PostGIS
  } catch {
    return null
  }
}

async function fetchActivityPage(accessToken: string, page: number): Promise<any[]> {
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=200&page=${page}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error(`Strava fetch failed: ${res.status}`)
  return res.json()
}

async function getValidToken(userId: string): Promise<string> {
  const { data: user, error } = await supabase
    .from('users')
    .select('access_token, refresh_token, token_expires_at')
    .eq('id', userId)
    .single()

  if (error || !user) throw new Error('User not found')

  const expired = new Date(user.token_expires_at) <= new Date()
  if (!expired) return user.access_token

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: user.refresh_token,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error('Token refresh failed')

  await supabase
    .from('users')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: new Date(data.expires_at * 1000).toISOString(),
    })
    .eq('id', userId)

  return data.access_token
}

export async function POST(req: NextRequest) {
  const userId = req.cookies.get('user_id')?.value
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const accessToken = await getValidToken(userId)

    let page = 1
    let totalSynced = 0
    let totalSkipped = 0

    while (true) {
      const activities = await fetchActivityPage(accessToken, page)
      if (activities.length === 0) break

      const rows = activities
        .filter(a => a.map?.summary_polyline)
        .map(a => {
          const coords = decodePolyline(a.map.summary_polyline)
          if (!coords) return null

          return {
            user_id: userId,
            strava_id: a.id,
            name: a.name,
            type: a.sport_type ?? a.type,
            start_date: a.start_date,
            distance_m: a.distance,
            moving_time_s: a.moving_time,
            elevation_m: a.total_elevation_gain,
            city: a.location_city ?? null,
            country: a.location_country ?? null,
            coords, // ← coordinate array, not WKT string
          }
        })
        .filter(Boolean)

      totalSkipped += activities.length - rows.length

      if (rows.length > 0) {
        const { error } = await supabase.rpc('upsert_activities', {
          activity_rows: rows,
        })

        if (error) {
          console.error('Upsert error on page', page, error)
          return NextResponse.json(
            { error: 'Failed to save activities', detail: error.message },
            { status: 500 }
          )
        }

        totalSynced += rows.length
      }

      if (activities.length < 200) break
      page++
    }

    await supabase
      .from('users')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', userId)

    return NextResponse.json({
      ok: true,
      synced: totalSynced,
      skipped: totalSkipped,
      pages: page,
    })
  } catch (err: any) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}