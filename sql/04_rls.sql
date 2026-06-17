-- Row Level Security

alter table users enable row level security;
alter table activities enable row level security;
alter table favourites enable row level security;
alter table routes enable row level security;

create policy "no public access to users"
  on users for all
  using (false);

create policy "no public access to activities"
  on activities for all
  using (false);

create policy "no public access to favourites"
  on favourites for all
  using (false);

create policy "no public access to routes"
  on routes for all
  using (false);