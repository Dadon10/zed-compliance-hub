-- Attach handle_new_company as trigger so creator becomes admin member
DROP TRIGGER IF EXISTS on_company_created ON public.companies;
CREATE TRIGGER on_company_created
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();

-- Backfill: add creators as admin members for any existing companies missing membership
INSERT INTO public.company_members (company_id, user_id, role)
SELECT c.id, c.created_by, 'admin'::app_role
FROM public.companies c
WHERE c.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.company_members m
    WHERE m.company_id = c.id AND m.user_id = c.created_by
  );