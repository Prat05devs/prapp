\set ON_ERROR_STOP 1
\set QUIET 1
-- Tests for 20261006000000_facebook_placement.sql. Runs after 01_ (reuses its orders and editor).
\set B  '''22222222-2222-2222-2222-222222222222'''
\set E  '''eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'''
\set O3 '''0000000a-0000-0000-0000-000000000003'''

-- Orders paid before the migration carry a snapshot without includes_facebook: no Facebook slot.
select t.ok((select count(*) from public.order_placements where order_id = :O3 and channel = 'facebook') = 0,
            'old package snapshot: no Facebook slot');

select t.ok((select includes_facebook from public.packages where code = 'starter') = false,
            'packages default to no Facebook');
update public.packages set includes_facebook = true where code = 'starter';
select t.ok((select (to_jsonb(p) ->> 'includes_facebook')::boolean from public.packages p where code = 'starter'),
            'package snapshot carries includes_facebook');

-- Re-create the placements as if the order had been paid on the Facebook package.
delete from public.order_placements where order_id = :O3;
select private.create_placements(:O3, (select to_jsonb(p) from public.packages p where code = 'starter'));
select t.ok((select count(*) from public.order_placements where order_id = :O3 and channel = 'facebook') = 1,
            'Facebook slot created on payment');
select t.ok((select count(*) from public.order_placements where order_id = :O3) = 4,
            'placements: 2 portals + Instagram + Facebook');

-- A package can be social-only, but must deliver something.
select t.err($$insert into public.packages (code, name, price_inr_paise, portal_count) values ('nothing', 'Nothing', 10000, 0)$$,
             'packages_check', 'package with no portals and no social post is rejected');
insert into public.packages (code, name, price_inr_paise, portal_count, includes_facebook, is_active)
values ('fb_only', 'Facebook only', 10000, 0, true, false);
select t.ok(exists (select 1 from public.packages where code = 'fb_only'), 'Facebook-only package allowed');

-- The editor pastes the Facebook link; the domain check knows facebook.com.
select t.claims(:E, 'authenticated'); set role authenticated;
select public.staff_claim_order(:O3);
select t.ok(public.staff_set_placement_link(
  (select id from public.order_placements where order_id = :O3 and channel = 'facebook'),
  'https://www.instagram.com/p/wrong/') = true, 'Instagram link on the Facebook slot -> warning flag');
select t.ok(public.staff_set_placement_link(
  (select id from public.order_placements where order_id = :O3 and channel = 'facebook'),
  'https://m.facebook.com/newsvio/posts/123') = false, 'Facebook link accepted (m. ignored)');
select t.ok(public.staff_set_placement_link(
  (select id from public.order_placements where order_id = :O3 and channel = 'facebook'),
  'https://fb.com/newsvio/posts/123') = false, 'fb.com short link accepted');
reset role;
