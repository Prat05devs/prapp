-- Customer notification wording from VERBAL_SYSTEM.md §16 (push titles double as email subjects).
-- Same logic as the previous definitions (20261001300000_payment_link_checkout.sql and
-- 20260927000000_init.sql); only the customer-facing title and body text change.

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
              'We received your story',
              case when v_pay_link
                then 'Order ' || new.order_number || ': once we confirm your payment, our editorial team will review your story. If approved, it goes live within '
                  || coalesce(new.package_snapshot ->> 'turnaround_hours', '24') || ' hours.'
                else 'Order ' || new.order_number || ': editorial review has started. If approved, your story goes live within '
                  || coalesce(new.package_snapshot ->> 'turnaround_hours', '24') || ' hours and we will send you every link.' end,
              v_link, '{in_app,push,email}');

      insert into public.notifications (user_id, type, title, body, data, channels)
      select p.id, 'staff_new_order', 'New order ' || new.order_number,
             'Deadline ' || to_char(new.deadline_at at time zone 'Asia/Kolkata', 'DD Mon HH24:MI') || ' IST',
             jsonb_build_object('order_id', new.id, 'deep_link', '/admin/orders/' || new.id), '{in_app}'
        from public.profiles p where p.role in ('editor', 'admin') and p.is_active;

    elsif new.status = 'changes_requested' then
      insert into public.notifications (user_id, type, title, body, data, channels)
      values (new.user_id, 'order_changes_requested', 'Your story needs a few changes before publication',
              coalesce(new.changes_requested_reason, 'Open your order to see what to change.'),
              v_link, '{in_app,push,email}');

    elsif new.status = 'rejected' then
      insert into public.notifications (user_id, type, title, body, data, channels)
      values (new.user_id, 'order_rejected', 'We can''t publish your story',
              coalesce(new.rejection_reason, 'Your story did not pass editorial review.')
                || case when v_free then ''
                        when v_pay_link then ' If you paid, we will refund you in full.'
                        else ' We have started a full refund.' end,
              v_link, '{in_app,push,email}');

    elsif new.status = 'refunded' then
      insert into public.notifications (user_id, type, title, body, data, channels)
      values (new.user_id, 'order_refunded', 'Your refund has been processed',
              'We have processed the refund for order ' || new.order_number || '. Banks can take 5–7 working days to show it.',
              v_link, '{in_app,push,email}');
    end if;
  end if;

  -- "Everything is posted, report ready" fires when the PDF is actually ready
  if new.report_status = 'ready' and old.report_status is distinct from 'ready' and new.status = 'published' then
    insert into public.notifications (user_id, type, title, body, data, channels)
    values (new.user_id, 'order_published',
            case when new.report_version > 1 then 'Your delivery report was updated' else 'Your story is live' end,
            'Open your report for ' || new.order_number || ' to view every published link.',
            v_link, '{in_app,push,email}');
  end if;

  return new;
end $$;

create or replace function public.svc_deadline_sweep()
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in
    select o.* from public.orders o
     where o.status in ('paid', 'in_progress')
       and o.deadline_warned_at is null
       and o.deadline_at < now() + make_interval(hours => private.setting_int('orders.deadline_warning_hours', 2))
     for update skip locked
  loop
    insert into public.notifications (user_id, type, title, body, data, channels)
    select p.id, 'staff_deadline_warning', 'Deadline soon: ' || r.order_number,
           'Due ' || to_char(r.deadline_at at time zone 'Asia/Kolkata', 'DD Mon HH24:MI') || ' IST',
           jsonb_build_object('order_id', r.id, 'deep_link', '/admin/orders/' || r.id), '{in_app,email}'
      from public.profiles p
     where p.is_active and (p.role = 'admin' or p.id = r.assigned_to);
    update public.orders set deadline_warned_at = now() where id = r.id;
  end loop;

  for r in
    select o.* from public.orders o
     where o.status in ('paid', 'in_progress')
       and o.delay_notified_at is null and o.deadline_at < now() and o.user_id is not null
     for update skip locked
  loop
    insert into public.notifications (user_id, type, title, body, data, channels)
    values (r.user_id, 'order_delayed', 'Your story is taking longer than expected',
            'Order ' || r.order_number || ' is past its expected time. Our team is working on it and we will update you as soon as it is live.',
            jsonb_build_object('order_id', r.id, 'deep_link', '/orders/' || r.id), '{in_app,push,email}');
    update public.orders set delay_notified_at = now(), needs_attention = true,
           attention_reason = coalesce(attention_reason, 'deadline_missed') where id = r.id;
  end loop;
end $$;
