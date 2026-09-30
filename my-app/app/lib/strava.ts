// Strava now charges for API access, so activity sync and webhook ingestion
// are switched off. Sign-in with Strava (OAuth) stays on so users can still
// reach their account to view or delete their existing data. The sync code is
// kept intact — flip this to true to re-enable it (see README → "Strava integration").
export const STRAVA_SYNC_ENABLED = false

export const STRAVA_SYNC_DISABLED_MESSAGE =
  'Strava sync is disabled — Strava now charges for API access. Previously synced data is still available.'
