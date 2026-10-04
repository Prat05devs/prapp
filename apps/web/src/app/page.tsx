import Link from 'next/link';
import { fetchCatalogue } from '@prapp/api-client';
import { BRAND_NAME, FC_VERDICT_LABELS, formatMoney, publicAssetUrl } from '@prapp/shared';
import { Icon } from '@/components/icon';
import { PortalWall } from '@/components/site/portal-wall';
import { SourceStrip } from '@/components/site/source-strip';
import { buttonVariants } from '@/components/ui';
import { publicEnv } from '@/lib/env';
import { getCurrentUser } from '@/server/session';
import { createServerSupabase } from '@/server/supabase/server';
import {
  VERDICT_COLORS,
  VERDICT_ICONS,
  VERDICT_MEANINGS,
} from '@/components/fact-check/verdict-style';
import { FactChecker } from './fact-check/fact-checker';

const CHECK_STEPS = [
  {
    title: 'Paste it',
    body: 'A WhatsApp forward, a link or a screenshot, in English, Hindi or another Indian language.',
  },
  {
    title: 'We search the evidence',
    body: 'Existing fact checks, live news coverage from Indian and international outlets, and official sources.',
  },
  {
    title: 'Get a verdict with sources',
    body: 'Likely true, misleading, likely false or unverified, with every source linked. Share it back in one tap.',
  },
];

const PUBLISH_STEPS = [
  'Write your headline and story, and add 1–2 photos.',
  'Add your Instagram handle for a collaboration post (optional).',
  'Pay securely. Our team posts your story within 24 hours.',
  'Get a PDF report with every live link.',
];

const FAQ = [
  {
    q: 'Is the fact checker free?',
    a: 'Yes. Anyone can check a few forwards a day without an account; sign in for more checks and your history.',
  },
  {
    q: 'How do you decide a verdict?',
    a: 'We only give a verdict when reliable sources support it: established news organisations, government sources or independent fact-checkers. Otherwise we say “Unverified”. Every report lists its sources and the tools used.',
  },
  {
    q: 'Where will my story be published?',
    a: 'On 5 high-DA portals from our publishing network, plus one Instagram post, as a collaboration post with you when you give your handle.',
  },
  {
    q: 'Is a paid story marked as sponsored?',
    a: 'Yes. Paid stories are published as sponsored content, as the law and the platforms require.',
  },
  {
    q: 'How fast is it, and what do I get?',
    a: 'Your story goes live within 24 hours of payment. You get a PDF delivery report with every live link.',
  },
];

// Landing (LLD §13): fact-check hero · where we look · how it works · publishing network · FAQ.
// Layout and type follow docs/DESIGN.md: left-aligned, ruled sections, real content only.
export default async function HomePage() {
  const db = await createServerSupabase();
  const me = await getCurrentUser().catch(() => null);
  const [catalogue, showcase] = await Promise.all([
    fetchCatalogue(db).catch(() => ({ packages: [], portals: [] })),
    db
      .from('showcase_stories')
      .select('id, title, portal_name, url, image_path')
      .eq('is_visible', true)
      .order('sort_order')
      .limit(6),
  ]);
  const pkg = catalogue.packages[0] ?? null;
  const supabaseUrl = publicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const portals = catalogue.portals.map((p) => ({
    name: p.name,
    domain: p.domain,
    homepageUrl: p.homepageUrl,
    logoPath: p.logoPath,
  }));

  return (
    <main className="flex flex-col">
      {/* Hero: the fact checker itself */}
      <section className="border-b border-hairline">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 pt-10 pb-14 sm:px-6 sm:pt-14 lg:grid-cols-12 lg:gap-16 lg:pb-20">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <h1 className="max-w-2xl font-display text-display-mobile text-ink md:text-display">
              Got a forward? Check it before you share it.
            </h1>
            <p className="max-w-xl text-body-lg text-body">
              {BRAND_NAME} checks WhatsApp forwards, links and screenshots against live news, Indian
              fact-checkers and official sources, and shows you every source it used.
            </p>
            <FactChecker
              siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL}
              signedIn={Boolean(me)}
              history={[]}
              compact
            />
          </div>
          <aside className="flex flex-col gap-5 lg:col-span-5 lg:border-l lg:border-hairline lg:pl-10">
            <h2 className="font-display text-headline-sm text-ink">How to read a verdict</h2>
            <dl className="flex flex-col divide-y divide-divider border-y border-hairline">
              {VERDICT_MEANINGS.map(([v, what]) => (
                <div key={v} className="flex flex-col gap-1 py-4">
                  <dt
                    className="flex items-center gap-2 text-label-md"
                    style={{ color: VERDICT_COLORS[v] }}
                  >
                    <Icon name={VERDICT_ICONS[v]} size={18} /> {FC_VERDICT_LABELS[v]}
                  </dt>
                  <dd className="text-body-sm text-body">{what}</dd>
                </div>
              ))}
            </dl>
            <p className="text-body-sm text-slate">
              We only give a verdict when reliable sources support it. Otherwise the answer is
              Unverified.{' '}
              <Link href="/methodology" className="text-brand underline">
                Our methodology
              </Link>
            </p>
          </aside>
        </div>
      </section>

      {/* Where we look */}
      <section className="border-b border-hairline bg-subtle">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6">
          <h2 className="text-label-md text-ink">Every check searches reporting from</h2>
          <SourceStrip supabaseUrl={supabaseUrl} />
        </div>
      </section>

      {/* How a check works */}
      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-5">
          <h2 className="font-display text-headline-lg-mobile text-ink sm:text-headline-lg">
            Evidence first. A verdict only when sources agree.
          </h2>
          <Link href="/methodology" className="text-label-md text-brand underline">
            Read our methodology
          </Link>
        </div>
        <ol className="flex flex-col divide-y divide-divider border-y border-hairline lg:col-span-7">
          {CHECK_STEPS.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-x-4 gap-y-1 py-5">
              <span className="font-display text-headline-sm text-slate">{i + 1}</span>
              <span className="text-label-md text-ink">{s.title}</span>
              <span className="col-start-2 text-body-md text-body">{s.body}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Publishing network */}
      <section className="border-y border-hairline bg-subtle">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
            <div className="flex flex-col gap-4 lg:col-span-7">
              <p className="text-label-sm text-slate">Publish your story</p>
              <h2 className="font-display text-headline-lg-mobile text-ink sm:text-headline-lg">
                Your news on {portals.length ? `${portals.length} ` : ''}news portals in our
                network.
              </h2>
              <p className="max-w-2xl text-body-lg text-body">
                Announcements, achievements, launches and local news: written by you, published by
                our editorial team across our network of regional and national portals, with an
                Instagram post.
              </p>
            </div>
            {pkg ? (
              <div className="flex flex-col gap-4 rounded-lg border border-hairline bg-paper p-6 lg:col-span-5">
                <div className="flex items-baseline justify-between gap-4 border-b border-divider pb-4">
                  <div>
                    <p className="text-label-md text-ink">{pkg.name}</p>
                    <p className="text-body-sm text-slate">Inclusive of all taxes</p>
                  </div>
                  <p className="tabular font-display text-headline-md text-ink">
                    {formatMoney(pkg.priceInrPaise, 'INR')}
                  </p>
                </div>
                <ul className="flex flex-col gap-2 text-body-sm text-body">
                  <li className="flex items-center gap-2">
                    <Icon name="check" size={18} className="text-slate" />
                    {pkg.portalCount} high-DA news portals
                  </li>
                  {pkg.includesInstagram ? (
                    <li className="flex items-center gap-2">
                      <Icon name="check" size={18} className="text-slate" />1 Instagram
                      collaboration post
                    </li>
                  ) : null}
                  <li className="flex items-center gap-2">
                    <Icon name="check" size={18} className="text-slate" />
                    Live within {pkg.turnaroundHours} hours
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon name="check" size={18} className="text-slate" />
                    PDF report with every live link
                  </li>
                </ul>
                <Link href="/publish" className={buttonVariants({ variant: 'accent', size: 'lg' })}>
                  Publish your story <Icon name="arrow_forward" />
                </Link>
              </div>
            ) : null}
          </div>
          {portals.length ? (
            <div className="flex flex-col gap-4">
              <h3 className="text-label-md text-ink">Our publishing network</h3>
              <PortalWall portals={portals} supabaseUrl={supabaseUrl} />
            </div>
          ) : null}
        </div>
      </section>

      {/* Stories we've carried (admin showcase) */}
      {showcase.data?.length ? (
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="border-b border-hairline pb-3 font-display text-headline-md text-ink">
            Recently published
          </h2>
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {showcase.data.map((s) => (
              <li key={s.id}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer sponsored"
                  className="group flex h-full flex-col gap-3"
                >
                  {s.image_path ? (
                    // eslint-disable-next-line @next/next/no-img-element -- public bucket asset
                    <img
                      src={publicAssetUrl(supabaseUrl, s.image_path)}
                      alt=""
                      loading="lazy"
                      className="aspect-video w-full rounded-md object-cover"
                    />
                  ) : null}
                  <span className="text-label-sm text-slate">{s.portal_name}</span>
                  <span className="font-display text-headline-sm text-ink group-hover:underline">
                    {s.title}
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1 text-label-sm text-brand">
                    Read on {s.portal_name} <Icon name="north_east" size={14} />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* How publishing works */}
      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-5">
          <h2 className="font-display text-headline-lg-mobile text-ink sm:text-headline-lg">
            From your draft to live links in 24 hours.
          </h2>
          <p className="text-body-md text-body">
            A person on our editorial team reads every story before it goes out. Paid stories are
            marked as sponsored.
          </p>
        </div>
        <ol className="flex flex-col divide-y divide-divider border-y border-hairline lg:col-span-7">
          {PUBLISH_STEPS.map((step, i) => (
            <li key={step} className="grid grid-cols-[2rem_1fr] gap-x-4 py-4">
              <span className="font-display text-headline-sm text-slate">{i + 1}</span>
              <span className="text-body-md text-body">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section className="border-t border-hairline bg-subtle">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12">
          <h2 className="font-display text-headline-md text-ink lg:col-span-5">
            Questions people ask
          </h2>
          <div className="flex flex-col divide-y divide-hairline border-y border-hairline lg:col-span-7">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-label-md text-ink">
                  {f.q}
                  <Icon
                    name="add"
                    size={20}
                    className="shrink-0 text-slate transition-transform group-open:rotate-45"
                  />
                </summary>
                <p className="pb-4 text-body-md text-body">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="border-t border-hairline">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-xl flex-col gap-2">
            <h2 className="font-display text-headline-md text-ink">Ready to publish your story?</h2>
            <p className="text-body-md text-body">
              Write it, add a photo and pay
              {pkg ? ` ${formatMoney(pkg.priceInrPaise, 'INR')}` : ''}. Live within 24 hours, with a
              PDF report of every link.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/publish" className={buttonVariants({ variant: 'accent', size: 'lg' })}>
              Publish your story <Icon name="arrow_forward" />
            </Link>
            <Link href="/fact-check" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Check a forward
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
