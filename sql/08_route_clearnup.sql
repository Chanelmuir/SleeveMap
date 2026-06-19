-- Enable pg_cron (one-time setup, run in Supabase SQL Editor)
create extension if not exists pg_cron;

-- Schedule a daily cleanup at 3am UTC
select cron.schedule(
  'delete-stale-routes',
  '0 3 * * *',
  $$
    delete from routes
    where last_accessed_at < now() - interval '30 days'
  $$
);