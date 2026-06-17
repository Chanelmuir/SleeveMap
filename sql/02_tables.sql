create table users (
  id                uuid primary key default gen_random_uuid(),
  strava_id         bigint unique not null,
  username          text unique,
  full_name         text,
  avatar_url        text,
  access_token      text not null,
  refresh_token     text not null,
  token_expires_at  timestamptz not null,
  is_public         boolean default false,
  activity_colors   jsonb default '{
    "Run":  "#FC4C02",
    "Ride": "#3498DB",
    "Hike": "#27AE60",
    "Walk": "#F39C12",
    "Swim": "#9B59B6"
  }'::jsonb,
  last_synced_at    timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table activities (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  strava_id      bigint unique not null,
  name           text,
  type           text,
  start_date     timestamptz,
  distance_m     float,
  moving_time_s  int,
  elevation_m    float,
  route          geometry(LineString, 4326),
  created_at     timestamptz default now()
);

create table favourites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  target_id  uuid not null references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, target_id)
);

create table routes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  name        text not null,
  waypoints   jsonb not null,
  distance_km float,
  created_at  timestamptz default now()
);

