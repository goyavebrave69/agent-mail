-- Migration 016: Add body_text column to emails table
-- Stores the plain-text body of the email for draft generation and display.
-- Replaces the ephemeral bodyPreview (snippet) approach used in sync-emails.

ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS body_text TEXT;

COMMENT ON COLUMN public.emails.body_text IS 'Plain-text email body. Populated at sync time. NULL for emails synced before migration 016.';
