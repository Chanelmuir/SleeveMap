-- Returns a user's activities as encoded polylines for the private map.
-- Uses ST_Simplify to reduce point density before encoding,
-- keeping response sizes manageable for users with thousands of activities.
-- Called from /api/activities for the logged-in user's own map.

create or replace function get_activities_geojson(
  p_user_id uuid,
  p_type    text default null,
  p_year    int  default null
)
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
    id,
    strava_id,
    name,
    type,
    start_date,
    distance_m,
    moving_time_s,
    elevation_m,
    ST_AsEncodedPolyline(ST_Simplify(route, 0.0001)) as geometry
  from activities
  where user_id = p_user_id
    and route is not null
    and (p_type is null or type = p_type)
    and (p_year is null or extract(year from start_date) = p_year)
  limit 10000
$$;
