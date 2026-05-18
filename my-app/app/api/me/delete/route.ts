import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(req: NextRequest) {
  const userId = req.cookies.get('user_id')?.value
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Delete activities first (foreign key constraint)
  const { error: activitiesError } = await supabase
    .from('activities')
    .delete()
    .eq('user_id', userId)

  if (activitiesError) {
    console.error('Failed to delete activities:', activitiesError)
    return NextResponse.json({ error: 'Failed to delete activities' }, { status: 500 })
  }

  // Delete the user
  const { error: userError } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)

  if (userError) {
    console.error('Failed to delete user:', userError)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  // Clear the session cookie and redirect home
  const response = NextResponse.json({ ok: true })
  response.cookies.set('user_id', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  })

  return response
}