CREATE OR REPLACE FUNCTION public.delete_vault_secret(secret_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = secret_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_vault_secret(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_vault_secret(uuid) TO service_role;
