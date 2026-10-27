-- Owner-requested admin credentials. Values are encrypted in the application before storage.
-- No client, including an admin browser, may read ciphertext or write these rows directly.
create table public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('razorpay', 'gemini')),
  label text not null check (char_length(label) between 1 and 80),
  environment text not null check (environment in ('test', 'live', 'production')),
  project_id text,
  metadata jsonb not null default '{}',
  encrypted_secret text not null,
  key_hint text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((provider = 'razorpay' and environment in ('test', 'live') and project_id is null)
      or (provider = 'gemini' and environment = 'production' and length(project_id) > 0))
);
create table public.integration_active (
  provider text primary key check (provider in ('razorpay', 'gemini')),
  credential_id uuid not null references public.integration_credentials(id),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table public.integration_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  provider text not null,
  credential_id uuid not null references public.integration_credentials(id),
  action text not null check (action in ('created', 'activated')),
  created_at timestamptz not null default now()
);
alter table public.integration_credentials enable row level security;
alter table public.integration_active enable row level security;
alter table public.integration_audit enable row level security;
revoke all on public.integration_credentials, public.integration_active, public.integration_audit from public, anon, authenticated;
grant select, insert on public.integration_credentials, public.integration_audit to service_role;
grant select, insert, update on public.integration_active to service_role;
grant usage, select on sequence public.integration_audit_id_seq to service_role;

-- Pin each checkout to an immutable credential version. Existing intents retain null and
-- continue to use the historical environment configuration until they have been settled.
alter table public.payment_intents add column credential_id uuid references public.integration_credentials(id);
grant select (credential_id, livemode) on public.payment_intents to authenticated;

create or replace function public.svc_save_integration(
  p_actor uuid, p_provider text, p_label text, p_environment text, p_project_id text,
  p_metadata jsonb, p_encrypted_secret text, p_key_hint text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.profiles where id = p_actor and role = 'admin' and is_active) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  insert into public.integration_credentials(provider, label, environment, project_id, metadata, encrypted_secret, key_hint, created_by)
  values (p_provider, p_label, p_environment, nullif(p_project_id, ''), p_metadata, p_encrypted_secret, p_key_hint, p_actor)
  returning id into v_id;
  insert into public.integration_audit(actor_id, provider, credential_id, action)
  values (p_actor, p_provider, v_id, 'created');
  return v_id;
end $$;

create or replace function public.svc_activate_integration(p_actor uuid, p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_provider text;
begin
  if not exists (select 1 from public.profiles where id = p_actor and role = 'admin' and is_active) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  select provider into v_provider from public.integration_credentials where id = p_id;
  if not found then raise exception 'validation_failed' using errcode = 'P0001'; end if;
  insert into public.integration_active(provider, credential_id, updated_by) values(v_provider, p_id, p_actor)
  on conflict (provider) do update set credential_id = excluded.credential_id,
    updated_by = excluded.updated_by, updated_at = now();
  insert into public.integration_audit(actor_id, provider, credential_id, action)
  values (p_actor, v_provider, p_id, 'activated');
end $$;

revoke execute on function public.svc_save_integration(uuid,text,text,text,text,jsonb,text,text), public.svc_activate_integration(uuid,uuid) from public, anon, authenticated;
grant execute on function public.svc_save_integration(uuid,text,text,text,text,jsonb,text,text), public.svc_activate_integration(uuid,uuid) to service_role;

-- The pinned credential is written in the same transaction as the payment intent.
create function public.svc_create_configured_payment_intent(
  p_order_id uuid, p_razorpay_order_id text, p_amount_minor int, p_currency text,
  p_package_snapshot jsonb, p_livemode boolean, p_credential_id uuid)
returns public.payment_intents language plpgsql security definer set search_path = '' as $$
declare v public.payment_intents;
begin
  if not exists (select 1 from public.integration_credentials where id = p_credential_id
      and provider = 'razorpay' and environment = case when p_livemode then 'live' else 'test' end) then
    raise exception 'validation_failed' using errcode = 'P0001';
  end if;
  select * into v from public.svc_create_payment_intent(p_order_id, p_razorpay_order_id,
    p_amount_minor, p_currency, p_package_snapshot, p_livemode);
  update public.payment_intents set credential_id = p_credential_id where id = v.id returning * into v;
  return v;
end $$;
revoke execute on function public.svc_create_configured_payment_intent(uuid,text,int,text,jsonb,boolean,uuid) from public, anon, authenticated;
grant execute on function public.svc_create_configured_payment_intent(uuid,text,int,text,jsonb,boolean,uuid) to service_role;
