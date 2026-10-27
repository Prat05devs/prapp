-- Durable webhook processing and refund request identity (provider guidance, 2026-10-26).
alter table public.webhook_events
  add column attempts int not null default 0,
  add column locked_at timestamptz,
  add column lock_token uuid,
  add column next_attempt_at timestamptz not null default now();
create index webhook_pending_idx on public.webhook_events(next_attempt_at)
  where processed_at is null;
-- Previous code acknowledged these as processed even when dispatch failed. Retry them.
update public.webhook_events set processed_at = null where error is not null;

create function public.svc_claim_webhook()
returns public.webhook_events language plpgsql security definer set search_path = '' as $$
declare v public.webhook_events;
begin
  select * into v from public.webhook_events
  where processed_at is null and next_attempt_at <= now()
    and (locked_at is null or locked_at < now() - interval '2 minutes')
  order by next_attempt_at for update skip locked limit 1;
  if not found then return null; end if;
  update public.webhook_events set locked_at = now(), lock_token = gen_random_uuid(), attempts = attempts + 1
  where event_id = v.event_id returning * into v;
  return v;
end $$;

create function public.svc_complete_webhook(p_event_id text, p_lock_token uuid, p_error text default null)
returns void language sql security definer set search_path = '' as $$
  update public.webhook_events set
    processed_at = case when p_error is null then now() else null end,
    error = left(p_error, 100), locked_at = null, lock_token = null,
    next_attempt_at = now() + make_interval(secs => least(3600, (30 * power(2, least(attempts, 7)))::int))
  where event_id = p_event_id and lock_token = p_lock_token
$$;

create table public.refund_requests (
  id uuid primary key,
  payment_id uuid not null references public.payments(id),
  order_id uuid not null references public.orders(id),
  actor_id uuid references public.profiles(id) on delete set null,
  amount_minor int not null check (amount_minor >= 100),
  reason text not null,
  razorpay_refund_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.refund_requests enable row level security;
revoke all on public.refund_requests from public, anon, authenticated;
grant select on public.refund_requests to service_role;

create function public.svc_reserve_refund(p_id uuid, p_payment_id uuid, p_order_id uuid, p_actor uuid, p_amount_minor int, p_reason text)
returns public.refund_requests language plpgsql security definer set search_path = '' as $$
declare v public.refund_requests; p public.payments; v_reserved bigint; v_pending bigint;
begin
  if not exists(select 1 from public.profiles where id = p_actor and role = 'admin' and is_active) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  select * into p from public.payments where id = p_payment_id and order_id = p_order_id for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0001'; end if;
  select * into v from public.refund_requests where id = p_id;
  if found then
    if v.payment_id <> p_payment_id or v.order_id <> p_order_id or v.amount_minor <> p_amount_minor or v.reason <> p_reason then
      raise exception 'validation_failed' using errcode = 'P0001';
    end if;
    return v;
  end if;
  if p.status not in ('captured', 'partially_refunded') then raise exception 'order_not_rejectable' using errcode = 'P0001'; end if;
  select coalesce(sum(amount_minor),0) into v_reserved from public.refund_requests
    where payment_id = p.id and completed_at is null;
  select coalesce(sum(amount_minor),0) into v_pending from public.refunds
    where payment_id = p.id and status = 'pending';
  if p_amount_minor < 100 or p_amount_minor > p.amount_minor - p.amount_refunded_minor - v_reserved - v_pending
      or char_length(trim(p_reason)) < 10 then raise exception 'validation_failed' using errcode = 'P0001'; end if;
  insert into public.refund_requests(id,payment_id,order_id,actor_id,amount_minor,reason)
    values(p_id,p_payment_id,p_order_id,p_actor,p_amount_minor,p_reason) returning * into v;
  return v;
end $$;

create function public.svc_complete_refund_request(p_id uuid, p_refund_id text)
returns void language sql security definer set search_path = '' as $$
  update public.refund_requests r set razorpay_refund_id = p_refund_id, completed_at = now()
  where r.id = p_id and exists(select 1 from public.refunds f where f.payment_id = r.payment_id
    and f.razorpay_refund_id = p_refund_id and f.amount_minor = r.amount_minor)
$$;

revoke execute on function public.svc_claim_webhook(), public.svc_complete_webhook(text,uuid,text),
  public.svc_reserve_refund(uuid,uuid,uuid,uuid,int,text), public.svc_complete_refund_request(uuid,text) from public, anon, authenticated;
grant execute on function public.svc_claim_webhook(), public.svc_complete_webhook(text,uuid,text),
  public.svc_reserve_refund(uuid,uuid,uuid,uuid,int,text), public.svc_complete_refund_request(uuid,text) to service_role;

-- Existing hosted scheduler during transition; the standalone scheduler uses the same route.
do $cron$
begin
  if exists(select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('payment-webhook-worker', '* * * * *', $$select private.call_site_cron('/api/cron/payment-webhooks')$$);
  end if;
end
$cron$;
