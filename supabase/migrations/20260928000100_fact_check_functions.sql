-- =============================================================================
-- Fact-check worker helpers (LLD §11). Backend only (service role).
-- =============================================================================

-- AI provider daily quota: atomic check-and-increment on provider_usage (LLD §11.3).
-- DECISION: provider days follow US Pacific time, when Gemini's free quota resets
-- (LLD §14 schedules the re-run cron for 13:15 IST, just after that reset).
create or replace function public.svc_use_provider(p_provider text, p_model text, p_default_quota int default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_day date := (now() at time zone 'America/Los_Angeles')::date;
  v_ok boolean;
begin
  insert into public.provider_usage as u (provider, model, day, calls, daily_quota)
  values (p_provider, p_model, v_day, 1, p_default_quota)
  on conflict (provider, model, day) do update
    set calls = u.calls + 1
    where u.daily_quota is null or u.calls < u.daily_quota
  returning true into v_ok;
  return coalesce(v_ok, false);
end $$;

-- calls / daily_quota for today; 0 when there is no quota row yet
create or replace function public.svc_provider_usage_ratio(p_provider text, p_model text)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case when daily_quota is null or daily_quota = 0 then 0 else calls::numeric / daily_quota end
      from public.provider_usage
     where provider = p_provider and model = p_model
       and day = (now() at time zone 'America/Los_Angeles')::date), 0)
$$;

-- Gives a check back when it could not run through no fault of the user (no text in image).
create or replace function public.svc_refund_quota(p_scope text, p_key text)
returns void language sql security definer set search_path = '' as $$
  update public.usage_counters set count = count - 1
   where scope = p_scope and key = p_key
     and day = (now() at time zone 'Asia/Kolkata')::date and count > 0
$$;

-- Writes a finished job in one transaction. Re-runs (reduced → full) replace the previous
-- claims and tool runs of the same report and invalidate the cached share image / PDF.
create or replace function public.svc_complete_fact_check(p_id uuid, p_result jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c jsonb;
  s jsonb;
  t jsonb;
  v_claim uuid;
begin
  perform 1 from public.fact_checks where id = p_id for update;
  if not found then raise exception 'fact_check_not_found' using errcode = 'P0001'; end if;

  delete from public.fact_check_claims where fact_check_id = p_id;
  delete from public.fact_check_tool_runs where fact_check_id = p_id;

  for c in select * from jsonb_array_elements(coalesce(p_result -> 'claims', '[]'))
  loop
    insert into public.fact_check_claims (fact_check_id, position, claim_text, verdict, explanation, is_government_related)
    values (p_id, (c ->> 'position')::smallint, c ->> 'claim_text', (c ->> 'verdict')::public.fc_verdict,
            c ->> 'explanation', coalesce((c ->> 'is_government_related')::boolean, false))
    returning id into v_claim;
    for s in select * from jsonb_array_elements(coalesce(c -> 'sources', '[]'))
    loop
      insert into public.fact_check_sources (claim_id, url, domain, title, publisher, tier, stance,
                                             is_existing_fact_check, rating, published_at)
      values (v_claim, s ->> 'url', s ->> 'domain', s ->> 'title', s ->> 'publisher',
              coalesce((s ->> 'tier')::public.source_tier, 'unknown'), s ->> 'stance',
              coalesce((s ->> 'is_existing_fact_check')::boolean, false), s ->> 'rating',
              case when s ->> 'published_at' ~ '^\d{4}-\d{2}-\d{2}' then (s ->> 'published_at')::timestamptz end);
    end loop;
  end loop;

  for t in select * from jsonb_array_elements(coalesce(p_result -> 'tool_runs', '[]'))
  loop
    insert into public.fact_check_tool_runs (fact_check_id, tool, model, status, started_at, finished_at, summary)
    values (p_id, t ->> 'tool', t ->> 'model', t ->> 'status',
            coalesce((t ->> 'started_at')::timestamptz, now()), (t ->> 'finished_at')::timestamptz, t ->> 'summary');
  end loop;

  update public.fact_checks set
    status                = 'done',
    verdict               = (p_result ->> 'verdict')::public.fc_verdict,
    confidence            = p_result ->> 'confidence',
    summary               = p_result ->> 'summary',
    language              = p_result ->> 'language',
    mode                  = (p_result ->> 'mode')::public.fc_mode,
    full_check_status     = p_result ->> 'full_check_status',
    input_domain          = p_result ->> 'input_domain',
    input_domain_tier     = (p_result ->> 'input_domain_tier')::public.source_tier,
    input_domain_age_days = (p_result ->> 'input_domain_age_days')::int,
    share_image_path      = null,
    pdf_path              = null,
    error                 = null,
    locked_at             = null,
    completed_at          = now()
  where id = p_id;
end $$;

-- Failure: retry (back to queued) while attempts remain, otherwise failed with a code.
create or replace function public.svc_fail_fact_check(p_id uuid, p_error text, p_retry boolean default true)
returns text language plpgsql security definer set search_path = '' as $$
declare v public.fact_checks;
begin
  update public.fact_checks set
    status    = case when p_retry and attempts < 3 then 'queued'::public.fc_status else 'failed'::public.fc_status end,
    error     = left(p_error, 500),
    locked_at = null
  where id = p_id
  returning * into v;
  return v.status::text;
end $$;

revoke execute on function
  public.svc_use_provider(text, text, int),
  public.svc_provider_usage_ratio(text, text),
  public.svc_refund_quota(text, text),
  public.svc_complete_fact_check(uuid, jsonb),
  public.svc_fail_fact_check(uuid, text, boolean)
  from public, anon, authenticated;
grant execute on function
  public.svc_use_provider(text, text, int),
  public.svc_provider_usage_ratio(text, text),
  public.svc_refund_quota(text, text),
  public.svc_complete_fact_check(uuid, jsonb),
  public.svc_fail_fact_check(uuid, text, boolean)
  to service_role;
