-- Enable pg_cron (one-time setup, run in Supabase SQL Editor)
create extension if not exists pg_cron;

-- Schedule a daily cleanup at 3am UTC
select cron.schedule(
  'delete-old-routes',           -- job name
  '0 3 * * *',                   -- every day at 3am
  $$
    delete from routes
    where created_at < now() - interval '30 days'
  $$
);