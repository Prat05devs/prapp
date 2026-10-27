import { JsonLd } from '@/components/site/json-ld';
import { organizationSchema, pageMetadata, SITE_DESCRIPTION, siteUrl } from '@/lib/seo';
import Link from 'next/link';
import { fetchCatalogue } from '@prapp/api-client';
import {
  BRAND_DESCRIPTOR,
  BRAND_LINE,
  FC_VERDICT_LABELS,
  FACT_CHECK_CAMPAIGN,
  STORY_CAMPAIGNS,
  SPONSORED_DISCLOSURE,
  TRUST_LINE,
  formatMoney,
  offerChannels,
  offerLine,
  offerPrice,
  publicAssetUrl,
} from '@prapp/shared';
import { Icon } from '@/components/icon';
import { PortalWall } from '@/components/site/portal-wall';
import { SourceStrip } from '@/components/site/source-strip';
import { CampaignImage } from '@/components/site/campaign-image';
import { StoryCampaigns } from '@/components/site/story-campaigns';
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

export const metadata = pageMetadata(
  '/',
  'Fact Checker & Self-Service PR in India',
  SITE_DESCRIPTION,
);

// Copy follows VERBAL_SYSTEM.md §11 (homepage) and §7 (messaging pillars).
const CHECK_STEPS = [
  {
    title: 'Paste the claim, link or screenshot',
    body: 'A WhatsApp forward or social post, in English, Hindi or another Indian language.',
  },
  {
    title: 'Review the verdict and evidence',
    body: 'We search recognised fact-checkers, live reporting and official sources, then show you what supports the claim and what contradicts it.',
  },
  {
    title: 'Share the result',
    body: 'Send it as a link, an image or a PDF, with the sources attached.',
  },
];

const PUBLISH_STEPS = [
  'Write your story and add 1–2 supporting images.',
  'Add an Instagram handle to tag or invite for collaboration (optional).',
  'Review your package and pay online.',
  'Our editorial team reviews your story. Once approved, we publish it and send you a PDF report with every live link.',
];

const FAQ = [
  {
    q: 'Is the fact checker free?',
    a: 'Yes. You can check a few claims a day without an account. Log in to keep checking and to see your history.',
  },
  {
    q: 'How do you decide a verdict?',
    a: 'Every verdict comes with its sources: recognised fact-checkers, established news organisations and official sources. When the evidence is insufficient, we say so and mark the claim Unverified. Every report lists its sources and the tools used.',
  },
  {
    q: 'Where will my story be published?',
    a: 'Across the news portals and social pages included in your package. Our team selects suitable available portals from the NewsVio network for your story, and the final inclusions are shown before you pay.',
  },
  {
    q: 'Is a paid story marked as sponsored?',
    a: 'Yes. Every paid story must pass editorial review and is published as sponsored content. Paid publishing never influences a fact-check verdict.',
  },
  {
    q: 'How fast is it, and what do I get?',
    a: 'Approved stories go live within 24 hours of payment. You get a PDF delivery report with every live link. We do not guarantee reach, rankings, sales or followers.',
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
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            organizationSchema(),
            {
              '@type': 'WebSite',
              '@id': siteUrl('/#website'),
              name: 'NewsVio',
              url: siteUrl(),
              description: SITE_DESCRIPTION,
              publisher: { '@id': siteUrl('/#organization') },
              inLanguage: 'en-IN',
            },
          ],
        }}
      />
      {/* Hero: the fact checker itself */}
      <section className="border-b border-hairline">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 pt-10 pb-14 sm:px-6 sm:pt-14 lg:grid-cols-12 lg:gap-16 lg:pb-20">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <p className="text-label-md text-slate">{BRAND_DESCRIPTOR}</p>
            <h1 className="max-w-2xl font-display text-display-mobile text-ink md:text-display">
              {BRAND_LINE}
            </h1>
            <p className="max-w-xl text-body-lg text-body">
              Check a WhatsApp forward, link or screenshot against reliable sources. Or publish your
              own story across the NewsVio news and social network
              {pkg ? `, starting at ${offerPrice(pkg)}` : ''}.
            </p>
            <FactChecker
              siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL}
              signedIn={Boolean(me)}
              history={[]}
              compact
            />
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href="/publish" className="text-label-md text-brand underline">
                Publish your story
              </Link>
              <p className="text-body-sm text-slate">{TRUST_LINE}</p>
            </div>
          </div>
          <aside className="flex flex-col gap-5 lg:col-span-5 lg:border-l lg:border-hairline lg:pl-10">
            <CampaignImage campaign={FACT_CHECK_CAMPAIGN} sizes="(max-width: 1023px) 100vw, 40vw" />
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
              Verdicts express the strength of the available evidence, not absolute certainty. When
              the evidence is insufficient, we say so.{' '}
              <Link href="/methodology" className="text-brand underline">
                How we check
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
            Before you forward it, check it.
          </h2>
          <p className="text-body-md text-body">
            Paste text, add a link or upload a screenshot. NewsVio searches recognised
            fact-checkers, live reporting and official sources, then shows you the evidence it
            found.
          </p>
          <Link href="/methodology" className="text-label-md text-brand underline">
            How we check
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
              <CampaignImage campaign={STORY_CAMPAIGNS[0]} />
              <p className="text-label-sm text-slate">Do your own PR</p>
              <h2 className="font-display text-headline-lg-mobile text-ink sm:text-headline-lg">
                {pkg
                  ? `Put your story in the news from ${offerPrice(pkg)}.`
                  : 'Put your story in the news.'}
              </h2>
              <p className="max-w-2xl text-body-lg text-body">
                Launched a business, opened a hotel, achieved a milestone or organised an event?
                Write your story, add 1–2 images and submit it for editorial review. We handle
                publication and send you the live links.
              </p>
            </div>
            {pkg ? (
              <div className="flex flex-col gap-4 rounded-lg border border-hairline bg-paper p-6 lg:col-span-5">
                <div className="flex items-baseline justify-between gap-4 border-b border-divider pb-4">
                  <div>
                    <p className="text-label-md text-ink">{pkg.name}</p>
                    <p className="text-body-sm text-slate">GST included</p>
                  </div>
                  <p className="tabular font-display text-headline-md text-ink">
                    {formatMoney(pkg.priceInrPaise, 'INR')}
                  </p>
                </div>
                <ul className="flex flex-col gap-2 text-body-sm text-body">
                  {[
                    ...offerChannels(pkg),
                    'Editorial review',
                    `Live within ${pkg.turnaroundHours} hours of payment, once approved`,
                    'PDF delivery report with live links',
                  ].map((line) => (
                    <li key={line} className="flex items-center gap-2">
                      <Icon name="check" size={18} className="text-slate" />
                      {line}
                    </li>
                  ))}
                </ul>
                <Link href="/publish" className={buttonVariants({ variant: 'accent', size: 'lg' })}>
                  Publish my story <Icon name="arrow_forward" />
                </Link>
                <p className="text-body-sm text-slate">
                  Need more portals or specific social pages?{' '}
                  <Link href="/support" className="text-brand underline">
                    Request a custom plan
                  </Link>
                </p>
                <p className="text-[12px] leading-4 text-slate">{SPONSORED_DISCLOSURE}</p>
              </div>
            ) : null}
          </div>
          {portals.length ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="font-display text-headline-sm text-ink">
                  One network. More places for your story.
                </h3>
                <p className="max-w-3xl text-body-md text-body">
                  NewsVio works with a growing network of {portals.length} regional and national
                  news portals. Your package sets the number of placements; our team selects
                  suitable available portals for your story.
                </p>
              </div>
              <PortalWall portals={portals} supabaseUrl={supabaseUrl} />
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <StoryCampaigns />
      </div>

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
                  <span className="text-label-sm text-slate">{s.portal_name} · Sponsored</span>
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
            Submitted by you. Reviewed by our editorial team.
          </h2>
          <p className="text-body-md text-body">
            One submission, multiple published links. Every paid story must pass editorial review
            and is published as sponsored content.
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
            <h2 className="font-display text-headline-md text-ink">Put your story in the news.</h2>
            <p className="text-body-md text-body">
              {pkg
                ? `${offerLine(pkg)} Subject to editorial approval, with a PDF report of every live link.`
                : 'Write your story, add 1–2 images and pay online. After editorial approval, we publish it and send you every live link.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/publish" className={buttonVariants({ variant: 'accent', size: 'lg' })}>
              Publish your story <Icon name="arrow_forward" />
            </Link>
            <Link href="/fact-check" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Check a claim
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
