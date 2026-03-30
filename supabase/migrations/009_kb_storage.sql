-- Migration 009: knowledge-base storage bucket + RLS policies
-- Files stored at path: {user_id}/{timestamp}-{filename}
-- Storage RLS scopes access by first path segment (user_id folder).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-base',
  'knowledge-base',
  false,
  10485760, -- 10 MB
  ARRAY[
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- SELECT: users can download their own files
CREATE POLICY kb_storage_select_owner ON storage.objects
  FOR SELECT USING (
    bucket_id = 'knowledge-base'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- INSERT: users can upload into their own folder
CREATE POLICY kb_storage_insert_owner ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'knowledge-base'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- DELETE: users can delete their own files
CREATE POLICY kb_storage_delete_owner ON storage.objects
  FOR DELETE USING (
    bucket_id = 'knowledge-base'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
