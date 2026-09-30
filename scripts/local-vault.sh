#!/usr/bin/env bash
# Stores the Vault secrets the DB webhooks and cron jobs need, for LOCAL development.
# (Production: set the same four names in the Supabase dashboard → Vault.)
set -euo pipefail
cd "$(dirname "$0")/.."
eval "$(pnpm exec supabase status -o env 2>/dev/null | grep -E '^(SERVICE_ROLE_KEY)=')"
CRON_SECRET=$(grep -E '^CRON_SECRET=' .env | cut -d= -f2-)
# Inside Docker: the API gateway is reachable as supabase_kong_<project_id>, the host as host.docker.internal.
PROJECT_URL="http://supabase_kong_prapp:8000"
SITE_URL="http://host.docker.internal:3000"
docker exec -i supabase_db_prapp psql -U postgres -v ON_ERROR_STOP=1 -q <<SQL
do \$\$
declare r record;
begin
  for r in select * from (values
      ('project_url', '$PROJECT_URL'),
      ('service_role_key', '$SERVICE_ROLE_KEY'),
      ('site_url', '$SITE_URL'),
      ('cron_secret', '$CRON_SECRET')) as v(name, secret)
  loop
    if exists (select 1 from vault.secrets where name = r.name) then
      perform vault.update_secret((select id from vault.secrets where name = r.name), r.secret);
    else
      perform vault.create_secret(r.secret, r.name);
    end if;
  end loop;
end
\$\$;
SQL
echo "Vault secrets set: project_url, service_role_key, site_url, cron_secret"
