-- Use Supabase's current secret API keys for database-to-Edge-Function calls.
-- API keys belong in the `apikey` header; Authorization is reserved for user JWTs.

create or replace function private.http_post_apikey(p_url text, p_api_key text, p_body jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_url is null or p_api_key is null or to_regproc('net.http_post') is null then
    return false;
  end if;
  execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 5000)'
    using p_url, p_body,
          jsonb_build_object('Content-Type', 'application/json', 'apikey', p_api_key);
  return true;
exception when others then
  raise warning 'http_post to % failed: %', p_url, sqlerrm;
  return false;
end $$;

create or replace function private.call_edge_function(p_name text, p_body jsonb default '{}')
returns boolean language sql security definer set search_path = '' as $$
  select private.http_post_apikey(
    private.secret('project_url') || '/functions/v1/' || p_name,
    private.secret('service_role_key'),
    p_body)
$$;

revoke execute on function private.http_post_apikey(text, text, jsonb),
  private.call_edge_function(text, jsonb)
  from public, anon, authenticated;
