-- Dev seed. Replace placeholder portals with the real network before launch.
insert into public.portals (name, domain, homepage_url, da_score, category, sort_order) values
  ('Portal One',   'portal-one.example',   'https://portal-one.example',   55, 'news', 1),
  ('Portal Two',   'portal-two.example',   'https://portal-two.example',   52, 'news', 2),
  ('Portal Three', 'portal-three.example', 'https://portal-three.example', 50, 'local', 3)
on conflict (domain) do nothing;

insert into public.packages (code, name, description, price_inr_paise, price_usd_cents, portal_count, includes_instagram, sort_order) values
  ('starter', 'Starter', 'Your story on 2 news portals + our Instagram news page', 49900, 500, 2, true, 1),
  ('plus',    'Plus',    'Your story on 3 news portals + our Instagram news page', 99900, null, 3, true, 2)
on conflict (code) do nothing;

insert into public.package_portals (package_id, portal_id)
select pk.id, po.id from public.packages pk cross join public.portals po
 where (pk.code = 'starter' and po.sort_order <= 2) or pk.code = 'plus'
on conflict do nothing;

insert into public.trusted_sources (domain, tier, category) values
  ('pib.gov.in',            'tier1', 'government'),
  ('factcheck.pib.gov.in',  'tier1', 'government'),
  ('india.gov.in',          'tier1', 'government'),
  ('uk.gov.in',             'tier1', 'government'),
  ('boomlive.in',           'tier1', 'fact_checker'),
  ('factly.in',             'tier1', 'fact_checker'),
  ('vishvasnews.com',       'tier1', 'fact_checker'),
  ('altnews.in',            'tier1', 'fact_checker'),
  ('newschecker.in',        'tier1', 'fact_checker'),
  ('thehindu.com',          'tier2', 'news'),
  ('indianexpress.com',     'tier2', 'news'),
  ('hindustantimes.com',    'tier2', 'news'),
  ('timesofindia.indiatimes.com', 'tier2', 'news'),
  ('ndtv.com',              'tier2', 'news'),
  ('reuters.com',           'tier2', 'news'),
  ('bbc.com',               'tier2', 'news'),
  ('wikipedia.org',         'tier2', 'reference')
on conflict (domain) do nothing;
