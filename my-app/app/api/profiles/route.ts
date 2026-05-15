import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, full_name, avatar_url, is_public, last_synced_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // For each user, get their activity count
  const withCounts = await Promise.all(
    (data ?? []).map(async user => {
      const { count } = await supabase
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      return { ...user, activity_count: count ?? 0 }
    })
  )

  return NextResponse.json(withCounts)
}