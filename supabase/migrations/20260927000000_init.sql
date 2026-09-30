-- =============================================================================
-- PR + Fact-check platform — initial schema
-- Target: Supabase (Postgres 15+). Run with `supabase db push` or `supabase migration up`.
--
-- Security model (read this first)
--   * Every table in `public` has RLS enabled. Nothing is readable/writable unless
--     a policy AND a column grant allow it.
--   * Roles: app_role = user | editor (data entry) | admin. Stored in profiles.role.
--     A user can never change their own role (no column grant on `role`).
--   * Money is never written by clients. Payment/refund state is written ONLY by
--     the backend (Next.js API using the service_role key) after talking to Razorpay.
--   * Staff never UPDATE tables directly. They call RPC functions (staff_*, admin_*)
--     which check the role, lock rows, and enforce the order state machine.
--   * The order state machine is enforced by a trigger, so even a bug in the API
--     cannot move an order into an illegal state (e.g. an editor marking "paid").
--   * Helper functions live in the `private` schema, which is NOT exposed by the API.
-- =============================================================================

create schema if not exists extensions;
create extension if not exists citext with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
create type public.app_role          as enum ('user', 'editor', 'admin');
create type public.order_status      as enum ('draft', 'pending_payment', 'paid', 'in_progress',
                                              'changes_requested', 'published', 'rejected',
                                              'refunded', 'cancelled', 'expired');
create type public.payment_status    as enum ('created', 'authorized', 'captured', 'failed',
                                              'refunded', 'partially_refunded');
create type public.refund_status     as enum ('pending', 'processed', 'failed');
create type public.placement_channel as enum ('portal', 'instagram');
create type public.placement_status  as enum ('pending', 'live', 'failed', 'swapped');
create type public.report_status     as enum ('not_started', 'generating', 'ready', 'failed');
create type public.actor_type        as enum ('user', 'staff', 'system', 'razorpay');
create type public.device_platform   as enum ('ios', 'android', 'web');
create type public.fc_input_type     as enum ('text', 'url', 'image');
create type public.fc_status         as enum ('queued', 'processing', 'done', 'failed');
create type public.fc_verdict        as enum ('likely_false', 'misleading', 'likely_true', 'unverified');
create type public.fc_mode           as enum ('full', 'reduced');
create type public.source_tier       as enum ('tier1', 'tier2', 'unknown');

-- -----------------------------------------------------------------------------
-- 2. Generic helpers
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Who is calling? 'service_role' (backend key), 'authenticated', 'anon', or
-- 'system' (pg_cron / migrations / SQL editor — no JWT present).
create or replace function private.request_role()
returns text language sql stable set search_path = '' as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    'system')
$$;

create or replace function private.is_backend()
returns boolean language sql stable set search_path = '' as $$
  select private.request_role() in ('service_role', 'system')
$$;

-- -----------------------------------------------------------------------------
-- 3. Profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 100),
  email       extensions.citext not null,
  -- E.164, e.g. +919876543210. Required before any order (enforced in order triggers).
  phone       text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  avatar_url  text,
  role        public.app_role not null default 'user',
  is_active   boolean not null default true,   -- admin can deactivate a staff member
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role) where role <> 'user';
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Role helpers (SECURITY DEFINER so they can read profiles without RLS recursion)
create or replace function private.user_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.role from public.profiles p
      where p.id = (select auth.uid()) and p.is_active),
    'user'::public.app_role)
$$;

create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.user_role() in ('editor', 'admin')
$$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.user_role() = 'admin'
$$;

create or replace function private.profile_complete(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
     where p.id = p_user and p.phone is not null and length(trim(p.full_name)) > 0)
$$;

-- Auto-create a profile when someone signs up (Google or email OTP)
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 100),
    new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Keep profile email in sync if the auth email changes
create or replace function private.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = coalesce(new.email, '') where id = new.id;
  end if;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function private.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- 4. App settings (support contacts, limits) — public ones readable by anyone
-- -----------------------------------------------------------------------------
create table public.app_settings (
  key         text primary key check (key ~ '^[a-z0-9_.]+$'),
  value       jsonb not null,
  is_public   boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);
create trigger app_settings_updated_at before update on public.app_settings
  for each row execute function private.set_updated_at();

create or replace function private.setting_int(p_key text, p_default int)
returns int language sql stable security definer set search_path = '' as $$
  select coalesce((select (value #>> '{}')::int from public.app_settings where key = p_key), p_default)
$$;

-- -----------------------------------------------------------------------------
-- 5. Catalogue: portals and packages
-- -----------------------------------------------------------------------------
create table public.portals (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 2 and 100),
  domain         extensions.citext not null unique check (domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  homepage_url   text not null check (homepage_url ~* '^https?://'),
  da_score       smallint check (da_score between 0 and 100),
  category       text,
  logo_path      text,                               -- in bucket public-assets
  is_active      boolean not null default true,      -- false = do not use for new orders
  show_publicly  boolean not null default true,      -- listed on website/app for credibility
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger portals_updated_at before update on public.portals
  for each row execute function private.set_updated_at();

create table public.packages (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique check (code ~ '^[a-z0-9_-]+$'),
  name                text not null,
  description         text,
  price_inr_paise     integer not null check (price_inr_paise >= 100),      -- ₹499 = 49900
  price_usd_cents     integer check (price_usd_cents is null or price_usd_cents >= 50),
  portal_count        smallint not null check (portal_count >= 0),
  includes_instagram  boolean not null default false,
  turnaround_hours    smallint not null default 24 check (turnaround_hours between 1 and 240),
  is_active           boolean not null default true,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (portal_count > 0 or includes_instagram)
);
create trigger packages_updated_at before update on public.packages
  for each row execute function private.set_updated_at();

-- Default portals used when an order on this package is paid (editor can swap later)
create table public.package_portals (
  package_id  uuid not null references public.packages (id) on delete cascade,
  portal_id   uuid not null references public.portals (id) on delete restrict,
  primary key (package_id, portal_id)
);
create index package_portals_portal_idx on public.package_portals (portal_id);

-- -----------------------------------------------------------------------------
-- 6. Orders
-- -----------------------------------------------------------------------------
create sequence private.order_number_seq;
grant usage on sequence private.order_number_seq to service_role;

create or replace function private.next_order_number()
returns text language sql volatile security definer set search_path = '' as $$
  select 'PR-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-'
         || lpad(nextval('private.order_number_seq')::text, 5, '0')
$$;

create table public.orders (
  id                        uuid primary key default gen_random_uuid(),
  order_number              text not null unique default private.next_order_number(),
  -- set null on account deletion; customer_* snapshot keeps the business record
  user_id                   uuid default auth.uid() references public.profiles (id) on delete set null,
  package_id                uuid not null references public.packages (id),
  status                    public.order_status not null default 'draft',

  -- content written by the customer
  headline                  text not null check (char_length(trim(headline)) between 10 and 150),
  body                      text not null check (char_length(trim(body)) between 300 and 20000),
  instagram_handle          text check (instagram_handle is null
                                        or instagram_handle ~ '^[A-Za-z0-9._]{1,30}$'),
  feature_consent           boolean not null default false,   -- may show on website showcase
  declaration_accepted_at   timestamptz,                      -- "content is mine & accurate"

  -- written by the backend at checkout / payment (never by the client)
  package_snapshot          jsonb,            -- package as it was when paid
  currency                  text check (currency in ('INR', 'USD')),
  amount_minor              integer check (amount_minor > 0),
  customer_name             text,
  customer_email            text,
  customer_phone            text,
  current_intent_id         uuid,             -- FK added after payment_intents exists
  paid_payment_id           uuid,             -- FK added after payments exists
  checkout_started_at       timestamptz,
  paid_at                   timestamptz,
  deadline_at               timestamptz,

  -- fulfilment
  assigned_to               uuid references public.profiles (id) on delete set null,
  claimed_at                timestamptz,
  changes_requested_reason  text,
  rejection_reason          text,
  published_at              timestamptz,
  report_status             public.report_status not null default 'not_started',
  report_path               text,             -- in bucket reports
  report_version            int not null default 0,

  -- alerts for the admin (duplicate payment, amount mismatch, partial delivery...)
  needs_attention           boolean not null default false,
  attention_reason          text,
  deadline_warned_at        timestamptz,
  delay_notified_at         timestamptz,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index orders_user_idx      on public.orders (user_id, created_at desc);
create index orders_queue_idx     on public.orders (status, deadline_at)
  where status in ('paid', 'in_progress', 'changes_requested');
create index orders_assigned_idx  on public.orders (assigned_to) where assigned_to is not null;
create index orders_attention_idx on public.orders (needs_attention) where needs_attention;
create index orders_pending_idx   on public.orders (checkout_started_at) where status = 'pending_payment';

create table public.order_images (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders (id) on delete cascade,
  -- bucket order-images, path: {user_id}/{order_id}/{uuid}.{ext}
  storage_path       text not null unique,
  mime_type          text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes         int not null check (size_bytes > 0 and size_bytes <= 5242880),
  width              int check (width > 0),
  height             int check (height > 0),
  position           smallint not null default 1 check (position between 1 and 2),
  original_filename  text check (char_length(original_filename) <= 255),
  created_at         timestamptz not null default now(),
  unique (order_id, position)
);

-- One row per Razorpay order we create (a customer may retry checkout, so an
-- order can have several intents; only one ends up "paid").
create table public.payment_intents (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders (id) on delete restrict,
  razorpay_order_id  text not null unique,
  amount_minor       integer not null check (amount_minor > 0),
  currency           text not null check (currency in ('INR', 'USD')),
  package_snapshot   jsonb not null,
  status             text not null default 'created'
                       check (status in ('created', 'attempted', 'paid', 'abandoned')),
  livemode           boolean not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index payment_intents_order_idx on public.payment_intents (order_id);
create trigger payment_intents_updated_at before update on public.payment_intents
  for each row execute function private.set_updated_at();

-- One row per Razorpay payment (each attempt on an intent)
create table public.payments (
  id                     uuid primary key default gen_random_uuid(),
  intent_id              uuid not null references public.payment_intents (id) on delete restrict,
  order_id               uuid not null references public.orders (id) on delete restrict,
  razorpay_payment_id    text not null unique,
  status                 public.payment_status not null,
  amount_minor           integer not null check (amount_minor > 0),
  currency               text not null,
  method                 text,                 -- upi, card, netbanking, wallet
  error_code             text,
  error_description      text,
  captured_at            timestamptz,
  amount_refunded_minor  integer not null default 0 check (amount_refunded_minor >= 0),
  is_duplicate           boolean not null default false,
  raw                    jsonb not null default '{}',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);
create trigger payments_updated_at before update on public.payments
  for each row execute function private.set_updated_at();

alter table public.orders
  add constraint orders_current_intent_fk foreign key (current_intent_id)
    references public.payment_intents (id) on delete set null,
  add constraint orders_paid_payment_fk foreign key (paid_payment_id)
    references public.payments (id) on delete set null;

create table public.refunds (
  id                  uuid primary key default gen_random_uuid(),
  payment_id          uuid not null references public.payments (id) on delete restrict,
  order_id            uuid not null references public.orders (id) on delete restrict,
  razorpay_refund_id  text unique,
  amount_minor        integer not null check (amount_minor > 0),
  status              public.refund_status not null default 'pending',
  reason              text not null,
  initiated_by        uuid references public.profiles (id) on delete set null,
  raw                 jsonb not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index refunds_order_idx on public.refunds (order_id);
create trigger refunds_updated_at before update on public.refunds
  for each row execute function private.set_updated_at();

-- Idempotency log for Razorpay webhooks (x-razorpay-event-id)
create table public.webhook_events (
  event_id      text primary key,
  event_type    text not null,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  error         text
);

-- One row per portal / Instagram post the team must publish
create table public.order_placements (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  channel          public.placement_channel not null,
  portal_id        uuid references public.portals (id) on delete restrict,  -- null = editor picks
  status           public.placement_status not null default 'pending',
  live_url         text check (live_url is null or live_url ~* '^https?://'),
  domain_mismatch  boolean not null default false,
  posted_by        uuid references public.profiles (id) on delete set null,
  posted_at        timestamptz,
  swapped_from_id  uuid references public.order_placements (id) on delete set null,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (channel = 'portal' or portal_id is null),
  check (status <> 'live' or live_url is not null)
);
create index order_placements_order_idx on public.order_placements (order_id);
create unique index order_placements_unique_portal
  on public.order_placements (order_id, portal_id)
  where portal_id is not null and status <> 'swapped';
create trigger order_placements_updated_at before update on public.order_placements
  for each row execute function private.set_updated_at();

-- Audit trail: every status change, note, link, refund
create table public.order_events (
  id           bigint generated always as identity primary key,
  order_id     uuid not null references public.orders (id) on delete cascade,
  actor_id     uuid references public.profiles (id) on delete set null,
  actor_type   public.actor_type not null,
  event        text not null,
  from_status  public.order_status,
  to_status    public.order_status,
  details      jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

-- -----------------------------------------------------------------------------
-- 7. Notifications, devices, showcase
-- -----------------------------------------------------------------------------
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  type            text not null,
  title           text not null,
  body            text not null,
  data            jsonb not null default '{}',          -- {order_id, deep_link, ...}
  channels        text[] not null default '{in_app,push}',
  read_at         timestamptz,
  push_sent_at    timestamptz,
  email_sent_at   timestamptz,
  delivery_error     text,
  delivery_attempts  smallint not null default 0,
  created_at         timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unsent_idx on public.notifications (created_at)
  where push_sent_at is null and email_sent_at is null;

create table public.device_tokens (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  expo_push_token  text not null unique,
  platform         public.device_platform not null,
  last_seen_at     timestamptz not null default now(),
  created_at       timestamptz not null default now()
);
create index device_tokens_user_idx on public.device_tokens (user_id);

create table public.showcase_stories (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  portal_name  text not null,
  url          text not null check (url ~* '^https?://'),
  image_path   text,                                    -- bucket public-assets
  order_id     uuid references public.orders (id) on delete set null,
  is_visible   boolean not null default true,
  sort_order   int not null default 0,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger showcase_updated_at before update on public.showcase_stories
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- 8. Fact-check tables (written only by the backend/worker)
-- -----------------------------------------------------------------------------
create table public.trusted_sources (
  domain      extensions.citext primary key,
  tier        public.source_tier not null,
  category    text not null check (category in ('government', 'fact_checker', 'news', 'reference', 'other')),
  note        text,
  added_by    uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trusted_sources_updated_at before update on public.trusted_sources
  for each row execute function private.set_updated_at();

create or replace function private.new_report_id()
returns text language sql volatile set search_path = '' as $$
  select 'FC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
$$;

create table public.fact_checks (
  id                     uuid primary key default gen_random_uuid(),
  report_id              text not null unique default private.new_report_id(),
  user_id                uuid references public.profiles (id) on delete set null,
  device_id              text,                               -- guests
  input_type             public.fc_input_type not null,
  input_text             text check (char_length(input_text) <= 10000),
  input_url              text check (input_url is null or input_url ~* '^https?://'),
  image_path             text,                               -- bucket fact-check-uploads
  input_hash             text not null,                      -- cache key
  status                 public.fc_status not null default 'queued',
  mode                   public.fc_mode not null default 'full',
  full_check_status      text not null default 'not_needed'
                           check (full_check_status in ('not_needed', 'queued', 'done')),
  verdict                public.fc_verdict,
  confidence             text check (confidence in ('low', 'medium', 'high')),
  summary                text,
  language               text,
  input_domain           extensions.citext,
  input_domain_tier      public.source_tier,
  input_domain_age_days  int,
  is_public              boolean not null default true,
  share_image_path       text,                               -- bucket fact-check-share
  pdf_path               text,
  attempts               smallint not null default 0,
  error                  text,
  locked_at              timestamptz,
  completed_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (input_type <> 'text'  or input_text is not null),
  check (input_type <> 'url'   or input_url is not null),
  check (input_type <> 'image' or image_path is not null)
);
create index fact_checks_user_idx  on public.fact_checks (user_id, created_at desc);
create index fact_checks_hash_idx  on public.fact_checks (input_hash, created_at desc) where status = 'done';
create index fact_checks_queue_idx on public.fact_checks (created_at) where status = 'queued';
create index fact_checks_full_idx  on public.fact_checks (created_at) where full_check_status = 'queued';
create trigger fact_checks_updated_at before update on public.fact_checks
  for each row execute function private.set_updated_at();

create table public.fact_check_claims (
  id                     uuid primary key default gen_random_uuid(),
  fact_check_id          uuid not null references public.fact_checks (id) on delete cascade,
  position               smallint not null default 1,
  claim_text             text not null,
  verdict                public.fc_verdict,
  explanation            text,
  is_government_related  boolean not null default false,
  created_at             timestamptz not null default now()
);
create index fact_check_claims_fc_idx on public.fact_check_claims (fact_check_id);

create table public.fact_check_sources (
  id                      uuid primary key default gen_random_uuid(),
  claim_id                uuid not null references public.fact_check_claims (id) on delete cascade,
  url                     text not null,
  domain                  extensions.citext not null,
  title                   text,
  publisher               text,
  tier                    public.source_tier not null default 'unknown',
  stance                  text check (stance in ('supports', 'refutes', 'context')),
  is_existing_fact_check  boolean not null default false,
  rating                  text,
  published_at            timestamptz,
  created_at              timestamptz not null default now()
);
create index fact_check_sources_claim_idx on public.fact_check_sources (claim_id);

-- Powers the "How we checked this" section of the report
create table public.fact_check_tool_runs (
  id             bigint generated always as identity primary key,
  fact_check_id  uuid not null references public.fact_checks (id) on delete cascade,
  tool           text not null,     -- google_fact_check, gemini_search, gdelt, wikipedia, rdap, tesseract...
  model          text,
  status         text not null check (status in ('ok', 'skipped', 'failed', 'quota_exhausted')),
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  summary        text
);
create index fact_check_tool_runs_fc_idx on public.fact_check_tool_runs (fact_check_id);

create table public.usage_counters (
  scope  text not null,          -- guest_device, guest_ip, user, global
  key    text not null,
  day    date not null,
  count  int not null default 0,
  primary key (scope, key, day)
);

create table public.provider_usage (
  provider     text not null,
  model        text not null,
  day          date not null,
  calls        int not null default 0,
  daily_quota  int,
  primary key (provider, model, day)
);

-- =============================================================================
-- 9. Order business rules (triggers)
-- =============================================================================

-- Allowed status transitions per actor. Anything not listed is rejected.
create or replace function private.transition_allowed(p_actor text, p_from public.order_status, p_to public.order_status)
returns boolean language sql immutable set search_path = '' as $$
  select (p_from::text || '>' || p_to::text) = any (
    case p_actor
      when 'user' then array[
        'draft>cancelled',
        'changes_requested>paid']                       -- resubmit after edits
      when 'editor' then array[
        'paid>in_progress', 'in_progress>paid',          -- claim / release
        'paid>changes_requested', 'in_progress>changes_requested',
        'in_progress>published']
      when 'admin' then array[
        'paid>in_progress', 'in_progress>paid',
        'paid>changes_requested', 'in_progress>changes_requested',
        'in_progress>published',
        'paid>rejected', 'in_progress>rejected', 'changes_requested>rejected',
        'published>in_progress']                         -- reopen to fix a link
      when 'backend' then array[
        'draft>pending_payment', 'expired>pending_payment',
        'pending_payment>draft', 'expired>draft',
        'pending_payment>paid', 'draft>paid', 'expired>paid', 'cancelled>paid',  -- late payments honoured
        'pending_payment>expired', 'pending_payment>cancelled', 'draft>cancelled',
        'paid>refunded', 'in_progress>refunded', 'changes_requested>refunded',
        'rejected>refunded', 'published>refunded',
        'changes_requested>paid',
        'paid>in_progress', 'in_progress>paid',
        'paid>changes_requested', 'in_progress>changes_requested',
        'in_progress>published', 'published>in_progress',
        'paid>rejected', 'in_progress>rejected', 'changes_requested>rejected']
      else array[]::text[]
    end)
$$;

create or replace function private.orders_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_drafts int;
begin
  if not private.is_backend() then
    new.user_id := auth.uid();
    new.status  := 'draft';
    if new.user_id is null then
      raise exception 'not_authenticated' using errcode = '42501';
    end if;
    if not private.profile_complete(new.user_id) then
      raise exception 'profile_incomplete' using errcode = 'P0001',
        hint = 'Name and phone number are required before creating an order';
    end if;
    select count(*) into v_drafts from public.orders
     where user_id = new.user_id and created_at > now() - interval '24 hours';
    if v_drafts >= private.setting_int('orders.max_new_per_day', 10) then
      raise exception 'too_many_orders_today' using errcode = 'P0001';
    end if;
  end if;

  if not exists (select 1 from public.packages where id = new.package_id and is_active) then
    raise exception 'package_unavailable' using errcode = 'P0001';
  end if;

  if new.declaration_accepted_at is not null then
    new.declaration_accepted_at := now();   -- never trust a client timestamp
  end if;
  return new;
end $$;

create trigger orders_before_insert before insert on public.orders
  for each row execute function private.orders_before_insert();

create or replace function private.orders_before_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role     public.app_role;
  v_ok       boolean;
  v_hours    int;
  v_content  boolean;
begin
  new.updated_at := now();

  -- Content edits: only while draft (anything) or changes_requested (not the package)
  v_content := new.headline is distinct from old.headline
            or new.body is distinct from old.body
            or new.instagram_handle is distinct from old.instagram_handle
            or new.feature_consent is distinct from old.feature_consent
            or new.package_id is distinct from old.package_id;

  if v_content and not private.is_backend() then
    if old.status not in ('draft', 'changes_requested') then
      raise exception 'order_locked' using errcode = 'P0001',
        hint = 'Content can only be edited while the order is a draft or when changes are requested';
    end if;
    if old.status = 'changes_requested' and new.package_id is distinct from old.package_id then
      raise exception 'package_locked_after_payment' using errcode = 'P0001';
    end if;
    if new.package_id is distinct from old.package_id
       and not exists (select 1 from public.packages where id = new.package_id and is_active) then
      raise exception 'package_unavailable' using errcode = 'P0001';
    end if;
  end if;

  if new.declaration_accepted_at is distinct from old.declaration_accepted_at
     and new.declaration_accepted_at is not null then
    new.declaration_accepted_at := now();
  end if;

  if new.status is distinct from old.status then
    if private.is_backend() then
      v_ok := private.transition_allowed('backend', old.status, new.status);
    else
      v_role := private.user_role();
      v_ok := (v_role = 'admin' and private.transition_allowed('admin', old.status, new.status))
           or (v_role in ('editor', 'admin') and private.transition_allowed('editor', old.status, new.status))
           or (old.user_id = auth.uid() and private.transition_allowed('user', old.status, new.status));
    end if;
    if not v_ok then
      raise exception 'illegal_transition % -> %', old.status, new.status using errcode = 'P0001';
    end if;

    -- side effects
    if new.status = 'paid' and old.status = 'changes_requested' then
      v_hours := coalesce((new.package_snapshot ->> 'turnaround_hours')::int, 24);
      new.deadline_at := now() + make_interval(hours => v_hours);   -- fresh 24h after resubmit
      new.deadline_warned_at := null;
      new.delay_notified_at := null;
    end if;
    if new.status = 'paid' and old.status = 'in_progress' then     -- released back to queue
      new.assigned_to := null;
      new.claimed_at  := null;
    end if;
    if new.status = 'in_progress' and old.status = 'paid' then
      new.claimed_at := coalesce(new.claimed_at, now());
    end if;
    if new.status = 'published' then
      new.published_at  := now();
      new.report_status := 'generating';
    end if;
  end if;
  return new;
end $$;

create trigger orders_before_update before update on public.orders
  for each row execute function private.orders_before_update();

create or replace function private.current_actor_type()
returns public.actor_type language sql stable security definer set search_path = '' as $$
  select case
    when private.request_role() = 'service_role' then 'system'::public.actor_type
    when private.request_role() = 'system' then 'system'::public.actor_type
    when private.is_staff() then 'staff'::public.actor_type
    else 'user'::public.actor_type end
$$;

-- Audit + customer/staff notifications on status changes
create or replace function private.orders_after_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_link jsonb := jsonb_build_object('order_id', new.id, 'deep_link', '/orders/' || new.id);
begin
  if new.status is distinct from old.status then
    insert into public.order_events (order_id, actor_id, actor_type, event, from_status, to_status, details)
    values (new.id, auth.uid(), private.current_actor_type(), 'status_changed', old.status, new.status,
            jsonb_strip_nulls(jsonb_build_object(
              'reason', case new.status when 'changes_requested' then new.changes_requested_reason
                                        when 'rejected' then new.rejection_reason end)));
  end if;

  if new.user_id is null then
    return new;
  end if;

  -- Customer notifications
  if new.status is distinct from old.status then
    if new.status = 'paid' and old.status in ('draft', 'pending_payment', 'expired', 'cancelled') then
      insert into public.notifications (user_id, type, title, body, data, channels)
      values (new.user_id, 'order_paid', 'Payment received',
              'Order ' || new.order_number || ': your story will be published within '
                || coalesce(new.package_snapshot ->> 'turnaround_hours', '24') || ' hours.',
              v_link, '{in_app,push,email}');

      insert into public.notifications (user_id, type, title, body, data, channels)
      select p.id, 'staff_new_order', 'New order ' || new.order_number,
             'Deadline ' || to_char(new.deadline_at at time zone 'Asia/Kolkata', 'DD Mon HH24:MI') || ' IST',
             jsonb_build_object('order_id', new.id, 'deep_link', '/admin/orders/' || new.id), '{in_app}'
        from public.profiles p where p.role in ('editor', 'admin') and p.is_active;

    elsif new.status = 'changes_requested' then
      insert into public.notifications (user_id, type, title, body, data, channels)
      values (new.user_id, 'order_changes_requested', 'Changes needed for your story',
              coalesce(new.changes_requested_reason, 'Please review your submission.'),
              v_link, '{in_app,push,email}');

    elsif new.status = 'rejected' then
      insert into public.notifications (user_id, type, title, body, data, channels)
      values (new.user_id, 'order_rejected', 'We could not publish your story',
              coalesce(new.rejection_reason, 'Your order was not approved.') || ' A full refund has been initiated.',
              v_link, '{in_app,push,email}');

    elsif new.status = 'refunded' then
      insert into public.notifications (user_id, type, title, body, data, channels)
      values (new.user_id, 'order_refunded', 'Refund processed',
              'The refund for order ' || new.order_number || ' has been processed. Banks can take 5–7 working days to show it.',
              v_link, '{in_app,push,email}');
    end if;
  end if;

  -- "Everything is posted, report ready" fires when the PDF is actually ready
  if new.report_status = 'ready' and old.report_status is distinct from 'ready' and new.status = 'published' then
    insert into public.notifications (user_id, type, title, body, data, channels)
    values (new.user_id, 'order_published',
            case when new.report_version > 1 then 'Your report was updated' else 'Your story is live!' end,
            'Everything is posted. Your report for ' || new.order_number || ' is ready to download.',
            v_link, '{in_app,push,email}');
  end if;

  return new;
end $$;

create trigger orders_after_update after update on public.orders
  for each row execute function private.orders_after_update();

create or replace function private.orders_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.order_events (order_id, actor_id, actor_type, event, to_status)
  values (new.id, auth.uid(), private.current_actor_type(), 'created', new.status);
  return new;
end $$;

create trigger orders_after_insert after insert on public.orders
  for each row execute function private.orders_after_insert();

-- Images: max N per order, only while editable, path must be {user}/{order}/...
create or replace function private.order_images_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_count int;
begin
  select * into v_order from public.orders where id = new.order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if not private.is_backend() then
    if v_order.user_id is distinct from auth.uid() then
      raise exception 'not_authorized' using errcode = '42501';
    end if;
    if v_order.status not in ('draft', 'changes_requested') then
      raise exception 'order_locked' using errcode = 'P0001';
    end if;
    if new.storage_path not like (v_order.user_id::text || '/' || v_order.id::text || '/%') then
      raise exception 'invalid_storage_path' using errcode = 'P0001';
    end if;
  end if;
  select count(*) into v_count from public.order_images where order_id = new.order_id;
  if v_count >= private.setting_int('orders.max_images', 2) then
    raise exception 'too_many_images' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger order_images_before_insert before insert on public.order_images
  for each row execute function private.order_images_before_insert();

create or replace function private.order_images_before_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_backend() and not exists (
      select 1 from public.orders o
       where o.id = old.order_id and o.status in ('draft', 'changes_requested')) then
    raise exception 'order_locked' using errcode = 'P0001';
  end if;
  return old;
end $$;

create trigger order_images_before_delete before delete on public.order_images
  for each row execute function private.order_images_before_delete();

-- Creates placement rows from the package snapshot when an order is paid
create or replace function private.create_placements(p_order_id uuid, p_snapshot jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_count   int := coalesce((p_snapshot ->> 'portal_count')::int, 0);
  v_created int;
begin
  if exists (select 1 from public.order_placements where order_id = p_order_id) then
    return;
  end if;

  insert into public.order_placements (order_id, channel, portal_id)
  select p_order_id, 'portal', pp.portal_id
    from public.package_portals pp
    join public.portals po on po.id = pp.portal_id and po.is_active
   where pp.package_id = (p_snapshot ->> 'id')::uuid
   order by po.sort_order, po.name
   limit v_count;
  get diagnostics v_created = row_count;

  -- Not enough active default portals: leave empty slots for the editor to choose
  insert into public.order_placements (order_id, channel, portal_id)
  select p_order_id, 'portal', null from generate_series(1, greatest(v_count - v_created, 0));

  if coalesce((p_snapshot ->> 'includes_instagram')::boolean, false) then
    insert into public.order_placements (order_id, channel) values (p_order_id, 'instagram');
  end if;
end $$;

-- =============================================================================
-- 10. Backend-only functions (service_role). Called by the Next.js API after it
--     has verified things with Razorpay. Clients can never execute these.
-- =============================================================================

-- Called by POST /api/orders/:id/checkout AFTER creating the Razorpay order.
create or replace function public.svc_create_payment_intent(
  p_order_id uuid, p_razorpay_order_id text, p_amount_minor int, p_currency text,
  p_package_snapshot jsonb, p_livemode boolean)
returns public.payment_intents language plpgsql security definer set search_path = '' as $$
declare
  v_order   public.orders;
  v_profile public.profiles;
  v_intent  public.payment_intents;
  v_images  int;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0001'; end if;
  if v_order.status not in ('draft', 'pending_payment', 'expired') then
    raise exception 'order_not_payable' using errcode = 'P0001';
  end if;
  if v_order.declaration_accepted_at is null then
    raise exception 'declaration_required' using errcode = 'P0001';
  end if;
  select count(*) into v_images from public.order_images where order_id = p_order_id;
  if v_images < 1 then raise exception 'image_required' using errcode = 'P0001'; end if;
  select * into v_profile from public.profiles where id = v_order.user_id;
  if v_profile.phone is null then raise exception 'profile_incomplete' using errcode = 'P0001'; end if;

  -- Older unpaid intents are abandoned (the API checked Razorpay has no captured payment on them)
  update public.payment_intents set status = 'abandoned'
   where order_id = p_order_id and status in ('created', 'attempted');

  insert into public.payment_intents (order_id, razorpay_order_id, amount_minor, currency, package_snapshot, livemode)
  values (p_order_id, p_razorpay_order_id, p_amount_minor, p_currency, p_package_snapshot, p_livemode)
  returning * into v_intent;

  update public.orders set
    status              = 'pending_payment',
    current_intent_id   = v_intent.id,
    package_snapshot    = p_package_snapshot,
    amount_minor        = p_amount_minor,
    currency            = p_currency,
    customer_name       = v_profile.full_name,
    customer_email      = v_profile.email,
    customer_phone      = v_profile.phone,
    checkout_started_at = now()
  where id = p_order_id;

  return v_intent;
end $$;

-- Customer tapped "Edit" on an unpaid order. API first confirms with Razorpay
-- that no payment is authorized/captured on the current intent.
create or replace function public.svc_reopen_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.payment_intents set status = 'abandoned'
   where order_id = p_order_id and status in ('created', 'attempted');
  update public.orders set status = 'draft', current_intent_id = null
   where id = p_order_id and status in ('pending_payment', 'expired');
  if not found then raise exception 'order_not_reopenable' using errcode = 'P0001'; end if;
end $$;

-- Single entry point for ALL payment updates: checkout callback, webhook, reconciliation.
-- Idempotent: calling it twice with the same payment changes nothing.
-- Returns: paid | already_paid | duplicate | amount_mismatch | failed | authorized | unknown_intent | recorded
create or replace function public.svc_apply_payment(
  p_razorpay_order_id text, p_razorpay_payment_id text, p_status public.payment_status,
  p_amount_minor int, p_currency text, p_method text default null,
  p_error_code text default null, p_error_description text default null,
  p_captured_at timestamptz default null, p_raw jsonb default '{}')
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_intent   public.payment_intents;
  v_order    public.orders;
  v_payment  public.payments;
  v_rank_old int;
  v_rank_new int;
  v_paid_at  timestamptz;
begin
  select * into v_intent from public.payment_intents where razorpay_order_id = p_razorpay_order_id for update;
  if not found then return 'unknown_intent'; end if;
  select * into v_order from public.orders where id = v_intent.order_id for update;

  -- Upsert the payment row, only ever moving status "forward"
  -- (failed -> captured is allowed: UPI payments can succeed late)
  select * into v_payment from public.payments where razorpay_payment_id = p_razorpay_payment_id for update;
  v_rank_new := case p_status when 'created' then 0 when 'failed' then 1 when 'authorized' then 2
                  when 'captured' then 3 when 'partially_refunded' then 4 when 'refunded' then 5 end;
  if not found then
    insert into public.payments (intent_id, order_id, razorpay_payment_id, status, amount_minor, currency,
                                 method, error_code, error_description, captured_at, raw)
    values (v_intent.id, v_intent.order_id, p_razorpay_payment_id, p_status, p_amount_minor, p_currency,
            p_method, p_error_code, p_error_description,
            case when p_status = 'captured' then coalesce(p_captured_at, now()) end, p_raw)
    returning * into v_payment;
  else
    v_rank_old := case v_payment.status when 'created' then 0 when 'failed' then 1 when 'authorized' then 2
                    when 'captured' then 3 when 'partially_refunded' then 4 when 'refunded' then 5 end;
    if v_rank_new > v_rank_old then
      update public.payments set
        status = p_status, method = coalesce(p_method, method),
        error_code = p_error_code, error_description = p_error_description,
        captured_at = case when p_status = 'captured' then coalesce(p_captured_at, captured_at, now()) else captured_at end,
        raw = p_raw
      where id = v_payment.id returning * into v_payment;
    end if;
  end if;

  if v_payment.status = 'failed' then
    update public.payment_intents set status = 'attempted' where id = v_intent.id and status = 'created';
    return 'failed';
  end if;
  if v_payment.status = 'authorized' then
    return 'authorized';   -- API should capture it (or auto-capture is on)
  end if;
  if v_payment.status <> 'captured' then
    return 'recorded';
  end if;

  -- ---- captured ----
  if v_payment.amount_minor <> v_intent.amount_minor or upper(v_payment.currency) <> v_intent.currency then
    update public.orders set needs_attention = true, attention_reason = 'amount_mismatch'
     where id = v_order.id;
    insert into public.order_events (order_id, actor_type, event, details)
    values (v_order.id, 'razorpay', 'payment_amount_mismatch',
            jsonb_build_object('payment', p_razorpay_payment_id, 'paid', v_payment.amount_minor,
                               'expected', v_intent.amount_minor));
    return 'amount_mismatch';
  end if;

  if v_order.paid_payment_id = v_payment.id then
    return 'already_paid';
  end if;

  if v_order.status in ('draft', 'pending_payment', 'expired', 'cancelled') and v_order.paid_payment_id is null then
    v_paid_at := coalesce(v_payment.captured_at, now());
    update public.payment_intents set status = 'paid' where id = v_intent.id;
    update public.payment_intents set status = 'abandoned'
     where order_id = v_order.id and id <> v_intent.id and status in ('created', 'attempted');
    update public.orders set
      status           = 'paid',
      paid_payment_id  = v_payment.id,
      current_intent_id = v_intent.id,
      package_snapshot = v_intent.package_snapshot,   -- honour what they actually paid for
      amount_minor     = v_intent.amount_minor,
      currency         = v_intent.currency,
      paid_at          = v_paid_at,
      deadline_at      = v_paid_at + make_interval(hours => coalesce((v_intent.package_snapshot ->> 'turnaround_hours')::int, 24))
    where id = v_order.id;
    perform private.create_placements(v_order.id, v_intent.package_snapshot);
    insert into public.order_events (order_id, actor_type, event, details)
    values (v_order.id, 'razorpay', 'payment_captured',
            jsonb_build_object('payment', p_razorpay_payment_id, 'amount', v_payment.amount_minor,
                               'method', v_payment.method));
    return 'paid';
  end if;

  -- Order already paid by a different payment → customer paid twice
  update public.payments set is_duplicate = true where id = v_payment.id;
  update public.orders set needs_attention = true, attention_reason = 'duplicate_payment_refund_due'
   where id = v_order.id;
  insert into public.order_events (order_id, actor_type, event, details)
  values (v_order.id, 'razorpay', 'duplicate_payment',
          jsonb_build_object('payment', p_razorpay_payment_id, 'amount', v_payment.amount_minor));
  return 'duplicate';
end $$;

-- Called when the API creates a refund on Razorpay, and again by refund.* webhooks.
create or replace function public.svc_apply_refund(
  p_razorpay_payment_id text, p_razorpay_refund_id text, p_amount_minor int,
  p_status public.refund_status, p_reason text default 'refund',
  p_initiated_by uuid default null, p_raw jsonb default '{}')
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_payment  public.payments;
  v_refund   public.refunds;
  v_total    int;
  v_order    public.orders;
begin
  select * into v_payment from public.payments where razorpay_payment_id = p_razorpay_payment_id for update;
  if not found then return 'unknown_payment'; end if;

  insert into public.refunds (payment_id, order_id, razorpay_refund_id, amount_minor, status, reason, initiated_by, raw)
  values (v_payment.id, v_payment.order_id, p_razorpay_refund_id, p_amount_minor, p_status, p_reason, p_initiated_by, p_raw)
  on conflict (razorpay_refund_id) do update
    set status = case when public.refunds.status = 'processed' then 'processed'::public.refund_status
                      else excluded.status end,
        raw = excluded.raw
  returning * into v_refund;

  select coalesce(sum(amount_minor), 0) into v_total
    from public.refunds where payment_id = v_payment.id and status = 'processed';

  update public.payments set
    amount_refunded_minor = v_total,
    status = case when v_total >= amount_minor then 'refunded'::public.payment_status
                  when v_total > 0 then 'partially_refunded'::public.payment_status
                  else status end
  where id = v_payment.id;

  select * into v_order from public.orders where id = v_payment.order_id for update;

  if v_refund.status = 'processed' and v_total >= v_payment.amount_minor then
    if v_payment.is_duplicate then
      update public.orders set needs_attention = false, attention_reason = null
       where id = v_order.id and attention_reason = 'duplicate_payment_refund_due';
    elsif v_order.paid_payment_id = v_payment.id
          and v_order.status in ('paid', 'in_progress', 'changes_requested', 'rejected', 'published') then
      update public.orders set status = 'refunded' where id = v_order.id;
    end if;
  end if;

  insert into public.order_events (order_id, actor_id, actor_type, event, details)
  values (v_order.id, p_initiated_by, case when p_initiated_by is null then 'razorpay' else 'staff' end::public.actor_type,
          'refund_' || v_refund.status::text,
          jsonb_build_object('refund', p_razorpay_refund_id, 'amount', p_amount_minor, 'reason', p_reason));
  return v_refund.status::text;
end $$;

-- Webhook idempotency: returns true only the first time an event id is seen
create or replace function public.svc_record_webhook(p_event_id text, p_event_type text, p_payload jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.webhook_events (event_id, event_type, payload)
  values (p_event_id, p_event_type, p_payload)
  on conflict (event_id) do nothing;
  return found;
end $$;

create or replace function public.svc_finish_webhook(p_event_id text, p_error text default null)
returns void language sql security definer set search_path = '' as $$
  update public.webhook_events set processed_at = now(), error = p_error where event_id = p_event_id;
$$;

-- Report generation result (PDF built by the Next.js API)
create or replace function public.svc_set_report(p_order_id uuid, p_status public.report_status, p_path text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.orders set
    report_status  = p_status,
    report_path    = coalesce(p_path, report_path),
    report_version = report_version + case when p_status = 'ready' then 1 else 0 end
  where id = p_order_id and status = 'published';
  if not found then raise exception 'order_not_published' using errcode = 'P0001'; end if;
end $$;

-- Cron: unpaid checkouts older than N hours become expired (late payments still honoured)
create or replace function public.svc_expire_pending_orders()
returns int language plpgsql security definer set search_path = '' as $$
declare v int;
begin
  update public.orders o set status = 'expired'
   where o.status = 'pending_payment'
     and o.checkout_started_at < now() - make_interval(hours => private.setting_int('orders.pending_expiry_hours', 24))
     and not exists (select 1 from public.payments p
                      where p.order_id = o.id and p.status in ('authorized', 'captured'));
  get diagnostics v = row_count;
  return v;
end $$;

-- Cron: warn staff before the deadline, tell the customer if we are late
create or replace function public.svc_deadline_sweep()
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in
    select o.* from public.orders o
     where o.status in ('paid', 'in_progress')
       and o.deadline_warned_at is null
       and o.deadline_at < now() + make_interval(hours => private.setting_int('orders.deadline_warning_hours', 2))
     for update skip locked
  loop
    insert into public.notifications (user_id, type, title, body, data, channels)
    select p.id, 'staff_deadline_warning', 'Deadline soon: ' || r.order_number,
           'Due ' || to_char(r.deadline_at at time zone 'Asia/Kolkata', 'DD Mon HH24:MI') || ' IST',
           jsonb_build_object('order_id', r.id, 'deep_link', '/admin/orders/' || r.id), '{in_app,email}'
      from public.profiles p
     where p.is_active and (p.role = 'admin' or p.id = r.assigned_to);
    update public.orders set deadline_warned_at = now() where id = r.id;
  end loop;

  for r in
    select o.* from public.orders o
     where o.status in ('paid', 'in_progress')
       and o.delay_notified_at is null and o.deadline_at < now() and o.user_id is not null
     for update skip locked
  loop
    insert into public.notifications (user_id, type, title, body, data, channels)
    values (r.user_id, 'order_delayed', 'Taking a little longer',
            'Order ' || r.order_number || ' is taking longer than expected. Our team is on it and you will be notified as soon as it is live.',
            jsonb_build_object('order_id', r.id, 'deep_link', '/orders/' || r.id), '{in_app,push,email}');
    update public.orders set delay_notified_at = now(), needs_attention = true,
           attention_reason = coalesce(attention_reason, 'deadline_missed') where id = r.id;
  end loop;
end $$;

-- Fact-check rate limits / provider quota: atomic check-and-increment
create or replace function public.svc_consume_quota(p_scope text, p_key text, p_limit int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v int;
begin
  insert into public.usage_counters (scope, key, day, count)
  values (p_scope, p_key, (now() at time zone 'Asia/Kolkata')::date, 1)
  on conflict (scope, key, day) do update set count = public.usage_counters.count + 1
  returning count into v;
  if v > p_limit then
    update public.usage_counters set count = count - 1
     where scope = p_scope and key = p_key and day = (now() at time zone 'Asia/Kolkata')::date;
    return false;
  end if;
  return true;
end $$;

-- Fact-check worker: take the next queued job (safe with several workers)
create or replace function public.svc_claim_fact_check()
returns public.fact_checks language plpgsql security definer set search_path = '' as $$
declare v public.fact_checks;
begin
  update public.fact_checks set status = 'processing', locked_at = now(), attempts = attempts + 1
   where id = (select id from public.fact_checks
                where status = 'queued'
                   or (status = 'processing' and locked_at < now() - interval '2 minutes' and attempts < 3)
                order by created_at limit 1 for update skip locked)
  returning * into v;
  return v;
end $$;

-- Account deletion guard (DELETE /api/me calls this before deleting the auth user)
create or replace function public.svc_can_delete_user(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.orders
                      where user_id = p_user
                        and status in ('pending_payment', 'paid', 'in_progress', 'changes_requested'))
$$;

-- =============================================================================
-- 11. Customer RPCs
-- =============================================================================
create or replace function public.user_cancel_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.orders set status = 'cancelled'
   where id = p_order_id and user_id = auth.uid() and status = 'draft';
  if not found then raise exception 'order_not_cancellable' using errcode = 'P0001'; end if;
end $$;

create or replace function public.user_resubmit_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.order_images where order_id = p_order_id) then
    raise exception 'image_required' using errcode = 'P0001';
  end if;
  update public.orders set status = 'paid', changes_requested_reason = null
   where id = p_order_id and user_id = auth.uid() and status = 'changes_requested';
  if not found then raise exception 'order_not_resubmittable' using errcode = 'P0001'; end if;
  insert into public.order_events (order_id, actor_id, actor_type, event)
  values (p_order_id, auth.uid(), 'user', 'resubmitted');
end $$;

-- Same phone can switch accounts: token moves to whoever is logged in now
create or replace function public.register_device_token(p_token text, p_platform public.device_platform)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_token !~ '^Expo(nent)?PushToken\[.+\]$' then
    raise exception 'invalid_push_token' using errcode = 'P0001';
  end if;
  insert into public.device_tokens (user_id, expo_push_token, platform)
  values (auth.uid(), p_token, p_platform)
  on conflict (expo_push_token) do update
    set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = now();
end $$;

-- =============================================================================
-- 12. Staff RPCs (editor = data entry, admin = everything)
-- =============================================================================
create or replace function private.assert_staff()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_staff() then raise exception 'not_authorized' using errcode = '42501'; end if;
end $$;

create or replace function private.assert_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'not_authorized' using errcode = '42501'; end if;
end $$;

-- Lock the order to one editor so two people never post the same story
create or replace function public.staff_claim_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_staff();
  update public.orders set status = 'in_progress', assigned_to = auth.uid(), claimed_at = now()
   where id = p_order_id and status = 'paid';
  if not found then raise exception 'order_not_claimable' using errcode = 'P0001'; end if;
end $$;

create or replace function public.staff_release_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_staff();
  update public.orders set status = 'paid'
   where id = p_order_id and status = 'in_progress'
     and (assigned_to = auth.uid() or private.is_admin());
  if not found then raise exception 'order_not_releasable' using errcode = 'P0001'; end if;
end $$;

create or replace function private.assert_can_work_on(p_order_id uuid)
returns public.orders language plpgsql security definer set search_path = '' as $$
declare v public.orders;
begin
  perform private.assert_staff();
  select * into v from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0001'; end if;
  if v.status <> 'in_progress' then
    raise exception 'order_not_in_progress' using errcode = 'P0001', hint = 'Claim the order first';
  end if;
  if v.assigned_to is distinct from auth.uid() and not private.is_admin() then
    raise exception 'order_assigned_to_someone_else' using errcode = 'P0001';
  end if;
  return v;
end $$;

-- Paste the live link for one portal / the Instagram post
-- Returns true if the link's domain does not match the portal (UI shows a warning)
create or replace function public.staff_set_placement_link(p_placement_id uuid, p_url text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_pl      public.order_placements;
  v_domain  text;
  v_host    text;
  v_mismatch boolean;
begin
  select * into v_pl from public.order_placements where id = p_placement_id;
  if not found then raise exception 'placement_not_found' using errcode = 'P0001'; end if;
  perform private.assert_can_work_on(v_pl.order_id);
  select * into v_pl from public.order_placements where id = p_placement_id for update;

  if v_pl.status = 'swapped' then raise exception 'placement_swapped' using errcode = 'P0001'; end if;
  if v_pl.channel = 'portal' and v_pl.portal_id is null then
    raise exception 'choose_portal_first' using errcode = 'P0001';
  end if;
  p_url := trim(p_url);
  if p_url !~* '^https://[^\s/]+\.[^\s/]+' then
    raise exception 'invalid_url' using errcode = 'P0001', hint = 'Paste the full https:// link';
  end if;

  v_host := regexp_replace(lower(substring(p_url from '^https?://([^/:?#]+)')), '^(www\.|m\.)', '');
  if v_pl.channel = 'instagram' then
    v_domain := 'instagram.com';
  else
    select regexp_replace(lower(domain::text), '^www\.', '') into v_domain from public.portals where id = v_pl.portal_id;
  end if;
  v_mismatch := not (v_host = v_domain or v_host like '%.' || v_domain);

  update public.order_placements set
    status = 'live', live_url = p_url, domain_mismatch = v_mismatch,
    posted_by = auth.uid(), posted_at = now()
  where id = p_placement_id;

  insert into public.order_events (order_id, actor_id, actor_type, event, details)
  values (v_pl.order_id, auth.uid(), 'staff', 'placement_live',
          jsonb_build_object('placement', p_placement_id, 'url', p_url, 'domain_mismatch', v_mismatch));
  return v_mismatch;
end $$;

create or replace function public.staff_mark_placement_failed(p_placement_id uuid, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_pl public.order_placements;
begin
  select * into v_pl from public.order_placements where id = p_placement_id;
  if not found then raise exception 'placement_not_found' using errcode = 'P0001'; end if;
  perform private.assert_can_work_on(v_pl.order_id);
  update public.order_placements set status = 'failed', live_url = null, note = p_note
   where id = p_placement_id and status in ('pending', 'live', 'failed');
  insert into public.order_events (order_id, actor_id, actor_type, event, details)
  values (v_pl.order_id, auth.uid(), 'staff', 'placement_failed',
          jsonb_build_object('placement', p_placement_id, 'note', p_note));
end $$;

-- Pick a portal for an empty slot, or replace a portal that is down
create or replace function public.staff_swap_placement(p_placement_id uuid, p_new_portal_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_pl  public.order_placements;
  v_new uuid;
begin
  select * into v_pl from public.order_placements where id = p_placement_id;
  if not found then raise exception 'placement_not_found' using errcode = 'P0001'; end if;
  perform private.assert_can_work_on(v_pl.order_id);
  if v_pl.channel <> 'portal' then raise exception 'not_a_portal_placement' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.portals where id = p_new_portal_id and is_active) then
    raise exception 'portal_unavailable' using errcode = 'P0001';
  end if;

  if v_pl.portal_id is null then
    update public.order_placements set portal_id = p_new_portal_id, note = p_reason where id = p_placement_id;
    v_new := p_placement_id;
  else
    if v_pl.status = 'live' then
      raise exception 'placement_already_live' using errcode = 'P0001';
    end if;
    update public.order_placements set status = 'swapped', note = p_reason where id = p_placement_id;
    insert into public.order_placements (order_id, channel, portal_id, swapped_from_id, note)
    values (v_pl.order_id, 'portal', p_new_portal_id, p_placement_id, p_reason)
    returning id into v_new;
  end if;

  insert into public.order_events (order_id, actor_id, actor_type, event, details)
  values (v_pl.order_id, auth.uid(), 'staff', 'placement_swapped',
          jsonb_build_object('from_portal', v_pl.portal_id, 'to_portal', p_new_portal_id, 'reason', p_reason));
  return v_new;
end $$;

create or replace function public.staff_request_changes(p_order_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_staff();
  if char_length(trim(coalesce(p_reason, ''))) < 10 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  update public.orders set status = 'changes_requested', changes_requested_reason = trim(p_reason)
   where id = p_order_id and status in ('paid', 'in_progress')
     and (status = 'paid' or assigned_to = auth.uid() or private.is_admin());
  if not found then raise exception 'order_not_editable' using errcode = 'P0001'; end if;
end $$;

-- Everything posted → published. The API then generates the PDF and calls svc_set_report.
-- p_allow_partial (admin only): publish even if some portals failed; flags a partial refund.
create or replace function public.staff_mark_published(p_order_id uuid, p_allow_partial boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_open   int;
  v_failed int;
  v_live   int;
begin
  perform private.assert_can_work_on(p_order_id);
  select count(*) filter (where status = 'pending'),
         count(*) filter (where status = 'failed'),
         count(*) filter (where status = 'live')
    into v_open, v_failed, v_live
    from public.order_placements where order_id = p_order_id;

  if v_open > 0 then
    raise exception 'placements_pending' using errcode = 'P0001', hint = v_open || ' placement(s) still pending';
  end if;
  if v_live = 0 then raise exception 'nothing_published' using errcode = 'P0001'; end if;
  if v_failed > 0 then
    if not (p_allow_partial and private.is_admin()) then
      raise exception 'placements_failed' using errcode = 'P0001',
        hint = 'Swap the failed portals, or ask an admin to publish as partial delivery';
    end if;
    update public.orders set needs_attention = true, attention_reason = 'partial_delivery_refund_due'
     where id = p_order_id;
  end if;

  update public.orders set status = 'published' where id = p_order_id;
end $$;

create or replace function public.staff_add_note(p_order_id uuid, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_staff();
  if char_length(trim(coalesce(p_note, ''))) = 0 then raise exception 'empty_note' using errcode = 'P0001'; end if;
  insert into public.order_events (order_id, actor_id, actor_type, event, details)
  values (p_order_id, auth.uid(), 'staff', 'note', jsonb_build_object('note', trim(p_note)));
end $$;

-- ---- admin only ----
create or replace function public.admin_assign_order(p_order_id uuid, p_editor_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  if not exists (select 1 from public.profiles where id = p_editor_id and role in ('editor', 'admin') and is_active) then
    raise exception 'not_a_staff_member' using errcode = 'P0001';
  end if;
  update public.orders set assigned_to = p_editor_id,
         status = case when status = 'paid' then 'in_progress'::public.order_status else status end,
         claimed_at = now()
   where id = p_order_id and status in ('paid', 'in_progress');
  if not found then raise exception 'order_not_assignable' using errcode = 'P0001'; end if;
  insert into public.order_events (order_id, actor_id, actor_type, event, details)
  values (p_order_id, auth.uid(), 'staff', 'assigned', jsonb_build_object('editor', p_editor_id));
end $$;

-- Sets status only. The API then calls Razorpay to refund the full amount.
create or replace function public.admin_reject_order(p_order_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  if char_length(trim(coalesce(p_reason, ''))) < 10 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  update public.orders set status = 'rejected', rejection_reason = trim(p_reason)
   where id = p_order_id and status in ('paid', 'in_progress', 'changes_requested');
  if not found then raise exception 'order_not_rejectable' using errcode = 'P0001'; end if;
end $$;

-- Reopen a published order to correct a wrong link (report is regenerated on re-publish)
create or replace function public.admin_reopen_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  update public.orders set status = 'in_progress', assigned_to = coalesce(assigned_to, auth.uid())
   where id = p_order_id and status = 'published';
  if not found then raise exception 'order_not_published' using errcode = 'P0001'; end if;
end $$;

create or replace function public.admin_clear_attention(p_order_id uuid, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  update public.orders set needs_attention = false, attention_reason = null where id = p_order_id;
  insert into public.order_events (order_id, actor_id, actor_type, event, details)
  values (p_order_id, auth.uid(), 'staff', 'attention_cleared', jsonb_build_object('note', p_note));
end $$;

create or replace function public.admin_set_role(p_user_id uuid, p_role public.app_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  if p_role <> 'admin' and exists (select 1 from public.profiles where id = p_user_id and role = 'admin')
     and (select count(*) from public.profiles where role = 'admin' and is_active) <= 1 then
    raise exception 'cannot_remove_last_admin' using errcode = 'P0001';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
  if not found then raise exception 'user_not_found' using errcode = 'P0001'; end if;
end $$;

create or replace function public.admin_set_staff_active(p_user_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  if p_user_id = auth.uid() and not p_active then
    raise exception 'cannot_deactivate_yourself' using errcode = 'P0001';
  end if;
  update public.profiles set is_active = p_active where id = p_user_id;
  -- release anything they were holding
  if not p_active then
    update public.orders set status = 'paid' where assigned_to = p_user_id and status = 'in_progress';
  end if;
end $$;

-- =============================================================================
-- 13. Row Level Security
-- =============================================================================
alter table public.profiles              enable row level security;
alter table public.app_settings          enable row level security;
alter table public.portals               enable row level security;
alter table public.packages              enable row level security;
alter table public.package_portals       enable row level security;
alter table public.orders                enable row level security;
alter table public.order_images          enable row level security;
alter table public.payment_intents       enable row level security;
alter table public.payments              enable row level security;
alter table public.refunds               enable row level security;
alter table public.webhook_events        enable row level security;   -- no policies: backend only
alter table public.order_placements      enable row level security;
alter table public.order_events          enable row level security;
alter table public.notifications         enable row level security;
alter table public.device_tokens         enable row level security;
alter table public.showcase_stories      enable row level security;
alter table public.trusted_sources       enable row level security;
alter table public.fact_checks           enable row level security;
alter table public.fact_check_claims     enable row level security;
alter table public.fact_check_sources    enable row level security;
alter table public.fact_check_tool_runs  enable row level security;
alter table public.usage_counters        enable row level security;   -- backend only
alter table public.provider_usage        enable row level security;   -- backend only

-- profiles
create policy profiles_select_own_or_staff on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- app_settings
create policy settings_read_public on public.app_settings for select to anon, authenticated
  using (is_public or (select private.is_admin()));
create policy settings_admin_write on public.app_settings for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- portals / packages / package_portals: public catalogue, admin edits
create policy portals_read on public.portals for select to anon, authenticated
  using ((is_active and show_publicly) or (select private.is_staff()));
create policy portals_admin_write on public.portals for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy packages_read on public.packages for select to anon, authenticated
  using (is_active or (select private.is_staff()));
create policy packages_admin_write on public.packages for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy package_portals_read on public.package_portals for select to anon, authenticated
  using (true);
create policy package_portals_admin_write on public.package_portals for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- orders: customers see their own; editors see the work queue; admin sees all
create policy orders_select on public.orders for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_admin())
    or ((select private.is_staff()) and status not in ('draft', 'pending_payment', 'cancelled', 'expired'))
  );
create policy orders_insert_own on public.orders for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'draft');
create policy orders_update_own_editable on public.orders for update to authenticated
  using (user_id = (select auth.uid()) and status in ('draft', 'changes_requested'))
  with check (user_id = (select auth.uid()));
create policy orders_delete_own_draft on public.orders for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'draft' and current_intent_id is null);

-- order_images
create policy order_images_select on public.order_images for select to authenticated
  using ((select private.is_staff())
         or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy order_images_insert_own on public.order_images for insert to authenticated
  with check (exists (select 1 from public.orders o
                       where o.id = order_id and o.user_id = (select auth.uid())
                         and o.status in ('draft', 'changes_requested')));
create policy order_images_delete_own on public.order_images for delete to authenticated
  using (exists (select 1 from public.orders o
                  where o.id = order_id and o.user_id = (select auth.uid())
                    and o.status in ('draft', 'changes_requested')));

-- payments: customer sees own status; admin sees all; writes only via svc_* (service role)
create policy payment_intents_select on public.payment_intents for select to authenticated
  using ((select private.is_admin())
         or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy payments_select on public.payments for select to authenticated
  using ((select private.is_admin())
         or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy refunds_select on public.refunds for select to authenticated
  using ((select private.is_admin())
         or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));

-- placements: staff always; customer only once the order is published (links + PDF together)
create policy placements_select on public.order_placements for select to authenticated
  using ((select private.is_staff())
         or (status = 'live' and exists (select 1 from public.orders o
                                          where o.id = order_id and o.user_id = (select auth.uid())
                                            and o.status in ('published', 'refunded'))));

-- audit log: staff only
create policy order_events_select on public.order_events for select to authenticated
  using ((select private.is_staff()));

-- notifications: own only; can mark as read
create policy notifications_select_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- device tokens: own only (writes go through register_device_token)
create policy device_tokens_select_own on public.device_tokens for select to authenticated
  using (user_id = (select auth.uid()));
create policy device_tokens_delete_own on public.device_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

-- showcase: public reads visible stories; staff (data entry) manage the weekly list
create policy showcase_read on public.showcase_stories for select to anon, authenticated
  using (is_visible or (select private.is_staff()));
create policy showcase_staff_write on public.showcase_stories for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

-- trusted sources: public list (shown on the methodology page), admin edits
create policy trusted_sources_read on public.trusted_sources for select to anon, authenticated
  using (true);
create policy trusted_sources_admin_write on public.trusted_sources for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- fact checks: a logged-in user reads their own history. Public report pages and guest
-- results are served by the Next.js API (service role), never by direct table access.
create policy fact_checks_select_own on public.fact_checks for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy fact_checks_update_own_visibility on public.fact_checks for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy fact_check_claims_select on public.fact_check_claims for select to authenticated
  using (exists (select 1 from public.fact_checks f where f.id = fact_check_id
                  and (f.user_id = (select auth.uid()) or (select private.is_admin()))));
create policy fact_check_sources_select on public.fact_check_sources for select to authenticated
  using (exists (select 1 from public.fact_check_claims c join public.fact_checks f on f.id = c.fact_check_id
                  where c.id = claim_id and (f.user_id = (select auth.uid()) or (select private.is_admin()))));
create policy fact_check_tool_runs_select on public.fact_check_tool_runs for select to authenticated
  using (exists (select 1 from public.fact_checks f where f.id = fact_check_id
                  and (f.user_id = (select auth.uid()) or (select private.is_admin()))));

-- =============================================================================
-- 14. Privileges (RLS decides WHICH rows; grants decide WHICH columns)
-- Supabase grants everything to anon/authenticated by default — we undo that.
-- =============================================================================
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public  from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- helpers used inside policies / defaults
grant execute on function private.user_role(), private.is_staff(), private.is_admin(),
                         private.request_role(), private.is_backend(),
                         private.next_order_number()
  to anon, authenticated, service_role;
grant execute on function private.new_report_id(), private.setting_int(text, int),
                         private.profile_complete(uuid)
  to service_role;

-- catalogue
grant select on public.app_settings, public.portals, public.packages, public.package_portals,
                public.showcase_stories, public.trusted_sources to anon, authenticated;
grant insert, update, delete on public.app_settings, public.portals, public.packages,
                public.package_portals, public.showcase_stories, public.trusted_sources to authenticated;

-- profiles: read; update only safe columns (never role / is_active / email)
grant select on public.profiles to authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;

-- orders: customer can write only content columns
grant select on public.orders to authenticated;
grant insert (package_id, headline, body, instagram_handle, feature_consent, declaration_accepted_at)
  on public.orders to authenticated;
grant update (package_id, headline, body, instagram_handle, feature_consent, declaration_accepted_at)
  on public.orders to authenticated;
grant delete on public.orders to authenticated;

grant select, delete on public.order_images to authenticated;
grant insert (order_id, storage_path, mime_type, size_bytes, width, height, position, original_filename)
  on public.order_images to authenticated;

-- payments: safe columns only (raw Razorpay payloads stay server-side)
grant select (id, order_id, razorpay_order_id, amount_minor, currency, status, created_at)
  on public.payment_intents to authenticated;
grant select (id, order_id, intent_id, status, amount_minor, currency, method, captured_at,
              amount_refunded_minor, created_at)
  on public.payments to authenticated;
grant select (id, order_id, payment_id, amount_minor, status, reason, created_at, updated_at)
  on public.refunds to authenticated;

grant select on public.order_placements, public.order_events to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select, delete on public.device_tokens to authenticated;

grant select on public.fact_checks, public.fact_check_claims, public.fact_check_sources,
                public.fact_check_tool_runs to authenticated;
grant update (is_public) on public.fact_checks to authenticated;

-- RPCs for signed-in users (each function checks the role itself)
grant execute on function
  public.user_cancel_order(uuid),
  public.user_resubmit_order(uuid),
  public.register_device_token(text, public.device_platform),
  public.staff_claim_order(uuid),
  public.staff_release_order(uuid),
  public.staff_set_placement_link(uuid, text),
  public.staff_mark_placement_failed(uuid, text),
  public.staff_swap_placement(uuid, uuid, text),
  public.staff_request_changes(uuid, text),
  public.staff_mark_published(uuid, boolean),
  public.staff_add_note(uuid, text),
  public.admin_assign_order(uuid, uuid),
  public.admin_reject_order(uuid, text),
  public.admin_reopen_order(uuid),
  public.admin_clear_attention(uuid, text),
  public.admin_set_role(uuid, public.app_role),
  public.admin_set_staff_active(uuid, boolean)
  to authenticated;

-- backend-only functions
grant execute on function
  public.svc_create_payment_intent(uuid, text, int, text, jsonb, boolean),
  public.svc_reopen_order(uuid),
  public.svc_apply_payment(text, text, public.payment_status, int, text, text, text, text, timestamptz, jsonb),
  public.svc_apply_refund(text, text, int, public.refund_status, text, uuid, jsonb),
  public.svc_record_webhook(text, text, jsonb),
  public.svc_finish_webhook(text, text),
  public.svc_set_report(uuid, public.report_status, text),
  public.svc_expire_pending_orders(),
  public.svc_deadline_sweep(),
  public.svc_consume_quota(text, text, int),
  public.svc_claim_fact_check(),
  public.svc_can_delete_user(uuid)
  to service_role;

-- =============================================================================
-- 15. Storage buckets + policies
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('order-images',       'order-images',       false, 5242880,  array['image/jpeg', 'image/png', 'image/webp']),
  ('reports',            'reports',            false, 10485760, array['application/pdf']),
  ('fact-check-uploads', 'fact-check-uploads', false, 5242880,  array['image/jpeg', 'image/png', 'image/webp']),
  ('fact-check-share',   'fact-check-share',   false, 10485760, array['image/png', 'application/pdf']),
  ('public-assets',      'public-assets',      true,  2097152,  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

-- order-images: path {user_id}/{order_id}/{file}. Customer uploads while editable; staff download.
create policy order_images_obj_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'order-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.orders o
                 where o.id::text = (storage.foldername(name))[2]
                   and o.user_id = (select auth.uid())
                   and o.status in ('draft', 'changes_requested'))
  );
create policy order_images_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'order-images'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_staff())));
create policy order_images_obj_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'order-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.orders o
                 where o.id::text = (storage.foldername(name))[2]
                   and o.status in ('draft', 'changes_requested'))
  );

-- reports: {user_id}/{order_id}/report-v{n}.pdf — written by backend, read by owner + staff
create policy reports_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'reports'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_staff())));

-- public-assets: staff upload portal logos / showcase images; anyone can view (public bucket)
create policy public_assets_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'public-assets' and (select private.is_staff()));
create policy public_assets_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'public-assets' and (select private.is_staff()));
create policy public_assets_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'public-assets' and (select private.is_staff()));

-- fact-check-uploads / fact-check-share: backend only (service role bypasses RLS). No policies.

-- =============================================================================
-- 16. Seed settings (edit values in the admin panel later)
-- =============================================================================
insert into public.app_settings (key, value, is_public) values
  ('support.phone',                 '"+91XXXXXXXXXX"',          true),
  ('support.email',                 '"support@example.com"',    true),
  ('support.whatsapp',              '"+91XXXXXXXXXX"',          true),
  ('support.hours',                 '"10 AM – 7 PM, Mon–Sat"',  true),
  ('orders.max_images',             '2',                        true),
  ('orders.max_new_per_day',        '10',                       false),
  ('orders.pending_expiry_hours',   '24',                       false),
  ('orders.deadline_warning_hours', '2',                        false),
  ('factcheck.guest_daily_limit',   '3',                        true),
  ('factcheck.user_daily_limit',    '20',                       true)
on conflict (key) do nothing;

-- =============================================================================
-- 17. Scheduled jobs (pg_cron). Enable pg_cron + pg_net in the dashboard first.
--     HTTP jobs call the Next.js API with a secret stored in Supabase Vault.
-- =============================================================================
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('expire-pending-orders', '*/30 * * * *', 'select public.svc_expire_pending_orders()');
    perform cron.schedule('deadline-sweep',        '*/10 * * * *', 'select public.svc_deadline_sweep()');
    perform cron.schedule('cleanup-usage-counters', '15 3 * * *',
      $$delete from public.usage_counters where day < current_date - 30$$);
  end if;
end
$cron$;

-- Realtime for the admin order queue (RLS still applies to subscribers)
do $rt$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders;
  end if;
end
$rt$;

-- After pg_net + Vault are set up, add (replace the URL):
-- select cron.schedule('reconcile-payments', '*/10 * * * *', $$
--   select net.http_post(
--     url := 'https://YOUR-SITE/api/cron/reconcile-payments',
--     headers := jsonb_build_object('Authorization', 'Bearer ' ||
--       (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')))
-- $$);
-- select cron.schedule('cleanup-drafts',        '30 3 * * *',  ... '/api/cron/cleanup' ...);
-- select cron.schedule('pending-fact-checks',   '45 7 * * *',  ... '/api/cron/pending-fact-checks' ...);  -- 13:15 IST, after Gemini reset
