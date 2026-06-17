CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('zedcompliance-deadline-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'zedcompliance-deadline-reminders');

SELECT cron.schedule(
  'zedcompliance-deadline-reminders',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--07c90716-11b9-40da-8d62-be41aff97828.lovable.app/api/public/hooks/deadline-reminders',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcHB3dG1kdWh1bXd2amdvaWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MDY1OTYsImV4cCI6MjA5NzA4MjU5Nn0.-9BHYE-bfpC8SjH4sFmzanGUTUOkiUoi52b3QYYmFBw"}'::jsonb,
    body := '{"source":"pg_cron"}'::jsonb
  );
  $$
);