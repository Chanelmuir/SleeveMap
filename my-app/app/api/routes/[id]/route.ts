import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/routes/[id]: fetch a single route
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabase
    .from('routes')
    .select('id, name, waypoints, distance_km, created_at')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH /api/routes/[id]: rename a route (owner only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = req.cookies.get('user_id')?.value
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { name } = await req.json()
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('routes')
    .update({ name: name.trim() })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, name')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found or not yours' }, { status: 404 })
  return NextResponse.json(data)
}

// DELETE /api/routes/[id]: delete a route (owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = req.cookies.get('user_id')?.value
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { error } = await supabase
    .from('routes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}