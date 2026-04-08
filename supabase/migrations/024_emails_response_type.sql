-- Migration 024: Add response_type column to emails table
-- Stores whether an email requires a plain text reply or a PDF quote/attachment

ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS response_type TEXT NOT NULL DEFAULT 'unknown'
    CONSTRAINT emails_response_type_check
      CHECK (response_type IN ('text_reply', 'pdf_required', 'unknown'));

CREATE INDEX IF NOT EXISTS idx_emails_response_type
  ON public.emails (user_id, response_type);
