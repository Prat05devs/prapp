-- Serialize the checkout API across processes while external provider calls are in flight.
-- A dead process releases its lease after 3 minutes; individual provider calls time out at 10s.
create table public.checkout_leases (
  order_id uuid primary key references public.orders(id) on delete cascade,
  token uuid not null,
  expires_at timestamptz not null
);
alter table public.checkout_leases enable row level security;
revoke all on public.checkout_leases from public, anon, authenticated;

create function public.svc_lock_checkout(p_order_id uuid, p_user_id uuid, p_token uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.orders where id = p_order_id and user_id = p_user_id) then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  insert into public.checkout_leases(order_id,token,expires_at)
  values(p_order_id,p_token,now() + interval '3 minutes')
  on conflict(order_id) do update set token = excluded.token, expires_at = excluded.expires_at
    where public.checkout_leases.expires_at < now();
  return found;
end $$;
create function public.svc_unlock_checkout(p_order_id uuid,p_token uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.checkout_leases where order_id = p_order_id and token = p_token
$$;
revoke execute on function public.svc_lock_checkout(uuid,uuid,uuid), public.svc_unlock_checkout(uuid,uuid) from public, anon, authenticated;
grant execute on function public.svc_lock_checkout(uuid,uuid,uuid), public.svc_unlock_checkout(uuid,uuid) to service_role;

-- Rejection and its refund obligation commit together. A crash after this RPC leaves a
-- durable request for reconciliation, even if the API never reaches the provider call.
create function public.admin_reject_and_reserve_refund(p_order_id uuid,p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare o public.orders; p public.payments; v_amount int;
begin
  perform private.assert_admin();
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0001'; end if;
  if o.status = 'rejected' and exists(select 1 from public.refund_requests where id = p_order_id) then
    return p_order_id;
  end if;
  perform public.admin_reject_order(p_order_id,p_reason);
  if o.paid_payment_id is null then return null; end if;
  select * into p from public.payments where id = o.paid_payment_id for update;
  v_amount := p.amount_minor - p.amount_refunded_minor
    - coalesce((select sum(amount_minor) from public.refunds where payment_id=p.id and status='pending'),0)
    - coalesce((select sum(amount_minor) from public.refund_requests where payment_id=p.id and completed_at is null),0);
  if v_amount < 100 then return null; end if;
  perform public.svc_reserve_refund(p_order_id,p.id,p_order_id,auth.uid(),v_amount,p_reason);
  return p_order_id;
end $$;
revoke execute on function public.admin_reject_and_reserve_refund(uuid,text) from public, anon;
grant execute on function public.admin_reject_and_reserve_refund(uuid,text) to authenticated;
