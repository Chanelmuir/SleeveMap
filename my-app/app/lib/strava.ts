// Strava now charges for API access, so OAuth sign-in, activity sync and
// webhook ingestion are switched off. The integration code is kept intact —
// flip this to true to re-enable everything (see README → "Strava integration").
export const STRAVA_ENABLED = false

export const STRAVA_DISABLED_MESSAGE =
  'Strava integration is disabled — Strava now charges for API access. Previously synced data is still available.'
