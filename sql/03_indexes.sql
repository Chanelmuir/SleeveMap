-- Fast lookup of activities by user
create index if not exists activities_user_id_idx on activities(user_id);

-- Spatial index for map queries
create index if not exists activities_route_idx on activities using gist(route);

-- Fast lookup of favourites by user
create index if not exists favourites_user_id_idx on favourites(user_id);
