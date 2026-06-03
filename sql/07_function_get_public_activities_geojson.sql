-- Returns activities for a public profile, looked up by username.
-- Only returns data if the user has is_public = true.
-- Called from /api/profiles/[username] for public map views.

create or replace function get_public_activities_geojson(p_username text)
returns table (
  id            uuid,
  strava_id     bigint,
  name          text,
  type          text,
  start_date    timestamptz,
  distance_m    float,
  moving_time_s int,
  elevation_m   float,
  geometry      text
)
language sql
stable
as $$
  select
    a.id,
    a.strava_id,
    a.name,
    a.type,
    a.start_date,
    a.distance_m,
    a.moving_time_s,
    a.elevation_m,
    ST_AsEncodedPolyline(ST_Simplify(a.route, 0.0001)) as geometry
  from activities a
  join users u on u.id = a.user_id
  where u.username = p_username
    and u.is_public = true
    and a.route is not null
  limit 10000
$$;
