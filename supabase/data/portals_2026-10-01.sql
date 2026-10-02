-- The client's publishing network (2026-10-01): 28 portals, in the client's order.
-- Logos live in the public-assets bucket under portals/<domain>.webp (null = name only).
-- Applied to the hosted project directly; placeholder portals from seed.sql are switched off.
insert into public.portals (name, domain, homepage_url, category, logo_path, sort_order) values
  ('Hind Savera', 'hindsavera.com', 'https://hindsavera.com', 'news', 'portals/hindsavera.com.webp', 1),
  ('Hill Horizon', 'hillhorizon.com', 'https://hillhorizon.com', 'news', null, 2),
  ('BNI Uttarakhand', 'bniuttarakhand.com', 'https://bniuttarakhand.com', 'news', 'portals/bniuttarakhand.com.webp', 3),
  ('Dandi Kathi', 'dandikathi.com', 'https://dandikathi.com', 'news', 'portals/dandikathi.com.webp', 4),
  ('Doon Herald', 'doonherald.com', 'https://doonherald.com', 'news', 'portals/doonherald.com.webp', 5),
  ('News Fuel', 'newsfuel.in', 'https://newsfuel.in', 'news', 'portals/newsfuel.in.webp', 6),
  ('Hindustan Aaj', 'hindustanaaj.com', 'https://hindustanaaj.com', 'news', 'portals/hindustanaaj.com.webp', 7),
  ('New Bharat Times', 'newbharattimes.com', 'https://newbharattimes.com', 'news', null, 8),
  ('Bharat Mail 24', 'bharatmail24.com', 'https://bharatmail24.com', 'news', 'portals/bharatmail24.com.webp', 9),
  ('Bharat News International', 'bharatnewsinternational.com', 'https://bharatnewsinternational.com', 'news', 'portals/bharatnewsinternational.com.webp', 10),
  ('Viral News 24x7', 'viralnews24x7.in', 'https://viralnews24x7.in', 'news', 'portals/viralnews24x7.in.webp', 11),
  ('Hindavi Tarangini', 'hindavitarangini.com', 'https://hindavitarangini.com', 'news', 'portals/hindavitarangini.com.webp', 12),
  ('Daily Prime', 'dailyprime.in', 'https://dailyprime.in', 'news', 'portals/dailyprime.in.webp', 13),
  ('Local Samachaar Pro', 'localsamachaarpro.in', 'https://localsamachaarpro.in', 'news', null, 14),
  ('News In The Center', 'newsinthecenter.com', 'https://newsinthecenter.com', 'news', 'portals/newsinthecenter.com.webp', 15),
  ('Current News UK', 'currentnewsuk.com', 'https://currentnewsuk.com', 'news', 'portals/currentnewsuk.com.webp', 16),
  ('Pahad Pulse', 'pahadpulse.com', 'https://pahadpulse.com', 'news', 'portals/pahadpulse.com.webp', 17),
  ('Pahad Update', 'pahadupdate.com', 'https://pahadupdate.com', 'news', 'portals/pahadupdate.com.webp', 18),
  ('Devbhoomi Media', 'devbhoomimedia.com', 'https://devbhoomimedia.com', 'news', 'portals/devbhoomimedia.com.webp', 19),
  ('Cyber Youth', 'cyberyouth.co.in', 'https://cyberyouth.co.in', 'news', 'portals/cyberyouth.co.in.webp', 20),
  ('India 7 Live', 'india7live.com', 'https://india7live.com', 'news', 'portals/india7live.com.webp', 21),
  ('Dhriti Times', 'dhrititimes.com', 'https://dhrititimes.com', 'news', null, 22),
  ('News Viral India', 'newsviralindia.com', 'https://newsviralindia.com', 'news', 'portals/newsviralindia.com.webp', 23),
  ('Khabar Inbox', 'khabarinbox.com', 'https://khabarinbox.com', 'news', 'portals/khabarinbox.com.webp', 24),
  ('Tathya Bharat', 'tathyabharat.com', 'https://tathyabharat.com', 'news', 'portals/tathyabharat.com.webp', 25),
  ('Breaking Adda', 'breakingadda.com', 'https://breakingadda.com', 'news', 'portals/breakingadda.com.webp', 26),
  ('UK07 News', 'uk07news.com', 'https://uk07news.com', 'news', 'portals/uk07news.com.webp', 27),
  ('Uttarakhand News Update', 'uttarakhandnewsupdate.com', 'https://uttarakhandnewsupdate.com', 'news', 'portals/uttarakhandnewsupdate.com.webp', 28)
on conflict (domain) do update set
  name = excluded.name, homepage_url = excluded.homepage_url, logo_path = excluded.logo_path,
  sort_order = excluded.sort_order, is_active = true, show_publicly = true;

update public.portals set is_active = false, show_publicly = false where domain like '%.example';

-- Every portal can carry the Story Package; new orders start with the first 5 by sort order.
insert into public.package_portals (package_id, portal_id)
select pk.id, po.id from public.packages pk cross join public.portals po
 where pk.code = 'starter' and po.domain not like '%.example'
on conflict do nothing;
