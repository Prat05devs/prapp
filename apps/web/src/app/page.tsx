import Link from 'next/link';
import { fetchCatalogue } from '@prapp/api-client';
import { formatMoney } from '@prapp/shared';
import { Icon } from '@/components/icon';
import { Badge, Eyebrow, LivePill, buttonVariants } from '@/components/ui';
import { publicEnv } from '@/lib/env';
import { createServerSupabase } from '@/server/supabase/server';
import { FactChecker } from './fact-check/fact-checker';

// Named in plain text, never as logos (golden rule 9).
const TOOLS = [
  'Google Fact Check Tools',
  'Gemini with Google Search',
  'GDELT',
  'Wikipedia',
  'RDAP',
];

const HOW = [
  {
    title: 'How fact checking works',
    icon: 'fact_check' as const,
    steps: [
      'Paste the forward, link or screenshot.',
      'We look for existing fact checks, live news coverage and official sources.',
      'You get a verdict with every source, and a link or image to share back.',
    ],
  },
  {
    title: 'How publishing works',
    icon: 'description' as const,
    steps: [
      'Write your headline and story, add 1–2 photos, pick a package.',
      'Pay securely with UPI, card or net banking.',
      'Our team posts it within 24 hours and sends you a report with every live link.',
    ],
  },
];

// Landing (LLD §13): fact-check hero · PR section · recently published · how it works.
export default async function HomePage() {
  const db = await createServerSupabase();
  const [catalogue, showcase] = await Promise.all([
    fetchCatalogue(db).catch(() => ({ packages: [], portals: [] })),
    db
      .from('showcase_stories')
      .select('id, title, portal_name, url, image_path')
      .eq('is_visible', true)
      .order('sort_order')
      .limit(6),
  ]);
  const cheapest = catalogue.packages.reduce<number | null>(
    (min, p) => (min === null || p.priceInrPaise < min ? p.priceInrPaise : min),
    null,
  );
  const supabaseUrl = publicEnv().NEXT_PUBLIC_SUPABASE_URL;

  return (
    <main className="flex flex-col">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute top-0 left-1/2 -z-10 h-96 w-3/4 -translate-x-1/2 bg-gradient-to-b from-emerald-soft/25 via-subtle/10 to-transparent blur-3xl" />
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 pt-14 pb-12 text-center sm:px-6 sm:pt-20">
          <LivePill>Free · every answer shows its sources</LivePill>
          <h1 className="font-display text-display-mobile text-ink md:text-display">
            Got a forward?{' '}
            <span className="block text-emerald-strong">Check it before you share it.</span>
          </h1>
          <p className="max-w-xl text-body-lg text-slate">
            Paste a message, a link or a screenshot. Every answer shows its sources and the tools we
            used.
          </p>
          <div className="w-full">
            <FactChecker
              siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL}
              signedIn={false}
              history={[]}
              compact
            />
          </div>
          <div className="flex flex-col items-center gap-3 pt-2">
            <Eyebrow>Checked with</Eyebrow>
            <ul className="flex flex-wrap justify-center gap-2">
              {TOOLS.map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-hairline bg-canvas px-3 py-1 font-mono text-code text-slate"
                >
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-hairline bg-subtle">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-12">
          <div className="flex flex-col gap-5 lg:col-span-5">
            <Eyebrow accent>Publish your story</Eyebrow>
            <h2 className="font-display text-headline-lg-mobile text-ink sm:text-headline-lg">
              Your news, on our portals within 24 hours.
            </h2>
            <p className="text-body-lg text-slate">
              Your news, announcement or achievement on our news portals and Instagram news page
              within 24 hours
              {cheapest !== null ? `, from ${formatMoney(cheapest)} (inclusive of all taxes)` : ''}.
              Published as sponsored content, with a PDF report of every link.
            </p>
            {catalogue.portals.length ? (
              <div className="flex flex-col gap-2">
                <Eyebrow>Our portals</Eyebrow>
                <ul className="flex flex-wrap gap-2">
                  {catalogue.portals.map((p) => (
                    <li
                      key={p.name}
                      className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-canvas px-2.5 py-1 font-mono text-code text-ink"
                    >
                      <Icon name="check" size={14} className="text-emerald-strong" />
                      {p.name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Link
              href="/publish"
              className={buttonVariants({ size: 'lg', className: 'self-start' })}
            >
              Publish your story <Icon name="arrow_forward" />
            </Link>
          </div>

          {catalogue.packages.length ? (
            <ul className="flex flex-col gap-3 lg:col-span-7">
              {catalogue.packages.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/publish?package=${encodeURIComponent(p.code)}`}
                    className="group flex flex-col gap-3 rounded-2xl border border-hairline bg-canvas p-5 transition-colors hover:border-ink sm:flex-row sm:items-center sm:justify-between sm:p-6"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-label-md text-ink">{p.name}</span>
                      <span className="text-body-sm text-slate">
                        {p.portalCount} news portal{p.portalCount === 1 ? '' : 's'}
                        {p.includesInstagram ? ' + our Instagram news page' : ''} · live within{' '}
                        {p.turnaroundHours} h
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-display text-headline-sm text-ink">
                        {formatMoney(p.priceInrPaise, 'INR')}
                      </span>
                      <Icon
                        name="arrow_forward"
                        className="text-faint transition-colors group-hover:text-ink"
                      />
                    </div>
                  </Link>
                </li>
              ))}
              <li className="px-1 font-mono text-code text-slate">
                Prices are inclusive of all taxes
              </li>
            </ul>
          ) : null}
        </div>
      </section>

      {showcase.data?.length ? (
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex flex-col gap-2">
            <Eyebrow accent>Recently published</Eyebrow>
            <h2 className="font-display text-headline-md text-ink">Stories we&apos;ve carried</h2>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {showcase.data.map((s) => (
              <li key={s.id}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer sponsored"
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-canvas transition-colors hover:border-ink"
                >
                  {s.image_path ? (
                    // eslint-disable-next-line @next/next/no-img-element -- public bucket asset
                    <img
                      src={`${supabaseUrl}/storage/v1/object/public/public-assets/${s.image_path}`}
                      alt=""
                      loading="lazy"
                      className="aspect-video w-full object-cover"
                    />
                  ) : null}
                  <span className="flex flex-1 flex-col gap-3 p-5">
                    <Badge className="self-start">{s.portal_name}</Badge>
                    <span className="text-label-md text-ink">{s.title}</span>
                    <span className="mt-auto inline-flex items-center gap-1 text-label-sm text-slate group-hover:text-ink">
                      Read on {s.portal_name} <Icon name="north_east" size={14} />
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-2">
        {HOW.map((h) => (
          <div key={h.title} className="flex flex-col gap-5 rounded-2xl border border-hairline p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-subtle text-emerald-strong">
                <Icon name={h.icon} />
              </span>
              <h2 className="font-display text-headline-sm text-ink">{h.title}</h2>
            </div>
            <ol className="flex flex-col divide-y divide-divider">
              {h.steps.map((step, i) => (
                <li key={step} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="font-mono text-code text-faint">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-body-md text-body">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="flex flex-col gap-6 rounded-3xl bg-ink p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-xl flex-col gap-3">
            <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 px-3 py-1 font-mono text-label-sm text-emerald-soft uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald" /> Live within 24 hours
            </span>
            <h2 className="font-display text-headline-md sm:text-headline-lg">
              Ready to publish your story?
            </h2>
            <p className="text-body-md text-white/70">
              Write it, add a photo, pick a package and pay with UPI, card or net banking. You get a
              PDF report with every live link.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/publish" className={buttonVariants({ variant: 'accent', size: 'lg' })}>
              Publish your story <Icon name="arrow_forward" />
            </Link>
            <Link
              href="/methodology"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-white/20 px-6 text-label-md font-medium text-white transition-colors hover:border-white"
            >
              How we check
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
