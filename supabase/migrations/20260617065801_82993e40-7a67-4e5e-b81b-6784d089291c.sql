ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS rejection_reason text;