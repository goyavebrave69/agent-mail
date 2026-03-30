-- Migration 010: add UPDATE RLS policy for kb_files
-- Required for retriggerIndexKbAction to reset status from 'error' to 'pending'.

CREATE POLICY kb_files_update_owner ON public.kb_files
  FOR UPDATE USING (auth.uid() = user_id);
