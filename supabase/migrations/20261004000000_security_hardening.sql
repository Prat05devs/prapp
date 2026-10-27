-- Security review, Oct 2026.
--
-- 1. PAYMENTS_MODE=link confirms an order as 'paid' with attention_reason 'verify_payment_link'
--    before anyone has seen the money. Editors may not start such an order until an admin has
--    checked the Razorpay dashboard and cleared the flag (admin_clear_attention); admins, who do
--    the checking, still can. Without this an unpaid order could be claimed and published.
--
-- 2. public-assets is a public bucket: SVG (which can carry script) is no longer accepted, and
--    portal logos are admin-only, matching /admin/portals. Showcase images stay editor+ (LLD §10).

create or replace function public.staff_claim_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_staff();
  if not private.is_admin() and exists (
    select 1 from public.orders
     where id = p_order_id and status = 'paid' and attention_reason = 'verify_payment_link'
  ) then
    raise exception 'payment_unverified' using errcode = 'P0001';
  end if;
  update public.orders set status = 'in_progress', assigned_to = auth.uid(), claimed_at = now()
   where id = p_order_id and status = 'paid';
  if not found then raise exception 'order_not_claimable' using errcode = 'P0001'; end if;
end $$;

update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'public-assets';

drop policy if exists public_assets_staff_insert on storage.objects;
drop policy if exists public_assets_staff_update on storage.objects;
drop policy if exists public_assets_staff_delete on storage.objects;

create policy public_assets_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'public-assets' and (
    ((storage.foldername(name))[1] = 'showcase' and (select private.is_staff()))
    or (select private.is_admin())));
create policy public_assets_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'public-assets' and (
    ((storage.foldername(name))[1] = 'showcase' and (select private.is_staff()))
    or (select private.is_admin())));
create policy public_assets_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'public-assets' and (
    ((storage.foldername(name))[1] = 'showcase' and (select private.is_staff()))
    or (select private.is_admin())));
