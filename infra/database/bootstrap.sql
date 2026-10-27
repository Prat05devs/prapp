-- Real standalone schema prerequisites. This file does not install Supabase services.
-- Identity verification is performed by the API before setting transaction-local claims.
create schema auth;
create schema storage;
create schema extensions;
revoke all on schema auth, storage, extensions from public;
revoke create on schema public from public;
grant usage on schema public, auth, storage, extensions to newsvio_anon, newsvio_authenticated, newsvio_service;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema auth revoke execute on functions from public;
alter default privileges in schema storage revoke execute on functions from public;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  raw_user_meta_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create unique index users_email_unique on auth.users (lower(email));
alter table auth.users enable row level security;
grant select, insert, update, delete on auth.users to newsvio_service;

create function auth.uid() returns uuid language sql stable set search_path = '' as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable set search_path = '' as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb
$$;
grant execute on function auth.uid(), auth.jwt() to newsvio_anon, newsvio_authenticated, newsvio_service;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  owner uuid default auth.uid(),
  content_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_at timestamptz not null default now(),
  unique (bucket_id, name)
);
alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to newsvio_authenticated;
grant select, insert, update, delete on storage.objects, storage.buckets to newsvio_service;
create function storage.foldername(name text) returns text[] language sql immutable set search_path = '' as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
grant execute on function storage.foldername(text) to newsvio_anon, newsvio_authenticated, newsvio_service;
