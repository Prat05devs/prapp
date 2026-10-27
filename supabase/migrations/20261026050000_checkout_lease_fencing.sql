-- A timed-out request must not attach a new intent after another request took its lease.
create function public.svc_create_checkout_intent(
  p_order_id uuid, p_razorpay_order_id text, p_amount_minor int, p_currency text,
  p_package_snapshot jsonb, p_livemode boolean, p_lease_token uuid, p_credential_id uuid default null)
returns public.payment_intents language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.checkout_leases where order_id=p_order_id and token=p_lease_token
    and expires_at>now() for update;
  if not found then raise exception 'order_locked' using errcode = 'P0001'; end if;
  if p_credential_id is null then
    return public.svc_create_payment_intent(p_order_id,p_razorpay_order_id,p_amount_minor,p_currency,p_package_snapshot,p_livemode);
  end if;
  return public.svc_create_configured_payment_intent(p_order_id,p_razorpay_order_id,p_amount_minor,p_currency,p_package_snapshot,p_livemode,p_credential_id);
end $$;
revoke execute on function public.svc_create_checkout_intent(uuid,text,int,text,jsonb,boolean,uuid,uuid) from public, anon, authenticated;
grant execute on function public.svc_create_checkout_intent(uuid,text,int,text,jsonb,boolean,uuid,uuid) to service_role;
