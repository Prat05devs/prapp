-- Run ONCE as the shared PostgreSQL administrator, connected to the newsvio database.
-- psql -v ON_ERROR_STOP=1 -d newsvio -f provision.sql
-- The existing newsvio database owner is the migration identity. It is NOT an API login.
-- Passwords for newsvio_runtime are set out-of-band with psql \password (never in git).
begin;
do $$ begin
  if current_database() <> 'newsvio' then raise exception 'Connect to newsvio before provisioning'; end if;
  if exists (select 1 from pg_roles where rolname in ('newsvio_anon','newsvio_authenticated','newsvio_service','newsvio_runtime')) then
    raise exception 'newsvio roles already exist; inspect ownership/membership instead of silently reusing them';
  end if;
end $$;
create role newsvio_anon nologin nosuperuser nobypassrls;
create role newsvio_authenticated nologin nosuperuser nobypassrls;
create role newsvio_service nologin nosuperuser bypassrls;
create role newsvio_runtime login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
grant newsvio_anon, newsvio_authenticated, newsvio_service to newsvio_runtime;
-- Grant the migration owner permission to create policies/grants for these roles.
do $$ declare owner_name text; begin
  select pg_get_userbyid(datdba) into owner_name from pg_database where datname = current_database();
  execute format('grant newsvio_anon, newsvio_authenticated, newsvio_service to %I', owner_name);
end $$;
revoke all on database newsvio from public;
grant connect on database newsvio to newsvio_runtime;
revoke create on schema public from public;
commit;
