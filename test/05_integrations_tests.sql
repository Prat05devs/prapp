\set ON_ERROR_STOP 1
\set QUIET 1
select t.claims(null, null);
reset role;
select t.ok((select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'integration_credentials'), 'credential storage has RLS');
select t.ok(not has_table_privilege('authenticated', 'public.integration_credentials', 'select'), 'even signed-in admins cannot directly read encrypted credentials');
select t.ok(not has_table_privilege('anon', 'public.integration_active', 'select'), 'guest cannot inspect integration configuration');
select t.ok(not has_function_privilege('authenticated', 'public.svc_save_integration(uuid,text,text,text,text,jsonb,text,text)', 'execute'), 'credential mutation RPC is backend-only');

select t.claims(null, 'service_role');
set role service_role;
select t.err($$select public.svc_save_integration('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee','razorpay','Editor attempt','test','','{}','ciphertext','hint')$$,
  'not_authorized', 'editor cannot save credentials through backend RPC');
select t.err($$select public.svc_save_integration('22222222-2222-2222-2222-222222222222','razorpay','User attempt','test','','{}','ciphertext','hint')$$,
  'not_authorized', 'customer cannot save credentials through backend RPC');
select public.svc_save_integration('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','razorpay','Test key','test','','{}','encrypted-test-placeholder','test') as test_key \gset
select public.svc_save_integration('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','razorpay','Live key','live','','{}','encrypted-live-placeholder','live') as live_key \gset
select t.ok(not exists(select 1 from public.integration_active where provider = 'razorpay'), 'saving credentials does not activate payments');
select public.svc_activate_integration('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', :'test_key');
select t.ok((select credential_id = :'test_key'::uuid from public.integration_active where provider = 'razorpay'), 'admin activates test mode');
select public.svc_activate_integration('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', :'live_key');
select t.ok((select credential_id = :'live_key'::uuid from public.integration_active where provider = 'razorpay'), 'admin switches to live mode');
select t.ok(exists(select 1 from public.integration_credentials where id = :'test_key'), 'switching preserves old credentials for payment settlement');
select t.ok((select count(*) from public.integration_audit where provider = 'razorpay') = 4, 'save and switch actions are audited');
reset role;
select t.claims(null, null);
\set QUIET 0
