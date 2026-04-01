-- Migration 016: add sent timestamp for draft analytics and send tracking

ALTER TABLE public.drafts
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
