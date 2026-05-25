import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function generateUsername(stravaId: number): Promise<string> {
  const candidates = [
    `${stravaId}`,
    `${stravaId}_${Math.random().toString(36).slice(2, 6)}`
  ]

  for (const candidate of candidates) {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('username', candidate)
      .single()
    if (!data) return candidate
  }

  return `${stravaId}_${Date.now().toString(36)}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/?error=missing_code', req.url))
  }

  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  const tokenData = await tokenRes.json()

  if (!tokenRes.ok) {
    console.error('Strava token exchange failed:', tokenData)
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', req.url))
  }

  const { access_token, refresh_token, expires_at, athlete } = tokenData

  // Check if user exists
  const { data: existing } = await supabase
  .from('users')
  .select('id')
  .eq('strava_id', athlete.id)
  .single()

  const generatedUsername = await generateUsername(athlete.id)
  const { data: user, error } = await supabase
    .from('users')
    .upsert(
      {
        strava_id: athlete.id,
        ...(!existing && { username: athlete.username || generatedUsername }),
        full_name: `${athlete.firstname} ${athlete.lastname}`,
        avatar_url: athlete.profile,
        access_token,
        refresh_token,
        token_expires_at: new Date(expires_at * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'strava_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Supabase upsert failed:', error)
    return NextResponse.redirect(new URL('/?error=db_error', req.url))
  }

  // Only sync if this user has no activities yet (i.e. first login)
  const { count } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const isFirstLogin = count === 0
  if (isFirstLogin) {
    const syncUrl = new URL('/api/sync', req.url)
    fetch(syncUrl.toString(), {
      method: 'POST',
      headers: { Cookie: `user_id=${user.id}` },
    }).catch(err => console.error('Background sync failed to start:', err))
  }

  const response = NextResponse.redirect(
    new URL(isFirstLogin ? '/map?syncing=true' : '/map', req.url)
  )
  response.cookies.set('user_id', user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return response
}