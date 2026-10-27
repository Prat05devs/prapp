-- Facebook page post in the Story Package (client, 2026-10-06; VERBAL_SYSTEM.md §21).
-- The package is now: 5 news portals + 1 Instagram collaboration post + 1 Facebook page post,
-- ₹499 with GST included (price unchanged). Paid orders get a Facebook placement slot that the
-- editor fills with the live post link, like the Instagram one.

alter type public.placement_channel add value if not exists 'facebook';

alter table public.packages
  add column includes_facebook boolean not null default false;

-- A package must deliver something: portals or a social post.
alter table public.packages drop constraint if exists packages_check;
alter table public.packages
  add constraint packages_check check (portal_count > 0 or includes_instagram or includes_facebook);

update public.packages set
  description = 'Your story on 5 news portals, 1 Instagram collaboration post and 1 Facebook page post',
  includes_facebook = true
where code = 'starter';

-- Creates placement rows from the package snapshot when an order is paid (adds Facebook).
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
  -- Snapshots taken before this migration have no includes_facebook key: no Facebook slot.
  if coalesce((p_snapshot ->> 'includes_facebook')::boolean, false) then
    insert into public.order_placements (order_id, channel)
    values (p_order_id, 'facebook'::public.placement_channel);
  end if;
end $$;

-- Paste the live link for one portal / the Instagram or Facebook post.
-- Returns true if the link's domain does not match (UI shows a warning).
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
  elsif v_pl.channel::text = 'facebook' then
    v_domain := 'facebook.com';
  else
    select regexp_replace(lower(domain::text), '^www\.', '') into v_domain from public.portals where id = v_pl.portal_id;
  end if;
  v_mismatch := not (v_host = v_domain or v_host like '%.' || v_domain
                     or (v_pl.channel::text = 'facebook' and v_host = 'fb.com'));

  update public.order_placements set
    status = 'live', live_url = p_url, domain_mismatch = v_mismatch,
    posted_by = auth.uid(), posted_at = now()
  where id = p_placement_id;

  insert into public.order_events (order_id, actor_id, actor_type, event, details)
  values (v_pl.order_id, auth.uid(), 'staff', 'placement_live',
          jsonb_build_object('placement', p_placement_id, 'url', p_url, 'domain_mismatch', v_mismatch));
  return v_mismatch;
end $$;
