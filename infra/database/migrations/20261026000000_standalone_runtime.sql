-- Backend privileges previously provided implicitly by the hosted service.
-- Only the isolated server role receives these; customer column grants remain unchanged.
grant select, insert, update, delete on all tables in schema public to newsvio_service;
grant usage, select on all sequences in schema public to newsvio_service;
grant usage, select on all sequences in schema private to newsvio_service;

-- The standalone worker will poll durable rows. Remove HTTP webhook triggers rather than
-- leave inserts depending on pg_net, Vault or a hosted Edge Function URL.
drop trigger if exists notifications_after_insert on public.notifications;
drop trigger if exists fact_checks_after_insert on public.fact_checks;

-- Fail closed if application code forgets transaction-local identity. Missing claims are
-- no longer an implicit backend identity on the runtime connection.
create or replace function private.request_role()
returns text language sql stable set search_path = '' as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    case when session_user = 'newsvio_runtime' then 'anon' else 'system' end)
$$;
