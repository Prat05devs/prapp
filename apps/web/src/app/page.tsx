import Image from 'next/image';
import Link from 'next/link';
import { fetchCatalogue } from '@prapp/api-client';
import { BRAND_NAME, formatMoney, publicAssetUrl } from '@prapp/shared';
import { Icon } from '@/components/icon';
import { PortalWall } from '@/components/site/portal-wall';
import { SourceStrip } from '@/components/site/source-strip';
import { Badge, Eyebrow, buttonVariants } from '@/components/ui';
import { publicEnv } from '@/lib/env';
import { createServerSupabase } from '@/server/supabase/server';
import { FactChecker } from './fact-check/fact-checker';

const CHECK_STEPS = [
  {
    icon: 'content_copy' as const,
    title: 'Paste it',
    body: 'A WhatsApp forward, a link or a screenshot, in English, Hindi or another Indian language.',
  },
  {
    icon: 'fact_check' as const,
    title: 'We search the evidence',
    body: 'Existing fact checks, live news coverage from Indian and international outlets, and official sources.',
  },
  {
    icon: 'verified' as const,
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

// Landing (LLD §13): fact-check hero · where we look · publishing network · how it works · FAQ.
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
      <section className="relative overflow-hidden border-b border-hairline">
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[28rem] w-[60rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-emerald-soft/30 via-subtle/20 to-transparent blur-3xl" />
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 pt-12 pb-14 sm:px-6 sm:pt-16 lg:grid-cols-12 lg:gap-14 lg:pb-20">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <h1 className="font-display text-display-mobile text-ink md:text-display">
              Got a forward?{' '}
              <span className="text-emerald-strong">Check it before you share it.</span>
            </h1>
            <p className="max-w-xl text-body-lg text-slate">
              {BRAND_NAME} checks WhatsApp forwards, links and screenshots against live news, Indian
              fact-checkers and official sources, in seconds.
            </p>
            <FactChecker
              siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL}
              signedIn={false}
              history={[]}
              compact
            />
          </div>
          <div className="relative hidden lg:col-span-5 lg:block">
            <div className="relative overflow-hidden rounded-3xl border border-hairline shadow-xl">
              <Image
                src="/home/desk-uttarakhand.webp"
                alt="A reporter checking a story on a laptop in a newsroom in the hills"
                width={1408}
                height={768}
                priority
                className="aspect-[4/5] w-full object-cover"
              />
              <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-ink/75 to-transparent p-5 pb-16">
                <p className="font-mono text-label-sm text-emerald-soft uppercase">
                  Built in Uttarakhand
                </p>
                <p className="text-body-md text-white">
                  Fact checks and local publishing for India.
                </p>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-8 w-72 rounded-2xl border border-hairline bg-canvas p-4 shadow-lg">
              <p className="font-mono text-[10px] tracking-wider text-faint uppercase">
                Example verdict
              </p>
              <p className="mt-1 flex items-center gap-2 text-label-md text-ink">
                <span className="h-2 w-2 rounded-full bg-emerald" /> Likely true · high confidence
              </p>
              <p className="mt-1 text-body-sm text-slate">
                Reported by several national outlets, each linked in the report.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Where we look */}
      <section className="bg-subtle">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 px-4 py-12 sm:px-6">
          <Eyebrow>Every check searches reporting from</Eyebrow>
          <SourceStrip supabaseUrl={supabaseUrl} />
        </div>
      </section>

      {/* How a check works */}
      <section className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
        <div className="relative order-last overflow-hidden rounded-3xl border border-hairline lg:order-first">
          <Image
            src="/home/newsroom.webp"
            alt="A newsroom desk with live news screens"
            width={1408}
            height={768}
            className="aspect-[16/10] w-full object-cover"
          />
        </div>
        <div className="flex flex-col gap-6">
          <Eyebrow accent>How fact checking works</Eyebrow>
          <h2 className="font-display text-headline-lg-mobile text-ink sm:text-headline-lg">
            Evidence first. A verdict only when sources agree.
          </h2>
          <ol className="flex flex-col gap-4">
            {CHECK_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4 rounded-2xl border border-hairline p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-soft/30 text-emerald-strong">
                  <Icon name={s.icon} />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-label-md text-ink">
                    <span className="mr-2 font-mono text-code text-faint">0{i + 1}</span>
                    {s.title}
                  </span>
                  <span className="text-body-sm text-slate">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <Link href="/methodology" className="text-label-md text-emerald-strong hover:underline">
            Read our methodology <Icon name="arrow_forward" size={16} />
          </Link>
        </div>
      </section>

      {/* Publishing network */}
      <section className="border-y border-hairline bg-subtle">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="flex flex-col gap-4 lg:col-span-7">
              <Eyebrow accent>Publish your story</Eyebrow>
              <h2 className="font-display text-headline-lg-mobile text-ink sm:text-headline-lg">
                Your news on {portals.length ? `${portals.length} ` : ''}news portals in our
                network.
              </h2>
              <p className="text-body-lg text-slate">
                Announcements, achievements, launches and local news: written by you, published by
                our editorial team across our network of regional and national portals, with an
                Instagram post.
              </p>
            </div>
            {pkg ? (
              <div className="flex flex-col gap-4 rounded-2xl border border-ink bg-canvas p-6 shadow-sm lg:col-span-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-label-md text-ink">{pkg.name}</p>
                    <p className="text-body-sm text-slate">Inclusive of all taxes</p>
                  </div>
                  <p className="font-display text-headline-md text-ink">
                    {formatMoney(pkg.priceInrPaise, 'INR')}
                  </p>
                </div>
                <ul className="flex flex-col gap-2 text-body-sm text-body">
                  <li className="flex items-center gap-2">
                    <Icon name="check_circle" size={18} className="text-emerald-strong" />
                    {pkg.portalCount} high-DA news portals
                  </li>
                  {pkg.includesInstagram ? (
                    <li className="flex items-center gap-2">
                      <Icon name="check_circle" size={18} className="text-emerald-strong" />1
                      Instagram collaboration post
                    </li>
                  ) : null}
                  <li className="flex items-center gap-2">
                    <Icon name="check_circle" size={18} className="text-emerald-strong" />
                    Live within {pkg.turnaroundHours} hours
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon name="check_circle" size={18} className="text-emerald-strong" />
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
              <Eyebrow>Our publishing network</Eyebrow>
              <PortalWall portals={portals} supabaseUrl={supabaseUrl} />
            </div>
          ) : null}
        </div>
      </section>

      {/* Stories we've carried (admin showcase) */}
      {showcase.data?.length ? (
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-16 sm:px-6 sm:py-20">
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
                      src={publicAssetUrl(supabaseUrl, s.image_path)}
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

      {/* How publishing works */}
      <section className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Eyebrow accent>How publishing works</Eyebrow>
          <h2 className="font-display text-headline-lg-mobile text-ink sm:text-headline-lg">
            From your draft to live links in 24 hours.
          </h2>
          <ol className="flex flex-col divide-y divide-divider rounded-2xl border border-hairline">
            {PUBLISH_STEPS.map((step, i) => (
              <li key={step} className="flex gap-4 p-4">
                <span className="font-mono text-code text-emerald-strong">0{i + 1}</span>
                <span className="text-body-md text-body">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Image
            src="/home/publishing-desk.webp"
            alt="Our team reviewing a story before publishing"
            width={1408}
            height={768}
            className="col-span-2 aspect-[16/9] w-full rounded-3xl border border-hairline object-cover"
          />
          <Image
            src="/home/screens.webp"
            alt="Editors tracking stories on large screens"
            width={1408}
            height={768}
            className="aspect-[4/3] w-full rounded-2xl border border-hairline object-cover"
          />
          <Image
            src="/home/team.webp"
            alt="Our editorial team at work"
            width={1408}
            height={768}
            className="aspect-[4/3] w-full rounded-2xl border border-hairline object-cover"
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-hairline bg-subtle">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-col items-center gap-2 text-center">
            <Eyebrow accent>Questions</Eyebrow>
            <h2 className="font-display text-headline-md text-ink">Frequently asked</h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-hairline bg-canvas p-5 open:border-ink"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-label-md text-ink">
                  {f.q}
                  <Icon
                    name="arrow_forward"
                    size={18}
                    className="shrink-0 text-faint transition-transform group-open:rotate-90"
                  />
                </summary>
                <p className="pt-3 text-body-md text-body">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex flex-col gap-6 rounded-3xl bg-ink p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-xl flex-col gap-3">
            <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 px-3 py-1 font-mono text-label-sm text-emerald-soft uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald" /> Live within 24 hours
            </span>
            <h2 className="font-display text-headline-md sm:text-headline-lg">
              Ready to publish your story?
            </h2>
            <p className="text-body-md text-white/70">
              Write it, add a photo and pay
              {pkg ? ` ${formatMoney(pkg.priceInrPaise, 'INR')}` : ''}. You get a PDF report with
              every live link.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/publish" className={buttonVariants({ variant: 'accent', size: 'lg' })}>
              Publish your story <Icon name="arrow_forward" />
            </Link>
            <Link
              href="/fact-check"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-white/20 px-6 text-label-md font-medium text-white transition-colors hover:border-white"
            >
              Check a forward
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
