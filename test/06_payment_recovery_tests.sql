\set ON_ERROR_STOP 1
\set QUIET 1
select t.claims(null,null); reset role;

select t.ok(not has_function_privilege('authenticated','public.svc_claim_webhook()','execute'), 'webhook jobs are backend-only');
select t.ok(not has_table_privilege('authenticated','public.refund_requests','select'), 'customer cannot read refund recovery records');
select t.ok(not has_function_privilege('anon','public.svc_lock_checkout(uuid,uuid,uuid)','execute'), 'checkout locking is backend-only');

-- Isolated fixtures: do not depend on statuses left by earlier behaviour tests.
insert into auth.users(id,email,raw_user_meta_data) values
  ('60000000-0000-4000-8000-000000000001','recovery@test.in','{"full_name":"Recovery User"}');
update public.profiles set phone = '+919876543210' where id = '60000000-0000-4000-8000-000000000001';
insert into public.orders(id,user_id,package_id,headline,body,declaration_accepted_at)
values ('60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001',
 (select id from public.packages where code='starter'), 'Recovery test headline', repeat('body ',100), now());
insert into public.order_images(order_id,storage_path,mime_type,size_bytes,position)
values('60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001/60000000-0000-4000-8000-000000000002/test.jpg','image/jpeg',1000,1);

select t.claims(null,'service_role'); set role service_role;
select t.ok(public.svc_lock_checkout('60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000003'), 'first checkout obtains lease');
select t.ok(not public.svc_lock_checkout('60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000004'), 'concurrent checkout cannot obtain same lease');
select public.svc_unlock_checkout('60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000004');
select t.ok(not public.svc_lock_checkout('60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000004'), 'stale owner cannot release another checkout');
select public.svc_unlock_checkout('60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000003');
select t.ok(public.svc_lock_checkout('60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000004'), 'released checkout lease can be reacquired');
select t.err($$select public.svc_create_checkout_intent('60000000-0000-4000-8000-000000000002','order_stale',49900,'INR','{}',true,'60000000-0000-4000-8000-000000000003')$$,
 'order_locked','timed-out checkout cannot attach an intent after losing its lease');

select public.svc_create_checkout_intent('60000000-0000-4000-8000-000000000002','order_recovery',49900,'INR',
 (select to_jsonb(p) from public.packages p where code='starter'),true,'60000000-0000-4000-8000-000000000004');
select public.svc_apply_payment('order_recovery','pay_recovery','captured',49900,'INR');
select public.svc_reserve_refund('60000000-0000-4000-8000-000000000005',
 (select id from public.payments where razorpay_payment_id='pay_recovery'),
 '60000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',10000,'Partial recovery refund');
select public.svc_reserve_refund('60000000-0000-4000-8000-000000000005',
 (select id from public.payments where razorpay_payment_id='pay_recovery'),
 '60000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',10000,'Partial recovery refund');
select t.ok((select count(*) from public.refund_requests where payment_id=(select id from public.payments where razorpay_payment_id='pay_recovery'))=1, 'same refund request identity is reserved once');
select t.err($$select public.svc_reserve_refund('60000000-0000-4000-8000-000000000006',
 (select id from public.payments where razorpay_payment_id='pay_recovery'),
 '60000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',49900,'Overlapping full refund')$$,
 'validation_failed','in-flight refunds reduce refundable balance');

-- Claim/lease fencing: only the current worker may finish an event.
select t.ok(public.svc_record_webhook('evt_recovery','payment.captured','{}'), 'webhook stored durably');
select t.ok(not public.svc_record_webhook('evt_recovery','payment.captured','{}'), 'duplicate event deduplicated');
select (public.svc_claim_webhook()).lock_token as job_token \gset
select public.svc_complete_webhook('evt_recovery','60000000-0000-4000-8000-000000000007',null);
select t.ok((select processed_at is null from public.webhook_events where event_id='evt_recovery'), 'stale worker cannot complete event');
-- Another fixture from previous tests may be claimed first: isolate our event below as owner.
reset role; select t.claims(null,null);
update public.webhook_events set locked_at=now(),lock_token='60000000-0000-4000-8000-000000000008' where event_id='evt_recovery';
select t.claims(null,'service_role'); set role service_role;
select public.svc_complete_webhook('evt_recovery','60000000-0000-4000-8000-000000000008','network_error');
select t.ok((select processed_at is null and error='network_error' and next_attempt_at>now() from public.webhook_events where event_id='evt_recovery'), 'failed webhook remains retryable with backoff');
reset role; select t.claims(null,null);

select t.claims('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','authenticated'); set role authenticated;
select public.admin_reject_and_reserve_refund('60000000-0000-4000-8000-000000000002','Content cannot be published');
reset role; select t.claims(null,null);
select t.ok((select status='rejected' from public.orders where id='60000000-0000-4000-8000-000000000002'), 'admin rejection commits');
select t.ok((select amount_minor=39900 from public.refund_requests where id='60000000-0000-4000-8000-000000000002'), 'rejection records remaining refund atomically');
\set QUIET 0
