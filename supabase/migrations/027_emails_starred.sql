-- Add is_starred column to emails table
ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN NOT NULL DEFAULT false;

-- Index for starred emails view
CREATE INDEX IF NOT EXISTS idx_emails_starred
  ON public.emails (user_id, is_starred)
  WHERE is_starred = true;
