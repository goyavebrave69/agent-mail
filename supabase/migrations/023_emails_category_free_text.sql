-- Migration 023: Drop CHECK constraint on emails.category
-- Allows any TEXT value so custom user-defined category slugs can be stored.
-- Previously constrained to: quote | inquiry | invoice | follow_up | spam | other

ALTER TABLE public.emails
  DROP CONSTRAINT IF EXISTS emails_category_check;

COMMENT ON COLUMN public.emails.category IS
  'Category slug assigned by triage. Matches custom_categories.slug for the user, or "inbox" as fallback.';
