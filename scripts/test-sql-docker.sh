#!/usr/bin/env bash
# Runs the SQL behaviour tests (test/run.sh) inside a throwaway Postgres 16 container,
# so no local Postgres install is needed. CI runs test/run.sh directly instead.
set -euo pipefail
cd "$(dirname "$0")/.."
name="prapp-sqltest-$$"
docker run -d --rm --name "$name" -e POSTGRES_HOST_AUTH_METHOD=trust \
  -v "$PWD:/work:ro" -w /work postgres:16 >/dev/null
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 30); do
  docker exec "$name" pg_isready -U postgres -q && break
  sleep 1
done
# Inside the container we are root with Postgres installed: run.sh uses `su postgres`.
docker exec "$name" bash test/run.sh
