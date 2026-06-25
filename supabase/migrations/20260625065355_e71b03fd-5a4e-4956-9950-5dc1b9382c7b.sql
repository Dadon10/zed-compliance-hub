-- Revoke broad access from all SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_company() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_company_role(uuid, uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_company_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_user_id_by_email(text) FROM PUBLIC, anon;

-- Re-grant ONLY where required at runtime
-- RLS policy helpers (called by authenticated users via policy evaluation)
GRANT EXECUTE ON FUNCTION public.is_company_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_company_role(uuid, uuid, public.app_role) TO authenticated;
-- RPC called from the Members page to invite by email
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated;

-- Trigger functions run as the trigger owner; no client role needs EXECUTE
-- (handle_new_user, handle_new_company stay locked down)