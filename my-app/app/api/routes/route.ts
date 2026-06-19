import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/routes — list the logged-in user's saved routes
export async function GET(req: NextRequest) {
  const userId = req.cookies.get('user_id')?.value
  if (!userId) return NextResponse.json([], { status: 200 })

  const { data, error } = await supabase
    .from('routes')
    .select('id, name, waypoints, distance_km, created_at, last_accessed_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/routes — save a new route
export async function POST(req: NextRequest) {
  const userId = req.cookies.get('user_id')?.value
  const { name, waypoints, distance_km } = await req.json()

  if (!waypoints || waypoints.length < 2) {
    return NextResponse.json({ error: 'Route needs at least 2 waypoints' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('routes')
    .insert({
      user_id: userId ?? null, // guests can still share, just can't manage later
      name: name || 'Untitled Route',
      waypoints,
      distance_km: distance_km ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}