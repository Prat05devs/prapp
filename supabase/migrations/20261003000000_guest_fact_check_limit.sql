-- Guests get 2 free fact checks a day; the 3rd asks them to log in (client feedback, Oct 2026).
-- Only moves the shipped default: a value the admin already changed in Settings is kept.
update public.app_settings
set value = '2'
where key = 'factcheck.guest_daily_limit'
  and value = '3'::jsonb;
