-- =============================================================================
-- Database webhooks + scheduled jobs (LLD §11.1, §12, §14)
--
-- Edge Functions and the Next.js cron routes are called with pg_net. URLs and keys come
-- from Supabase Vault, so the same migration works locally and in production:
--
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service role key>',        'service_role_key');
--   select vault.create_secret('https://example.in',         'site_url');
--   select vault.create_secret('<CRON_SECRET>',              'cron_secret');
--
-- Missing extensions or secrets turn every call into a no-op (never an error), so inserts
-- keep working and the plain-Postgres SQL tests still run.
-- =============================================================================

do $ext$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
end
$ext$;

-- Decrypted Vault secret, or null when Vault / the secret is not set up.
create or replace function private.secret(p_name text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v text;
begin
  if to_regclass('vault.decrypted_secrets') is null then
    return null;
  end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
    into v using p_name;
  return nullif(v, '');
end $$;

-- Fire-and-forget POST. Returns false when pg_net or the target is not configured.
create or replace function private.http_post(p_url text, p_bearer text, p_body jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_url is null or p_bearer is null or to_regproc('net.http_post') is null then
    return false;
  end if;
  execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 5000)'
    using p_url, p_body,
          jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || p_bearer);
  return true;
exception when others then
  raise warning 'http_post to % failed: %', p_url, sqlerrm;
  return false;
end $$;

create or replace function private.call_edge_function(p_name text, p_body jsonb default '{}')
returns boolean language sql security definer set search_path = '' as $$
  select private.http_post(
    private.secret('project_url') || '/functions/v1/' || p_name,
    private.secret('service_role_key'),
    p_body)
$$;

create or replace function private.call_site_cron(p_path text)
returns boolean language sql security definer set search_path = '' as $$
  select private.http_post(
    private.secret('site_url') || p_path,
    private.secret('cron_secret'),
    '{}'::jsonb)
$$;

revoke execute on function private.secret(text), private.http_post(text, text, jsonb),
  private.call_edge_function(text, jsonb), private.call_site_cron(text)
  from public, anon, authenticated;

-- ---- Database webhooks -------------------------------------------------------

-- notifications INSERT → send-notifications (push + email). In-app-only rows need no call.
create or replace function private.notifications_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.channels && array['push', 'email'] then
    perform private.call_edge_function('send-notifications',
      jsonb_build_object('type', 'INSERT', 'record', jsonb_build_object('id', new.id)));
  end if;
  return new;
end $$;

create trigger notifications_after_insert after insert on public.notifications
  for each row execute function private.notifications_after_insert();

-- fact_checks INSERT (queued) → fact-check-worker. pg_cron also sweeps every minute.
create or replace function private.fact_checks_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'queued' then
    perform private.call_edge_function('fact-check-worker',
      jsonb_build_object('type', 'INSERT', 'record', jsonb_build_object('id', new.id)));
  end if;
  return new;
end $$;

create trigger fact_checks_after_insert after insert on public.fact_checks
  for each row execute function private.fact_checks_after_insert();

-- ---- Scheduled jobs (LLD §14) ------------------------------------------------
-- cron.schedule() with an existing name replaces that job, so this is re-runnable.
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('expire-pending-orders', '*/30 * * * *', 'select public.svc_expire_pending_orders()');
    perform cron.schedule('deadline-sweep',        '*/10 * * * *', 'select public.svc_deadline_sweep()');
    perform cron.schedule('cleanup-usage-counters', '15 3 * * *',
      $$delete from public.usage_counters where day < current_date - 30$$);

    perform cron.schedule('reconcile-payments',  '*/10 * * * *', $$select private.call_site_cron('/api/cron/reconcile-payments')$$);
    perform cron.schedule('cleanup',             '30 3 * * *',   $$select private.call_site_cron('/api/cron/cleanup')$$);
    perform cron.schedule('pending-fact-checks', '45 7 * * *',   $$select private.call_site_cron('/api/cron/pending-fact-checks')$$);
    perform cron.schedule('notifications-retry', '*/5 * * * *',
      $$select private.call_edge_function('send-notifications', '{"mode":"retry"}'::jsonb)$$);
    perform cron.schedule('fact-check-sweeper',  '* * * * *',
      $$select private.call_edge_function('fact-check-worker', '{"mode":"sweep"}'::jsonb)
         where exists (select 1 from public.fact_checks
                        where status = 'queued'
                           or (status = 'processing' and locked_at < now() - interval '2 minutes' and attempts < 3))$$);
  end if;
end
$cron$;
