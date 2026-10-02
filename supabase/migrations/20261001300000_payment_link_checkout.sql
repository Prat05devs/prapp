-- razorpay.me link checkout for the first build (PAYMENTS_MODE=link, client 2026-10-01).
-- The customer pays on razorpay.me/@... and types the amount; nothing tells us who paid, so the
-- order is confirmed at the package price and flagged for an admin to verify in the Razorpay
-- dashboard (attention_reason 'verify_payment_link', cleared with admin_clear_attention).
-- Shares its body with svc_confirm_free_order; both go away with real Razorpay keys.

create or replace function private.confirm_without_gateway(
  p_order_id uuid, p_package_snapshot jsonb, p_amount_minor int, p_event text, p_attention text)
returns public.orders language plpgsql security definer set search_path = '' as $$
declare
  v_order   public.orders;
  v_profile public.profiles;
  v_images  int;
  v_now     timestamptz := now();
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0001'; end if;
  if v_order.status in ('paid', 'in_progress', 'changes_requested', 'published') then
    raise exception 'payment_already_made' using errcode = 'P0001';
  end if;
  if v_order.status not in ('draft', 'pending_payment', 'expired') then
    raise exception 'order_not_payable' using errcode = 'P0001';
  end if;
  if v_order.declaration_accepted_at is null then
    raise exception 'declaration_required' using errcode = 'P0001';
  end if;
  select count(*) into v_images from public.order_images where order_id = p_order_id;
  if v_images < 1 then raise exception 'image_required' using errcode = 'P0001'; end if;
  select * into v_profile from public.profiles where id = v_order.user_id;
  if v_profile.phone is null then raise exception 'profile_incomplete' using errcode = 'P0001'; end if;

  update public.payment_intents set status = 'abandoned'
   where order_id = p_order_id and status in ('created', 'attempted');

  update public.orders set
    status              = 'paid',
    current_intent_id   = null,
    package_snapshot    = p_package_snapshot,
    amount_minor        = p_amount_minor,
    currency            = 'INR',
    customer_name       = v_profile.full_name,
    customer_email      = v_profile.email,
    customer_phone      = v_profile.phone,
    checkout_started_at = coalesce(v_order.checkout_started_at, v_now),
    paid_at             = v_now,
    deadline_at         = v_now + make_interval(hours => coalesce((p_package_snapshot ->> 'turnaround_hours')::int, 24)),
    needs_attention     = p_attention is not null or needs_attention,
    attention_reason    = coalesce(p_attention, attention_reason)
  where id = p_order_id
  returning * into v_order;

  perform private.create_placements(p_order_id, p_package_snapshot);
  insert into public.order_events (order_id, actor_type, event, details)
  values (p_order_id, 'system', p_event,
          jsonb_build_object('package', p_package_snapshot ->> 'code',
                             'amount_minor', p_amount_minor,
                             'list_price_inr_paise', p_package_snapshot -> 'price_inr_paise'));
  return v_order;
end $$;

create or replace function public.svc_confirm_free_order(p_order_id uuid, p_package_snapshot jsonb)
returns public.orders language sql security definer set search_path = '' as $$
  select private.confirm_without_gateway(p_order_id, p_package_snapshot, 0, 'free_checkout', null)
$$;

create or replace function public.svc_confirm_link_order(p_order_id uuid, p_package_snapshot jsonb)
returns public.orders language sql security definer set search_path = '' as $$
  select private.confirm_without_gateway(
    p_order_id, p_package_snapshot, (p_package_snapshot ->> 'price_inr_paise')::int,
    'payment_link_checkout', 'verify_payment_link')
$$;

revoke all on function private.confirm_without_gateway(uuid, jsonb, int, text, text) from public, anon, authenticated;
revoke all on function public.svc_confirm_free_order(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.svc_confirm_link_order(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.svc_confirm_free_order(uuid, jsonb) to service_role;
grant execute on function public.svc_confirm_link_order(uuid, jsonb) to service_role;

-- Same as 20260930000000_free_checkout.sql, plus wording for unverified link payments.
create or replace function private.orders_after_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_link jsonb := jsonb_build_object('order_id', new.id, 'deep_link', '/orders/' || new.id);
  v_free boolean := coalesce(new.amount_minor, 0) = 0;
  -- Paid through the razorpay.me link: not verified yet, an admin checks the dashboard.
  v_pay_link boolean := new.attention_reason = 'verify_payment_link';
begin
  if new.status is distinct from old.status then
    insert into public.order_events (order_id, actor_id, actor_type, event, from_status, to_status, details)
    values (new.id, auth.uid(), private.current_actor_type(), 'status_changed', old.status, new.status,
            jsonb_strip_nulls(jsonb_build_object(
              'reason', case new.status when 'changes_requested' then new.changes_requested_reason
                                        when 'rejected' then new.rejection_reason end)));
  end if;

  if new.user_id is null then
    return new;
  end if;

  -- Customer notifications
  if new.status is distinct from old.status then
    if new.status = 'paid' and old.status in ('draft', 'pending_payment', 'expired', 'cancelled') then
      insert into public.notifications (user_id, type, title, body, data, channels)
      values (new.user_id, 'order_paid',
              case when v_pay_link then 'Order received' when v_free then 'Order confirmed' else 'Payment received' end,
              case when v_pay_link
                then 'Order ' || new.order_number || ': once we confirm your payment, your story will be published within '
                  || coalesce(new.package_snapshot ->> 'turnaround_hours', '24') || ' hours.'
                else 'Order ' || new.order_number || ': your story will be published within '
                  || coalesce(new.package_snapshot ->> 'turnaround_hours', '24') || ' hours.' end,
              v_link, '{in_app,push,email}');

      insert into public.notifications (user_id, type, title, body, data, channels)
      select p.id, 'staff_new_order', 'New order ' || new.order_number,
             'Deadline ' || to_char(new.deadline_at at time zone 'Asia/Kolkata', 'DD Mon HH24:MI') || ' IST',
             jsonb_build_object('order_id', new.id, 'deep_link', '/admin/orders/' || new.id), '{in_app}'
        from public.profiles p where p.role in ('editor', 'admin') and p.is_active;

    elsif new.status = 'changes_requested' then
      insert into public.notifications (user_id, type, title, body, data, channels)
      values (new.user_id, 'order_changes_requested', 'Changes needed for your story',
              coalesce(new.changes_requested_reason, 'Please review your submission.'),
              v_link, '{in_app,push,email}');

    elsif new.status = 'rejected' then
      insert into public.notifications (user_id, type, title, body, data, channels)
      values (new.user_id, 'order_rejected', 'We could not publish your story',
              coalesce(new.rejection_reason, 'Your order was not approved.')
                || case when v_free then ''
                        when v_pay_link then ' If you paid, we will refund you.'
                        else ' A full refund has been initiated.' end,
              v_link, '{in_app,push,email}');

    elsif new.status = 'refunded' then
      insert into public.notifications (user_id, type, title, body, data, channels)
      values (new.user_id, 'order_refunded', 'Refund processed',
              'The refund for order ' || new.order_number || ' has been processed. Banks can take 5–7 working days to show it.',
              v_link, '{in_app,push,email}');
    end if;
  end if;

  -- "Everything is posted, report ready" fires when the PDF is actually ready
  if new.report_status = 'ready' and old.report_status is distinct from 'ready' and new.status = 'published' then
    insert into public.notifications (user_id, type, title, body, data, channels)
    values (new.user_id, 'order_published',
            case when new.report_version > 1 then 'Your report was updated' else 'Your story is live!' end,
            'Everything is posted. Your report for ' || new.order_number || ' is ready to download.',
            v_link, '{in_app,push,email}');
  end if;

  return new;
end $$;
