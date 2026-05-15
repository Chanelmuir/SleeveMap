import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/me — return the logged-in user's profile
export async function GET(req: NextRequest) {
  const userId = req.cookies.get('user_id')?.value
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, username, full_name, avatar_url, is_public, last_synced_at')
    .eq('id', userId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// PATCH /api/me — update username or is_public
export async function PATCH(req: NextRequest) {
  const userId = req.cookies.get('user_id')?.value
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const allowed = ['username', 'is_public']
  const updates: Record<string, any> = {}

  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // If updating username, check it's not already taken
  if (updates.username) {
    const clean = updates.username.toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!clean) return NextResponse.json({ error: 'Invalid username' }, { status: 400 })
    updates.username = clean

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', clean)
      .neq('id', userId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select('id, username, full_name, avatar_url, is_public, last_synced_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}