#!/usr/bin/env bash
# Rebuilds a scratch database, applies the Supabase stub + every migration (in order),
# then runs every test file (01_, 02_, ...). They share t.results; the last report counts all.
# Local (root with Postgres installed): bash test/run.sh
# CI: set PGHOST/PGUSER/PGPASSWORD for a superuser and run the same command.
set -e
cd "$(dirname "$0")/.."
if [ "$(id -u)" = "0" ] && [ -z "$PGHOST" ]; then run() { su postgres -c "$*"; }; else run() { bash -c "$*"; }; fi
run "dropdb --if-exists prtest && createdb prtest"
run "psql -q -v ON_ERROR_STOP=1 -d prtest -f test/00_supabase_stub.sql" 2>&1 | grep -v NOTICE || true
for m in supabase/migrations/*.sql; do
  run "psql -q -v ON_ERROR_STOP=1 -d prtest -f $m" 2>&1 | grep -v NOTICE || true
done
out=""
for t in test/[0-9][0-9]_*.sql; do
  [ "$t" = "test/00_supabase_stub.sql" ] && continue
  out="$out
$(run "psql -d prtest -f $t" 2>&1)"
done
echo "$out" | grep -E "ERROR" || true
summary=$(run "psql -d prtest -tA -F ' | ' -c \"select count(*) filter (where ok), count(*) filter (where not ok) from t.results\"")
echo "passed | failed: $summary"
run "psql -d prtest -tA -F ' | ' -c \"select n, name, detail from t.results where not ok order by n\""
[ "${summary##* | }" = "0" ] && echo "ALL SQL TESTS PASSED" || { echo "SQL TESTS FAILED"; exit 1; }
