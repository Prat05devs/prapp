#!/usr/bin/env bash
# Creates .env from .env.example with the local Supabase URL/keys (after `supabase start`)
# and random local secrets. Never overwrites an existing .env.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then echo ".env exists, not overwriting"; exit 0; fi
eval "$(pnpm exec supabase status -o env 2>/dev/null | grep -E '^(API_URL|PUBLISHABLE_KEY|SECRET_KEY|ANON_KEY|SERVICE_ROLE_KEY)=')"
PUBLIC_KEY="${PUBLISHABLE_KEY:-${ANON_KEY:-}}"
PRIVATE_KEY="${SECRET_KEY:-${SERVICE_ROLE_KEY:-}}"
if [ -z "$PUBLIC_KEY" ] || [ -z "$PRIVATE_KEY" ]; then
  echo "Could not read local Supabase API keys"
  exit 1
fi
python3 - "$API_URL" "$PUBLIC_KEY" "$PRIVATE_KEY" <<'PY'
import re, secrets, sys
api, anon, service = sys.argv[1:4]
vals = {
    'NEXT_PUBLIC_SUPABASE_URL': api, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': anon, 'SUPABASE_SECRET_KEY': service,
    'CHECKOUT_TOKEN_SECRET': secrets.token_hex(32), 'CRON_SECRET': secrets.token_hex(24),
    'EXPO_PUBLIC_SUPABASE_URL': api, 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY': anon,
}
out = []
for line in open('.env.example').read().splitlines():
    m = re.match(r'^([A-Z0-9_]+)=(.*)$', line)
    if m and m.group(1) in vals:
        line = f'{m.group(1)}={vals[m.group(1)]}'
    elif m:
        line = re.sub(r'\s+#.*$', '', line)
    out.append(line)
open('.env', 'w').write('# Local development (supabase start). Fill the blanks when you have the keys.\n' + '\n'.join(out) + '\n')
PY
echo "Wrote .env for local Supabase at $API_URL"
