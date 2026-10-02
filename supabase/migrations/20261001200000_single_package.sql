-- One package for launch (client, 2026-10-01): ₹499 / $5, the story on 5 high-DA news portals
-- plus one Instagram post (a collaboration post when the customer gives their handle).
-- Updates existing rows only; fresh databases get the package from seed.sql.
update public.packages set
  name = 'Story Package',
  description = 'Your story on 5 high-DA news portals + 1 Instagram collaboration post',
  price_inr_paise = 49900,
  price_usd_cents = 500,
  portal_count = 5,
  includes_instagram = true,
  is_active = true
where code = 'starter';

update public.packages set is_active = false where code <> 'starter';
