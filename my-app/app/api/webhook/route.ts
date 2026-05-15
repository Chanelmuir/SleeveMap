import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import polyline from '@mapbox/polyline'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================
// GET — Strava calls this once to verify your webhook endpoint
// ============================================================
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    // Respond with the challenge to confirm ownership
    return NextResponse.json({ 'hub.challenge': challenge })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ============================================================
// POST — Strava calls this whenever an event happens
// ============================================================
export async function POST(req: NextRequest) {
  const event = await req.json()

  // We only care about activity creation/updates, not deletions or athlete events
  if (event.object_type !== 'activity') {
    return NextResponse.json({ ok: true })
  }

  const stravaActivityId: number = event.object_id
  const stravaAthleteId: number = event.owner_id
  const aspectType: string = event.aspect_type // 'create' | 'update' | 'delete'

  // Look up our user by their Strava athlete id
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, access_token, refresh_token, token_expires_at')
    .eq('strava_id', stravaAthleteId)
    .single()

  if (userError || !user) {
    // Athlete hasn't connected to SleeveMap — ignore
    return NextResponse.json({ ok: true })
  }

  // Handle deletion
  if (aspectType === 'delete') {
    await supabase
      .from('activities')
      .delete()
      .eq('strava_id', stravaActivityId)

    return NextResponse.json({ ok: true })
  }

  // For create/update: fetch the full activity from Strava
  const accessToken = await getValidToken(user)
  const activityRes = await fetch(
    `https://www.strava.com/api/v3/activities/${stravaActivityId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!activityRes.ok) {
    console.error('Failed to fetch activity from Strava:', stravaActivityId)
    return NextResponse.json({ ok: true }) // Still return 200 so Strava doesn't retry
  }

  const activity = await activityRes.json()

  // Skip activities with no GPS data
  if (!activity.map?.summary_polyline) {
    return NextResponse.json({ ok: true })
  }

  const coords = decodePolyline(activity.map.summary_polyline)
  if (!coords) return NextResponse.json({ ok: true })

  const { error } = await supabase.rpc('upsert_activities', {
    activity_rows: [
      {
        user_id: user.id,
        strava_id: activity.id,
        name: activity.name,
        type: activity.sport_type ?? activity.type,
        start_date: activity.start_date,
        distance_m: activity.distance,
        moving_time_s: activity.moving_time,
        elevation_m: activity.total_elevation_gain,
        city: activity.location_city ?? null,
        country: activity.location_country ?? null,
        coords,
      },
    ],
  })

  if (error) console.error('Webhook upsert error:', error)

  return NextResponse.json({ ok: true })
}

// ── Helpers ──────────────────────────────────────────────────

function decodePolyline(encoded: string): [number, number][] | null {
  try {
    const coords = polyline.decode(encoded) // [[lat, lng], ...]
    if (coords.length < 2) return null
    return coords.map(([lat, lng]) => [lng, lat]) // flip to [lng, lat] for PostGIS
  } catch {
    return null
  }
}

async function getValidToken(user: {
  id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
}): Promise<string> {
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

  await supabase
    .from('users')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: new Date(data.expires_at * 1000).toISOString(),
    })
    .eq('id', user.id)

  return data.access_token
}