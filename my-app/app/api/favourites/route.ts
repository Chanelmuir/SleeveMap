import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/favourites
export async function GET(req: NextRequest) {
  const userId = req.cookies.get('user_id')?.value
  if (!userId) return NextResponse.json([], { status: 200 })

  const { data, error } = await supabase
    .from('favourites')
    .select('target_id, users!favourites_target_id_fkey(id, username, full_name, avatar_url, is_public)')
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const profiles = await Promise.all(
    (data ?? [])
      .map((row: any) => row.users)
      .filter((u: any) => u?.is_public)
      .map(async (u: any) => {
        const { count } = await supabase
          .from('activities')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', u.id)
        return { ...u, activity_count: count ?? 0 }
      })
  )

  return NextResponse.json(profiles)
}

// POST /api/favourites: toggle a favourite
export async function POST(req: NextRequest) {
  const userId = req.cookies.get('user_id')?.value
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { target_id } = await req.json()
  if (!target_id) return NextResponse.json({ error: 'Missing target_id' }, { status: 400 })

  // Check if already favourited
  const { data: existing } = await supabase
    .from('favourites')
    .select('id')
    .eq('user_id', userId)
    .eq('target_id', target_id)
    .single()

  if (existing) {
    // Remove
    await supabase.from('favourites').delete().eq('id', existing.id)
    return NextResponse.json({ favourited: false })
  } else {
    // Add
    await supabase.from('favourites').insert({ user_id: userId, target_id })
    return NextResponse.json({ favourited: true })
  }
}