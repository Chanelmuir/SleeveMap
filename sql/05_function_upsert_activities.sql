-- Inserts or updates activities from a JSON array of activity rows.
-- Called from the sync route and webhook handler.
-- Builds PostGIS geometry from a [[lng, lat], ...] coordinate array
-- rather than a WKT string, avoiding JSON string length limits.

create or replace function upsert_activities(activity_rows jsonb)
returns void
language plpgsql
security definer
as $$
declare
  row jsonb;
  geom geometry;
begin
  for row in select * from jsonb_array_elements(activity_rows)
  loop
    select ST_MakeLine(
      array(
        select ST_MakePoint(
          (coord->>0)::float,
          (coord->>1)::float
        )
        from jsonb_array_elements(row->'coords') as coord
      )
    ) into geom;

    if geom is null or ST_NPoints(geom) < 2 then
      continue;
    end if;

    insert into activities (
      user_id, strava_id, name, type, start_date,
      distance_m, moving_time_s, elevation_m, route
    ) values (
      (row->>'user_id')::uuid,
      (row->>'strava_id')::bigint,
      row->>'name',
      row->>'type',
      (row->>'start_date')::timestamptz,
      (row->>'distance_m')::float,
      (row->>'moving_time_s')::int,
      (row->>'elevation_m')::float,
      ST_SetSRID(geom, 4326)
    )
    on conflict (strava_id) do update set
      name          = excluded.name,
      type          = excluded.type,
      start_date    = excluded.start_date,
      distance_m    = excluded.distance_m,
      moving_time_s = excluded.moving_time_s,
      elevation_m   = excluded.elevation_m,
      route         = excluded.route;
  end loop;
end;
$$;
