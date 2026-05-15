import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const [activitiesRes, usersRes, distanceRes] = await Promise.all([
    // Total activity count
    supabase
      .from('activities')
      .select('id', { count: 'exact', head: true }),

    // Public profile count
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_public', true),

    // Total distance across all activities
    supabase
      .from('activities')
      .select('distance_m'),
  ])

  const totalActivities = activitiesRes.count ?? 0
  const publicProfiles = usersRes.count ?? 0
  const totalDistanceKm = Math.round(
    (distanceRes.data ?? []).reduce((sum, a) => sum + (a.distance_m ?? 0), 0) / 1000
  )

  return NextResponse.json({
    totalActivities,
    publicProfiles,
    totalDistanceKm,
    chanelActivities: 3392, 
    chanelDistanceKm: 32705, 
  })
}