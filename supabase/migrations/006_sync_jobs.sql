-- Migration 006: email_sync_jobs table
-- Tracks active sync jobs per connected mailbox.
-- Rows are auto-created/deleted via triggers on email_connections.

CREATE TABLE IF NOT EXISTS public.email_sync_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'imap')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  last_synced_at  TIMESTAMPTZ,
  last_error      TEXT,
  retry_count     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT sync_jobs_unique_per_provider UNIQUE (user_id, provider)
);

-- RLS: users can read their own sync status; only service_role can INSERT/UPDATE
ALTER TABLE public.email_sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_jobs_select_owner ON public.email_sync_jobs
  FOR SELECT USING (auth.uid() = user_id);

-- Auto-create sync job when an email_connections row is inserted
CREATE OR REPLACE FUNCTION public.create_sync_job_on_connect()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.email_sync_jobs (user_id, provider)
  VALUES (NEW.user_id, NEW.provider)
  ON CONFLICT (user_id, provider)
    DO UPDATE SET
      status      = 'active',
      retry_count = 0,
      last_error  = NULL,
      updated_at  = NOW();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_sync_job_on_connect() FROM PUBLIC;

CREATE TRIGGER after_email_connection_insert
  AFTER INSERT ON public.email_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.create_sync_job_on_connect();

-- Auto-delete sync job when an email_connections row is deleted
-- This resolves the TODO in disconnectMailboxAction() from story 2.4
CREATE OR REPLACE FUNCTION public.delete_sync_job_on_disconnect()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.email_sync_jobs
  WHERE user_id = OLD.user_id AND provider = OLD.provider;
  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_sync_job_on_disconnect() FROM PUBLIC;

CREATE TRIGGER after_email_connection_delete
  AFTER DELETE ON public.email_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_sync_job_on_disconnect();

-- Backfill: create sync jobs for existing email_connections
INSERT INTO public.email_sync_jobs (user_id, provider)
SELECT user_id, provider FROM public.email_connections
ON CONFLICT (user_id, provider) DO NOTHING;
