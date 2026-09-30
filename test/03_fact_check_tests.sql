\set ON_ERROR_STOP 1
\set QUIET 1
-- Tests for 20260928000100_fact_check_functions.sql. Runs after 01_/02_ (reuses the t harness).

-- provider quota: atomic, stops at the daily quota
select t.claims(null, 'service_role'); set role service_role;
select t.ok(public.svc_use_provider('gemini', 'm1', 2) and public.svc_use_provider('gemini', 'm1', 2)
            and not public.svc_use_provider('gemini', 'm1', 2), 'provider quota enforced atomically');
select t.ok(public.svc_provider_usage_ratio('gemini', 'm1') = 1, 'usage ratio at quota is 1');
select t.ok(public.svc_use_provider('groq', 'm2') and public.svc_use_provider('groq', 'm2'), 'null quota = unlimited');

-- quota refund
select public.svc_consume_quota('guest_device', 'd-refund', 3);
select public.svc_refund_quota('guest_device', 'd-refund');
select t.ok((select count from public.usage_counters where scope = 'guest_device' and key = 'd-refund') = 0,
            'no_text_in_image gives the check back');
reset role;

insert into public.fact_checks (id, input_type, input_text, input_hash, device_id, status, attempts)
values ('fc000000-0000-0000-0000-000000000001', 'text', 'claim', 'h-03', 'dev-03', 'processing', 1);

select t.claims(null, 'service_role'); set role service_role;
select public.svc_complete_fact_check('fc000000-0000-0000-0000-000000000001', $j${
  "verdict": "likely_false", "confidence": "high", "summary": "Not true.", "language": "en",
  "mode": "full", "full_check_status": "not_needed", "input_domain": null, "input_domain_tier": null,
  "input_domain_age_days": null,
  "claims": [{"position": 1, "claim_text": "claim", "verdict": "likely_false", "explanation": "x",
              "is_government_related": true,
              "sources": [{"url": "https://pib.gov.in/a", "domain": "pib.gov.in", "tier": "tier1",
                           "stance": "refutes", "is_existing_fact_check": false, "published_at": "not a date"}]}],
  "tool_runs": [{"tool": "gdelt", "status": "ok", "model": null, "summary": "3 articles",
                 "started_at": "2026-09-28T00:00:00Z", "finished_at": "2026-09-28T00:00:01Z"}]
}$j$);
reset role;
select t.ok((select status = 'done' and verdict = 'likely_false' and completed_at is not null
               from public.fact_checks where id = 'fc000000-0000-0000-0000-000000000001'), 'complete writes the verdict');
select t.ok((select count(*) = 1 from public.fact_check_sources s join public.fact_check_claims c on c.id = s.claim_id
              where c.fact_check_id = 'fc000000-0000-0000-0000-000000000001'), 'complete writes claims + sources');
select t.ok((select count(*) = 1 from public.fact_check_tool_runs where fact_check_id = 'fc000000-0000-0000-0000-000000000001'),
            'complete writes tool runs');

-- re-run replaces, never duplicates
select t.claims(null, 'service_role'); set role service_role;
select public.svc_complete_fact_check('fc000000-0000-0000-0000-000000000001',
  '{"verdict":"unverified","confidence":"low","summary":"s","mode":"full","full_check_status":"done","claims":[],"tool_runs":[]}');
reset role;
select t.ok((select count(*) = 0 from public.fact_check_claims where fact_check_id = 'fc000000-0000-0000-0000-000000000001'),
            're-run replaces previous claims');

-- failures: retry until 3 attempts, then failed
select t.claims(null, 'service_role'); set role service_role;
select t.ok(public.svc_fail_fact_check('fc000000-0000-0000-0000-000000000001', 'boom') = 'queued', 'failure is retried');
reset role;
update public.fact_checks set attempts = 3 where id = 'fc000000-0000-0000-0000-000000000001';
select t.claims(null, 'service_role'); set role service_role;
select t.ok(public.svc_fail_fact_check('fc000000-0000-0000-0000-000000000001', 'boom') = 'failed', 'gives up after 3 attempts');
select t.ok(public.svc_fail_fact_check('fc000000-0000-0000-0000-000000000001', 'no_text_in_image', false) = 'failed',
            'input errors fail immediately');
reset role;

-- customers cannot call worker functions
\set B '''22222222-2222-2222-2222-222222222222'''
select t.claims(:B, 'authenticated'); set role authenticated;
select t.err($$select public.svc_use_provider('gemini', 'm1', 100)$$, 'permission denied', 'users cannot spend AI quota directly');
select t.err($$select public.svc_complete_fact_check('fc000000-0000-0000-0000-000000000001', '{}')$$, 'permission denied', 'users cannot write fact-check results');
reset role;

\set QUIET 0
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from t.results;
select n, name, detail from t.results where not ok order by n;
