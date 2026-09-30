\set ON_ERROR_STOP 1
\set QUIET 1
-- Tests for 20260928000000_jobs_and_webhooks.sql. Runs after 01_ (reuses the t harness).
-- Plain Postgres has no Vault / pg_net: every outbound call must be a silent no-op.

select t.ok(private.secret('project_url') is null, 'no vault: secret() returns null');
select t.ok(private.call_edge_function('send-notifications') = false, 'no pg_net: edge call is a no-op');
select t.ok(private.call_site_cron('/api/cron/cleanup') = false, 'no pg_net: cron call is a no-op');

insert into public.notifications (user_id, type, title, body, channels)
values ('22222222-2222-2222-2222-222222222222', 'test_push', 'Hi', 'Body', '{in_app,push,email}');
select t.ok(exists (select 1 from public.notifications where type = 'test_push'),
            'notification insert succeeds when the webhook cannot be delivered');

\set B '''22222222-2222-2222-2222-222222222222'''
select t.claims(:B, 'authenticated'); set role authenticated;
select t.err($$select private.call_edge_function('send-notifications')$$, 'permission denied', 'users cannot call edge functions via the DB');
select t.err($$select private.secret('service_role_key')$$, 'permission denied', 'users cannot read vault secrets');
reset role;

insert into public.fact_checks (input_type, input_text, input_hash, device_id)
values ('text', 'some claim', 'hash-02', 'dev-02');
select t.ok(exists (select 1 from public.fact_checks where input_hash = 'hash-02'),
            'fact check insert succeeds when the worker cannot be invoked');

\set QUIET 0
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from t.results;
select n, name, detail from t.results where not ok order by n;
