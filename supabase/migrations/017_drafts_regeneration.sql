-- Migration 017: track draft regeneration attempts and optional instruction

ALTER TABLE public.drafts
ADD COLUMN IF NOT EXISTS regeneration_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.drafts
ADD COLUMN IF NOT EXISTS generation_instruction TEXT;
