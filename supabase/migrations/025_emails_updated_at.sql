-- Add updated_at column to emails table
-- Required by server actions that stamp mutations (archive, trash, mark-read, etc.)

ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Back-fill existing rows with received_at as a reasonable proxy
UPDATE public.emails SET updated_at = received_at WHERE updated_at = NOW();

CREATE INDEX IF NOT EXISTS idx_emails_updated_at ON public.emails (user_id, updated_at DESC);
