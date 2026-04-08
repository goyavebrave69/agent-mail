-- Migration 022: Add body_html column to emails table
-- Stores the raw HTML body for proper email rendering in the UI.

ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS body_html TEXT;

COMMENT ON COLUMN public.emails.body_html IS 'Raw HTML email body. Populated at sync time. NULL for emails synced before migration 022.';
