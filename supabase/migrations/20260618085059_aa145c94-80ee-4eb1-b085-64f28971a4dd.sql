
-- 1. Profiles: restrict SELECT to self + teammates
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_self_or_teammate ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.company_members cm_self
      JOIN public.company_members cm_other
        ON cm_self.company_id = cm_other.company_id
      WHERE cm_self.user_id = auth.uid()
        AND cm_other.user_id = profiles.id
    )
  );

-- 2. company_members: remove self-insert escalation
DROP POLICY IF EXISTS members_insert_admin_or_self_initial ON public.company_members;
CREATE POLICY members_insert_admin ON public.company_members
  FOR INSERT TO authenticated
  WITH CHECK (public.has_company_role(company_id, auth.uid(), 'admin'));
-- (handle_new_company trigger is SECURITY DEFINER, so first-admin bootstrap still works)

-- 3. audit_log: restrict NULL company_id rows to the owning user
DROP POLICY IF EXISTS audit_select_members ON public.audit_log;
CREATE POLICY audit_select_members ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );

-- 4. Admin helper to look up a user by email (replaces direct profiles email query)
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE lower(email) = lower(_email) LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated;

-- 5. Realtime: restrict postgres_changes subscriptions on notifications to own user_id
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_own_realtime_select" ON realtime.messages;
CREATE POLICY "notifications_own_realtime_select" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.topic() = 'notifications:' || auth.uid()::text
  );
