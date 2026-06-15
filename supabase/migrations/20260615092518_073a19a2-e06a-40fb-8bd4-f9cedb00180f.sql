
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'hr', 'finance', 'compliance');
CREATE TYPE public.statutory_body AS ENUM ('NAPSA', 'PAYE', 'NHIMA', 'WCFCB');
CREATE TYPE public.submission_status AS ENUM ('draft', 'validated', 'approved', 'submitted', 'rejected', 'failed');
CREATE TYPE public.upload_status AS ENUM ('processing', 'validated', 'has_errors', 'archived');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ COMPANIES ============
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tpin TEXT,
  napsa_employer_no TEXT,
  nhima_employer_no TEXT,
  wcfcb_no TEXT,
  industry TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ============ COMPANY MEMBERS (roles per company) ============
CREATE TABLE public.company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'hr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.is_company_member(_company UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = _company AND user_id = _user);
$$;

CREATE OR REPLACE FUNCTION public.has_company_role(_company UUID, _user UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company AND user_id = _user AND (role = _role OR role = 'admin')
  );
$$;

-- Companies policies
CREATE POLICY "companies_select_members" ON public.companies FOR SELECT TO authenticated
  USING (public.is_company_member(id, auth.uid()));
CREATE POLICY "companies_insert_authenticated" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "companies_update_admin" ON public.companies FOR UPDATE TO authenticated
  USING (public.has_company_role(id, auth.uid(), 'admin'));
CREATE POLICY "companies_delete_admin" ON public.companies FOR DELETE TO authenticated
  USING (public.has_company_role(id, auth.uid(), 'admin'));

-- Company members policies
CREATE POLICY "members_select_self_or_company" ON public.company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_company_member(company_id, auth.uid()));
CREATE POLICY "members_insert_admin_or_self_initial" ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_company_role(company_id, auth.uid(), 'admin'));
CREATE POLICY "members_update_admin" ON public.company_members FOR UPDATE TO authenticated
  USING (public.has_company_role(company_id, auth.uid(), 'admin'));
CREATE POLICY "members_delete_admin" ON public.company_members FOR DELETE TO authenticated
  USING (public.has_company_role(company_id, auth.uid(), 'admin'));

-- When a company is created, auto-add creator as admin
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_company_created AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();

-- ============ PAYROLL UPLOADS ============
CREATE TABLE public.payroll_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  file_name TEXT NOT NULL,
  status public.upload_status NOT NULL DEFAULT 'processing',
  employee_count INT NOT NULL DEFAULT 0,
  total_gross NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_napsa NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_paye NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_nhima NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_wcfcb NUMERIC(14,2) NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_uploads TO authenticated;
GRANT ALL ON public.payroll_uploads TO service_role;
ALTER TABLE public.payroll_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uploads_select_members" ON public.payroll_uploads FOR SELECT TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "uploads_insert_members" ON public.payroll_uploads FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id, auth.uid()) AND uploaded_by = auth.uid());
CREATE POLICY "uploads_update_members" ON public.payroll_uploads FOR UPDATE TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "uploads_delete_admin" ON public.payroll_uploads FOR DELETE TO authenticated
  USING (public.has_company_role(company_id, auth.uid(), 'admin'));

-- ============ PAYROLL RECORDS ============
CREATE TABLE public.payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.payroll_uploads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_id TEXT,
  ssn TEXT,
  tpin TEXT,
  nhima_no TEXT,
  gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  napsa NUMERIC(12,2) NOT NULL DEFAULT 0,
  paye NUMERIC(12,2) NOT NULL DEFAULT 0,
  nhima NUMERIC(12,2) NOT NULL DEFAULT 0,
  wcfcb NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_records TO authenticated;
GRANT ALL ON public.payroll_records TO service_role;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "records_select_members" ON public.payroll_records FOR SELECT TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "records_insert_members" ON public.payroll_records FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "records_update_members" ON public.payroll_records FOR UPDATE TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "records_delete_members" ON public.payroll_records FOR DELETE TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));

-- ============ SUBMISSIONS ============
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES public.payroll_uploads(id) ON DELETE SET NULL,
  body public.statutory_body NOT NULL,
  period_month INT NOT NULL,
  period_year INT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.submission_status NOT NULL DEFAULT 'draft',
  reference TEXT,
  approved_by UUID REFERENCES auth.users(id),
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_select_members" ON public.submissions FOR SELECT TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "subs_insert_members" ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "subs_update_members" ON public.submissions FOR UPDATE TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "subs_delete_admin" ON public.submissions FOR DELETE TO authenticated
  USING (public.has_company_role(company_id, auth.uid(), 'admin'));

-- ============ AUDIT LOG ============
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select_members" ON public.audit_log FOR SELECT TO authenticated
  USING (company_id IS NULL OR public.is_company_member(company_id, auth.uid()));
CREATE POLICY "audit_insert_members" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============ RATE TABLES (admin-editable statutory rates) ============
CREATE TABLE public.rate_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body public.statutory_body NOT NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rate_tables TO authenticated;
GRANT ALL ON public.rate_tables TO service_role;
ALTER TABLE public.rate_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rates_select_all" ON public.rate_tables FOR SELECT TO authenticated USING (true);

-- Seed Zambian statutory rates (2024 reference values)
INSERT INTO public.rate_tables (body, name, config) VALUES
  ('NAPSA', '2024 NAPSA Standard', '{"employee_rate": 0.05, "employer_rate": 0.05, "ceiling": 27050}'::jsonb),
  ('PAYE', '2024 ZRA PAYE Bands', '{"bands": [{"upto": 5100, "rate": 0}, {"upto": 7100, "rate": 0.20}, {"upto": 9200, "rate": 0.30}, {"upto": null, "rate": 0.37}]}'::jsonb),
  ('NHIMA', '2024 NHIMA Standard', '{"employee_rate": 0.01, "employer_rate": 0.01}'::jsonb),
  ('WCFCB', '2024 WCFCB Standard', '{"rate": 0.015}'::jsonb);

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notif_insert_own" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_uploads_company ON public.payroll_uploads(company_id, created_at DESC);
CREATE INDEX idx_records_upload ON public.payroll_records(upload_id);
CREATE INDEX idx_submissions_company ON public.submissions(company_id, created_at DESC);
CREATE INDEX idx_audit_company ON public.audit_log(company_id, created_at DESC);
CREATE INDEX idx_members_user ON public.company_members(user_id);
