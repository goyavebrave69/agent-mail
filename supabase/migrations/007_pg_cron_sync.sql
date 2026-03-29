-- Migration 007: pg_cron schedule for email sync
-- Triggers the sync-emails Edge Function every 5 minutes.
-- Requires pg_cron and pg_net extensions (enabled in Supabase dashboard).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing schedule if any (idempotent)
SELECT cron.unschedule('sync-emails-every-5min')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'sync-emails-every-5min'
  );

-- Schedule: call sync-emails Edge Function every 5 minutes
SELECT cron.schedule(
  'sync-emails-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_functions_url', true)
               || '/sync-emails',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body    := '{}'::jsonb
  )
  $$
);
