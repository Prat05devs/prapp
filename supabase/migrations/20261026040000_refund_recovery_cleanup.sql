-- Backend-only deletion supports account/test fixture maintenance; no client grants change.
grant delete on public.refund_requests to service_role;
