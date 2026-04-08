-- Migration 019: add sort_order to custom_categories + seed default categories

ALTER TABLE public.custom_categories
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_custom_categories_user_sort
  ON public.custom_categories (user_id, sort_order);

-- Seed the 6 default categories for every existing user that has none yet.
-- sort_order matches the canonical display order.
INSERT INTO public.custom_categories (user_id, name, slug, sort_order)
SELECT
  u.id,
  defaults.name,
  defaults.slug,
  defaults.sort_order
FROM auth.users u
CROSS JOIN (VALUES
  ('Quote',     'quote',     0),
  ('Inquiry',   'inquiry',   1),
  ('Invoice',   'invoice',   2),
  ('Follow-up', 'follow_up', 3),
  ('Spam',      'spam',      4),
  ('Other',     'other',     5)
) AS defaults(name, slug, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_categories cc WHERE cc.user_id = u.id
);
