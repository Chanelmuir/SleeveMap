import { redirect } from 'next/navigation'
import { STRAVA_ENABLED } from '@/app/lib/strava'

export async function GET() {
  if (!STRAVA_ENABLED) redirect('/?error=strava_disabled')

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  })

  redirect(`https://www.strava.com/oauth/authorize?${params.toString()}`)
}