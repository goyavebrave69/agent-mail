-- Migration 011: add category and priority_rank to emails table
-- category: strict enum for AI triage (FR10)
-- priority_rank: integer score for inbox sorting (FR11, higher = more urgent)

ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('quote', 'inquiry', 'invoice', 'follow_up', 'spam', 'other')),
  ADD COLUMN IF NOT EXISTS priority_rank INTEGER NOT NULL DEFAULT 0;

-- Index for priority-sorted inbox (story 4.2)
CREATE INDEX idx_emails_user_priority ON public.emails (user_id, priority_rank DESC, received_at DESC);
