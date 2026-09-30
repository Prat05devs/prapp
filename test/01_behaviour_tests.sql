\set ON_ERROR_STOP 1
\set QUIET 1
-- ---------------------------------------------------------------- harness
create schema t;
grant usage on schema t to anon, authenticated, service_role;
create table t.results (n serial, ok boolean, name text, detail text);
grant all on t.results to anon, authenticated, service_role;
grant usage on sequence t.results_n_seq to anon, authenticated, service_role;

create function t.claims(p_sub uuid, p_role text) returns void language sql as $$
  select set_config('request.jwt.claims',
    case when p_role is null then '' else
      jsonb_build_object('sub', p_sub, 'role', p_role)::text end, false);
$$;
create function t.ok(p_cond boolean, p_name text, p_detail text default null) returns void language sql as $$
  insert into t.results (ok, name, detail) values (coalesce(p_cond, false), p_name, p_detail);
$$;
-- run SQL as the CURRENT role and expect an error matching a pattern
create function t.err(p_sql text, p_pattern text, p_name text) returns void language plpgsql as $$
begin
  execute p_sql;
  perform t.ok(false, p_name, 'expected error ~ ' || p_pattern || ' but succeeded');
exception when others then
  perform t.ok(sqlerrm ~* p_pattern, p_name, sqlerrm);
end $$;
-- run SQL and expect a number of affected rows
create function t.rows(p_sql text, p_expected int, p_name text) returns void language plpgsql as $$
declare v int;
begin
  execute p_sql; get diagnostics v = row_count;
  perform t.ok(v = p_expected, p_name, 'rows=' || v);
exception when others then
  perform t.ok(false, p_name, 'error: ' || sqlerrm);
end $$;
create function t.val(p_sql text) returns text language plpgsql as $$
declare v text;
begin execute p_sql into v; return v; end $$;
grant execute on all functions in schema t to anon, authenticated, service_role;

\set A  '''11111111-1111-1111-1111-111111111111'''
\set B  '''22222222-2222-2222-2222-222222222222'''
\set C  '''33333333-3333-3333-3333-333333333333'''
\set E  '''eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'''
\set E2 '''eeeeeeee-eeee-eeee-eeee-000000000002'''
\set M  '''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'''
\set O1 '''0000000a-0000-0000-0000-000000000001'''
\set O2 '''0000000a-0000-0000-0000-000000000002'''
\set O3 '''0000000a-0000-0000-0000-000000000003'''

-- test-only: let us rename order ids to fixed values
alter table public.order_events drop constraint order_events_order_id_fkey,
  add constraint order_events_order_id_fkey foreign key (order_id) references public.orders (id)
  on delete cascade on update cascade;
-- ---------------------------------------------------------------- seed (system)
insert into auth.users (id, email, raw_user_meta_data) values
  (:A,  'a@x.in',  '{"full_name":"Asha Rawat"}'),
  (:B,  'b@x.in',  '{"name":"Bhavesh"}'),
  (:C,  'c@x.in',  '{}'),
  (:E,  'e@x.in',  '{"full_name":"Editor One"}'),
  (:E2, 'e2@x.in', '{"full_name":"Editor Two"}'),
  (:M,  'm@x.in',  '{"full_name":"Admin"}');
select t.ok((select count(*) from public.profiles) = 6, 'signup trigger creates profiles');
select t.ok((select full_name from public.profiles where id = :B) = 'Bhavesh', 'name picked from Google metadata');
update public.profiles set role = 'editor' where id in (:E, :E2);
update public.profiles set role = 'admin'  where id = :M;
update public.profiles set phone = '+919876543210' where id in (:A, :B, :E, :E2, :M);

insert into public.portals (id, name, domain, homepage_url, sort_order) values
  ('b0000000-0000-0000-0000-000000000001', 'Doon Times',   'doontimes.in',   'https://doontimes.in', 1),
  ('b0000000-0000-0000-0000-000000000002', 'Pahad News',   'pahadnews.com',  'https://pahadnews.com', 2),
  ('b0000000-0000-0000-0000-000000000003', 'Garhwal Post', 'garhwalpost.in', 'https://garhwalpost.in', 3);
insert into public.packages (id, code, name, price_inr_paise, portal_count, includes_instagram) values
  ('c0000000-0000-0000-0000-000000000001', 'starter', 'Starter', 49900, 2, true),
  ('c0000000-0000-0000-0000-000000000002', 'plus',    'Plus',    99900, 3, true);
insert into public.package_portals values
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001');

-- ================================================================ anon
set role anon; select t.claims(null, 'anon');
select t.ok((select count(*) from public.packages) = 2, 'anon reads packages');
select t.ok((select count(*) from public.portals) = 3, 'anon reads public portal list');
select t.ok((select count(*) from public.app_settings) >= 4, 'anon reads public settings (support contacts)');
select t.err('select * from public.orders', 'permission denied', 'anon cannot read orders');
select t.err('select * from public.profiles', 'permission denied', 'anon cannot read profiles');
reset role;

-- ================================================================ customer A
select t.claims(:A, 'authenticated'); set role authenticated;
select t.rows($$update public.profiles set full_name = 'Asha R' where id = '11111111-1111-1111-1111-111111111111'$$, 1, 'user updates own name');
select t.err($$update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111'$$, 'permission denied', 'user cannot make themselves admin');
select t.rows($$update public.profiles set full_name = 'hacked' where id = '22222222-2222-2222-2222-222222222222'$$, 0, 'user cannot edit another profile');
select t.err($$update public.profiles set phone = '98765' where id = '11111111-1111-1111-1111-111111111111'$$, 'check constraint', 'phone must be E.164');

insert into public.orders (package_id, headline, body, instagram_handle, feature_consent, declaration_accepted_at)
values ('c0000000-0000-0000-0000-000000000001', 'Dehradun startup launches new app',
        repeat('Story body text. ', 30), 'asha.rawat', true, '2000-01-01');
reset role;
update public.orders set id = :O1;   -- fixed id for the rest of the tests (system)
select t.ok((select declaration_accepted_at > now() - interval '1 minute' from public.orders where id = :O1), 'declaration timestamp set by server, not client');
select t.ok((select order_number ~ '^PR-\d{6}-\d{5}$' from public.orders where id = :O1), 'human order number generated');
select t.claims(:A, 'authenticated'); set role authenticated;

select t.err($$insert into public.orders (package_id, headline, body, status) values ('c0000000-0000-0000-0000-000000000001', 'Headline long enough', repeat('x', 400), 'paid')$$,
             'permission denied', 'user cannot insert with status');
select t.err($$update public.orders set status = 'paid'$$, 'permission denied', 'user cannot change status directly');
select t.err($$update public.orders set amount_minor = 1$$, 'permission denied', 'user cannot change amount');
select t.err($$insert into public.orders (package_id, headline, body) values ('c0000000-0000-0000-0000-000000000001', 'short', repeat('x', 400))$$,
             'check constraint', 'headline length enforced');

-- images: storage + table
select t.rows($$insert into storage.objects (bucket_id, name) values ('order-images', '11111111-1111-1111-1111-111111111111/0000000a-0000-0000-0000-000000000001/a.jpg')$$, 1, 'upload image to own order folder');
select t.err($$insert into storage.objects (bucket_id, name) values ('order-images', '22222222-2222-2222-2222-222222222222/0000000a-0000-0000-0000-000000000001/x.jpg')$$, 'row-level security', 'cannot upload into another user folder');
select t.rows($$insert into public.order_images (order_id, storage_path, mime_type, size_bytes, position) values ('0000000a-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111/0000000a-0000-0000-0000-000000000001/a.jpg', 'image/jpeg', 200000, 1)$$, 1, 'register image 1');
select t.err($$insert into public.order_images (order_id, storage_path, mime_type, size_bytes, position) values ('0000000a-0000-0000-0000-000000000001', 'someone/else/b.jpg', 'image/jpeg', 200000, 2)$$, 'invalid_storage_path', 'image path must match user/order');
select t.rows($$insert into public.order_images (order_id, storage_path, mime_type, size_bytes, position) values ('0000000a-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111/0000000a-0000-0000-0000-000000000001/b.jpg', 'image/png', 300000, 2)$$, 1, 'register image 2');
select t.err($$insert into public.order_images (order_id, storage_path, mime_type, size_bytes, position) values ('0000000a-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111/0000000a-0000-0000-0000-000000000001/c.jpg', 'image/png', 300000, 1)$$, 'too_many_images|duplicate key', 'max 2 images');
select t.err($$insert into public.order_images (order_id, storage_path, mime_type, size_bytes, position) values ('0000000a-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111/0000000a-0000-0000-0000-000000000001/v.mp4', 'video/mp4', 300, 1)$$, 'check constraint|too_many', 'only jpg/png/webp');

select t.err($$select public.svc_create_payment_intent('0000000a-0000-0000-0000-000000000001', 'order_fake', 1, 'INR', '{}', false)$$, 'permission denied', 'user cannot call backend payment functions');
select t.err($$select public.svc_apply_payment('x','y','captured',49900,'INR')$$, 'permission denied', 'user cannot mark payment captured');
select t.err($$select public.staff_claim_order('0000000a-0000-0000-0000-000000000001')$$, 'not_authorized', 'user cannot use staff RPCs');
reset role;

-- customer B and C
select t.claims(:B, 'authenticated'); set role authenticated;
select t.ok((select count(*) from public.orders) = 0, 'user B cannot see user A orders');
select t.ok((select count(*) from public.order_images) = 0, 'user B cannot see user A images');
select t.ok((select count(*) from storage.objects) = 0, 'user B cannot see user A files');
reset role;
select t.claims(:C, 'authenticated'); set role authenticated;
select t.err($$insert into public.orders (package_id, headline, body) values ('c0000000-0000-0000-0000-000000000001', 'Headline long enough', repeat('x', 400))$$,
             'profile_incomplete', 'no phone number = cannot order');
reset role;

-- editor cannot see drafts
select t.claims(:E, 'authenticated'); set role authenticated;
select t.ok((select count(*) from public.orders) = 0, 'editor does not see draft orders');
reset role;

-- ================================================================ checkout + payment (service role)
select t.claims(null, 'service_role'); set role service_role;
select public.svc_create_payment_intent(:O1, 'order_RZP1', 49900, 'INR',
  (select to_jsonb(p) from public.packages p where code = 'starter'), false);
select t.ok((select status::text from public.orders where id = :O1) = 'pending_payment', 'checkout -> pending_payment');
select t.ok((select customer_phone from public.orders where id = :O1) = '+919876543210', 'customer contact snapshotted');
reset role;

select t.claims(:A, 'authenticated'); set role authenticated;
select t.rows($$update public.orders set headline = 'Changed while paying the bill' where id = '0000000a-0000-0000-0000-000000000001'$$, 0, 'content locked during payment');
select t.rows($$delete from public.order_images$$, 0, 'images locked during payment');
reset role;

select t.claims(null, 'service_role'); set role service_role;
select t.ok(public.svc_apply_payment('order_RZP1', 'pay_1', 'failed', 49900, 'INR', 'upi', 'BAD_REQUEST_ERROR', 'Payment failed') = 'failed', 'failed payment recorded, order still payable');
select t.ok((select status::text from public.orders where id = :O1) = 'pending_payment', 'failed payment keeps order pending');
select t.ok(public.svc_apply_payment('order_RZP1', 'pay_2', 'captured', 100, 'INR') = 'amount_mismatch', 'wrong amount is flagged, not accepted');
select t.ok((select needs_attention and status = 'pending_payment' from public.orders where id = :O1), 'mismatch -> admin attention, not paid');
update public.orders set needs_attention = false, attention_reason = null where id = :O1;
select t.ok(public.svc_apply_payment('order_RZP1', 'pay_3', 'captured', 49900, 'INR', 'upi') = 'paid', 'correct capture marks order paid');
select t.ok(public.svc_apply_payment('order_RZP1', 'pay_3', 'captured', 49900, 'INR', 'upi') = 'already_paid', 'webhook + callback twice = idempotent');
select t.ok(public.svc_apply_payment('order_RZP1', 'pay_3', 'authorized', 49900, 'INR', 'upi') = 'already_paid', 'out-of-order older event does not downgrade');
select t.ok((select status::text from public.payments where razorpay_payment_id = 'pay_3') = 'captured', 'payment status never moves backwards');
select t.ok(public.svc_apply_payment('order_RZP1', 'pay_1', 'captured', 49900, 'INR', 'upi') = 'duplicate', 'late success on earlier attempt = duplicate');
select t.ok((select attention_reason from public.orders where id = :O1) = 'duplicate_payment_refund_due', 'duplicate payment flagged for refund');
select t.ok((select deadline_at - paid_at from public.orders where id = :O1) = interval '24 hours', 'deadline = paid + 24h');
select t.ok((select count(*) from public.order_placements where order_id = :O1) = 3, 'placements created: 2 portals + Instagram');
select t.ok((select count(*) from public.notifications where user_id = :A and type = 'order_paid') = 1, 'customer notified once on payment');
select t.ok((select count(*) from public.notifications where type = 'staff_new_order') = 3, 'all staff notified of new order');
select t.ok(public.svc_apply_payment('order_UNKNOWN', 'pay_x', 'captured', 1, 'INR') = 'unknown_intent', 'unknown Razorpay order ignored safely');
select t.ok(public.svc_record_webhook('evt_1', 'payment.captured', '{}') = true,  'webhook first delivery processed');
select t.ok(public.svc_record_webhook('evt_1', 'payment.captured', '{}') = false, 'webhook duplicate delivery skipped');
reset role;

-- customer sees status but not links yet; cannot see raw payment payload
select t.claims(:A, 'authenticated'); set role authenticated;
select t.ok((select count(*) from public.order_placements) = 0, 'customer does not see links before publish');
select t.ok((select count(*) from public.payments where order_id = '0000000a-0000-0000-0000-000000000001') = 3, 'customer sees own payment attempts (safe columns)');
select t.err($$select raw from public.payments$$, 'permission denied', 'customer cannot read raw Razorpay payload');
reset role;

-- ================================================================ fulfilment (editors)
select t.claims(:E, 'authenticated'); set role authenticated;
select t.ok((select count(*) from public.orders) = 1, 'editor sees paid order in queue');
select t.ok((select count(*) from storage.objects where bucket_id = 'order-images') = 1, 'editor can access images for download');
select t.err($$select * from public.payments$$, 'permission denied|row', 'editor cannot see payment details');
select t.err($$update public.orders set status = 'published'$$, 'permission denied', 'editor cannot update orders directly');
select public.staff_claim_order(:O1);
select t.ok((select status::text || '/' || assigned_to::text from public.orders where id = :O1) = 'in_progress/' || :E, 'editor claims order');
reset role;

select t.claims(:E2, 'authenticated'); set role authenticated;
select t.err($$select public.staff_claim_order('0000000a-0000-0000-0000-000000000001')$$, 'order_not_claimable', 'second editor cannot claim same order');
select t.err(format($$select public.staff_set_placement_link(%L, 'https://doontimes.in/story')$$,
  (select id from public.order_placements where order_id = '0000000a-0000-0000-0000-000000000001' and portal_id = 'b0000000-0000-0000-0000-000000000001')),
  'assigned_to_someone_else', 'other editor cannot post on claimed order');
select t.err($$select public.admin_reject_order('0000000a-0000-0000-0000-000000000001', 'Not allowed content here')$$, 'not_authorized', 'editor cannot reject/refund');
reset role;

select t.claims(:E, 'authenticated'); set role authenticated;
select t.ok(public.staff_set_placement_link(
  (select id from public.order_placements where order_id = :O1 and portal_id = 'b0000000-0000-0000-0000-000000000001'),
  'https://www.doontimes.in/2026/09/story') = false, 'link accepted, domain matches (www ignored)');
select t.ok(public.staff_set_placement_link(
  (select id from public.order_placements where order_id = :O1 and channel = 'instagram'),
  'https://www.google.com/wrong') = true, 'wrong domain pasted -> warning flag');
select public.staff_set_placement_link(
  (select id from public.order_placements where order_id = :O1 and channel = 'instagram'),
  'https://www.instagram.com/p/abc123/');
select t.err(format($$select public.staff_set_placement_link(%L, 'doontimes.in/x')$$,
  (select id from public.order_placements where order_id = '0000000a-0000-0000-0000-000000000001' and portal_id = 'b0000000-0000-0000-0000-000000000002')),
  'invalid_url', 'link must be a full https URL');
select t.err($$select public.staff_mark_published('0000000a-0000-0000-0000-000000000001')$$, 'placements_pending', 'cannot publish with pending portals');
select public.staff_mark_placement_failed(
  (select id from public.order_placements where order_id = :O1 and portal_id = 'b0000000-0000-0000-0000-000000000002'), 'Portal down');
select t.err($$select public.staff_mark_published('0000000a-0000-0000-0000-000000000001')$$, 'placements_failed', 'cannot publish with failed portal');
select t.err($$select public.staff_mark_published('0000000a-0000-0000-0000-000000000001', true)$$, 'placements_failed', 'editor cannot force partial publish');
select public.staff_swap_placement(
  (select id from public.order_placements where order_id = :O1 and portal_id = 'b0000000-0000-0000-0000-000000000002'),
  'b0000000-0000-0000-0000-000000000003', 'Pahad News down, replaced');
select t.err(format($$select public.staff_swap_placement(%L, 'b0000000-0000-0000-0000-000000000001', 'dup')$$,
  (select id from public.order_placements where order_id = '0000000a-0000-0000-0000-000000000001' and portal_id = 'b0000000-0000-0000-0000-000000000003' and status = 'pending')),
  'placement_already_live|duplicate key', 'cannot swap to a portal already on the order');
select public.staff_set_placement_link(
  (select id from public.order_placements where order_id = :O1 and portal_id = 'b0000000-0000-0000-0000-000000000003' and status = 'pending'),
  'https://garhwalpost.in/news/1');
select public.staff_mark_published(:O1);
select t.ok((select status::text || '/' || report_status::text from public.orders where id = :O1) = 'published/generating', 'published, report generating');
reset role;

select t.claims(:A, 'authenticated'); set role authenticated;
select t.ok((select count(*) from public.notifications where type = 'order_published') = 0, 'no "live" notification until PDF is ready');
reset role;

select t.claims(null, 'service_role'); set role service_role;
select public.svc_set_report(:O1, 'ready', :A || '/' || :O1 || '/report-v1.pdf');
reset role;

select t.claims(:A, 'authenticated'); set role authenticated;
select t.ok((select count(*) from public.notifications where type = 'order_published') = 1, 'customer notified when report is ready');
select t.ok((select count(*) from public.order_placements) = 3, 'customer now sees the 3 live links (not the swapped one)');
select t.rows($$update public.notifications set read_at = now()$$, 2, 'customer marks notifications read');
select t.err($$update public.notifications set title = 'x'$$, 'permission denied', 'customer cannot edit notification text');
reset role;

-- refund the duplicate payment: order stays published, alert cleared
select t.claims(null, 'service_role'); set role service_role;
select t.ok(public.svc_apply_refund('pay_1', 'rfnd_1', 49900, 'pending', 'duplicate payment', :M) = 'pending', 'refund created (pending)');
select t.ok(public.svc_apply_refund('pay_1', 'rfnd_1', 49900, 'processed') = 'processed', 'refund.processed webhook applied');
select t.ok(public.svc_apply_refund('pay_1', 'rfnd_1', 49900, 'pending') = 'processed', 'late pending webhook does not undo processed');
select t.ok((select status::text || '/' || needs_attention::text from public.orders where id = :O1) = 'published/false', 'duplicate refunded, order unaffected, alert cleared');
reset role;

select t.err($$update public.orders set status = 'draft' where id = '0000000a-0000-0000-0000-000000000001'$$, 'illegal_transition', 'state machine blocks published -> draft even for backend');

-- ================================================================ changes requested + rejection + refund (order 2)
select t.claims(:A, 'authenticated'); set role authenticated;
insert into public.orders (package_id, headline, body, declaration_accepted_at)
values ('c0000000-0000-0000-0000-000000000001', 'Second story about an event', repeat('Event details. ', 30), now());
reset role;
update public.orders set id = :O2 where id <> :O1 and id <> :O3 and user_id = :A and status = 'draft';
insert into public.order_images (order_id, storage_path, mime_type, size_bytes)
values (:O2, :A || '/' || :O2 || '/1.jpg', 'image/jpeg', 1000);
select t.claims(null, 'service_role'); set role service_role;
select public.svc_create_payment_intent(:O2, 'order_RZP2', 49900, 'INR', (select to_jsonb(p) from public.packages p where code = 'starter'), false);
select public.svc_apply_payment('order_RZP2', 'pay_20', 'captured', 49900, 'INR');
reset role;

select t.claims(:E, 'authenticated'); set role authenticated;
select t.err($$select public.staff_request_changes('0000000a-0000-0000-0000-000000000002', 'bad')$$, 'reason_required', 'change request needs a real reason');
select public.staff_request_changes(:O2, 'Image is blurry, please upload a clearer photo');
reset role;

select t.claims(:A, 'authenticated'); set role authenticated;
select t.ok((select count(*) from public.notifications where type = 'order_changes_requested') = 1, 'customer told what to change');
select t.rows($$update public.orders set headline = 'Second story, corrected headline' where id = '0000000a-0000-0000-0000-000000000002'$$, 1, 'customer can edit when changes requested');
select t.err($$update public.orders set package_id = 'c0000000-0000-0000-0000-000000000002' where id = '0000000a-0000-0000-0000-000000000002'$$, 'package_locked', 'cannot switch package after paying');
select public.user_resubmit_order(:O2);
select t.ok((select status::text from public.orders where id = :O2) = 'paid', 'resubmit puts order back in queue');
select t.ok((select deadline_at > now() + interval '23 hours' from public.orders where id = :O2), 'fresh 24h deadline after resubmit');
reset role;

select t.claims(:M, 'authenticated'); set role authenticated;
select t.ok((select count(*) from public.payments) >= 3, 'admin sees payments');
select public.admin_reject_order(:O2, 'Content makes unverifiable claims about a person');
reset role;
select t.claims(null, 'service_role'); set role service_role;
select public.svc_apply_refund('pay_20', 'rfnd_20', 49900, 'processed', 'rejected', :M);
reset role;
select t.ok((select status::text from public.orders where id = :O2) = 'refunded', 'full refund on rejected order -> refunded');
select t.ok((select count(*) from public.notifications where user_id = :A and type in ('order_rejected','order_refunded')) = 2, 'customer told about rejection and refund');
select t.ok((select count(*) from public.order_events where order_id = :O2 and event = 'status_changed') >= 5, 'audit trail recorded every step');

-- ================================================================ late payment on expired order (order 3)
insert into public.orders (id, user_id, package_id, headline, body, declaration_accepted_at)
values (:O3, :B, 'c0000000-0000-0000-0000-000000000001', 'Third story for late pay', repeat('Late pay. ', 40), now());
insert into public.order_images (order_id, storage_path, mime_type, size_bytes) values (:O3, :B || '/' || :O3 || '/1.jpg', 'image/jpeg', 1000);
select t.claims(null, 'service_role'); set role service_role;
select public.svc_create_payment_intent(:O3, 'order_RZP3', 49900, 'INR', (select to_jsonb(p) from public.packages p where code = 'starter'), false);
reset role;
update public.orders set checkout_started_at = now() - interval '2 days' where id = :O3;
select t.claims(null, 'service_role'); set role service_role;
select t.ok(public.svc_expire_pending_orders() = 1, 'stale checkout expires');
select t.ok(public.svc_apply_payment('order_RZP3', 'pay_30', 'captured', 49900, 'INR') = 'paid', 'late UPI success on expired order is honoured');
reset role;

-- deadline missed
update public.orders set deadline_at = now() - interval '1 minute' where id = :O3;
select public.svc_deadline_sweep();
select t.ok((select count(*) from public.notifications where user_id = :B and type = 'order_delayed') = 1, 'customer told about delay');
select public.svc_deadline_sweep();
select t.ok((select count(*) from public.notifications where user_id = :B and type = 'order_delayed') = 1, 'delay message sent only once');

-- ================================================================ admin + misc
select t.claims(:M, 'authenticated'); set role authenticated;
select t.err(format($$select public.admin_set_role(%L, 'user')$$, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'last_admin', 'cannot remove the only admin');
select public.admin_set_role(:B, 'editor');
select public.admin_set_role(:B, 'user');
select t.rows($$update public.portals set is_active = false where domain = 'garhwalpost.in'$$, 1, 'admin edits portals');
reset role;
select t.claims(:E, 'authenticated'); set role authenticated;
select t.rows($$update public.portals set is_active = true$$, 0, 'editor cannot edit portals');
select t.rows($$insert into public.showcase_stories (title, portal_name, url) values ('Story', 'Doon Times', 'https://doontimes.in/a')$$, 1, 'editor adds weekly showcase story');
reset role;

select t.claims(:A, 'authenticated'); set role authenticated;
select public.register_device_token('ExponentPushToken[abc]', 'android');
reset role;
select t.claims(:B, 'authenticated'); set role authenticated;
select public.register_device_token('ExponentPushToken[abc]', 'android');
reset role;
select t.ok((select user_id from public.device_tokens where expo_push_token = 'ExponentPushToken[abc]') = :B, 'shared phone: push token moves to current user');

select t.claims(null, 'service_role'); set role service_role;
select t.ok(public.svc_consume_quota('guest_device', 'd1', 2) and public.svc_consume_quota('guest_device', 'd1', 2)
            and not public.svc_consume_quota('guest_device', 'd1', 2), 'guest fact-check limit enforced atomically');
select t.ok(public.svc_can_delete_user(:B) = false, 'account deletion blocked while order is active');
select t.ok(public.svc_can_delete_user(:A) = true,  'account deletion allowed when orders are done');
reset role;

-- account deletion keeps the business record
delete from auth.users where id = :A;
select t.ok((select user_id is null and customer_email = 'a@x.in' from public.orders where id = :O1), 'deleted user: order kept with contact snapshot');

-- ---------------------------------------------------------------- report
\set QUIET 0
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from t.results;
select n, name, detail from t.results where not ok order by n;
