-- Migration 017: Enable pg_net and register sync-emails cron job
-- Fixes: migration 007 silently failed because pg_net wasn't installed
-- and ALTER DATABASE SET is blocked on Supabase hosted.
-- Values are hardcoded per Supabase recommendation for pg_cron + pg_net.

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove stale schedule if any
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
    url     := 'https://reycvhyvgfbtltsvcvfn.supabase.co/functions/v1/sync-emails',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJleWN2aHl2Z2ZidGx0c3ZjdmZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY3OTgyOSwiZXhwIjoyMDkwMjU1ODI5fQ.OQnoxuGWSpUaeJ_Jock5InkEZ_j22NnwXf4NYoh2l_I"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
