import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND_NAME, FC_VERDICT_LABELS } from '@prapp/shared';
import { ReportView } from '@/components/fact-check/report-view';
import { Icon } from '@/components/icon';
import { LivePill, Page, buttonVariants } from '@/components/ui';
import { reportUrl } from '@/server/fc-assets';
import { loadPublicReport } from './load';
import { ShareBar } from './share-bar';

export async function generateMetadata({ params }: PageProps<'/r/[reportId]'>): Promise<Metadata> {
  const { reportId } = await params;
  const report = await loadPublicReport(reportId);
  const verdict = FC_VERDICT_LABELS[report.verdict ?? 'unverified'];
  const claim = report.claims[0]?.claimText ?? '';
  const title = `${verdict}: ${claim.slice(0, 80)}`;
  const description = report.summary ?? `Fact check by ${BRAND_NAME}`;
  const image = `${reportUrl(reportId)}/image.png`;
  // og:image gives WhatsApp a rich preview card (LLD §11.4).
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: reportUrl(reportId),
      images: [{ url: image, width: 1080, height: 1350 }],
      type: 'article',
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function PublicReportPage({ params }: PageProps<'/r/[reportId]'>) {
  const { reportId } = await params;
  const report = await loadPublicReport(reportId);
  const url = reportUrl(reportId);
  return (
    <Page width="md">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6">
        <LivePill>{BRAND_NAME} fact check</LivePill>
        <ShareBar
          url={url}
          title={`${FC_VERDICT_LABELS[report.verdict ?? 'unverified']} · ${BRAND_NAME} fact check`}
        />
      </div>
      <ReportView report={report} reportUrl={url} />
      <section className="flex flex-col gap-5 rounded-2xl bg-ink p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex flex-col gap-1">
          <p className="font-display text-headline-sm">Got another forward?</p>
          <p className="text-body-md text-white/70">
            Check a message, link or screenshot for free before you share it.
          </p>
        </div>
        <Link
          href="/fact-check"
          className={buttonVariants({ variant: 'accent', size: 'lg', className: 'shrink-0' })}
        >
          Check it <Icon name="arrow_forward" />
        </Link>
      </section>
    </Page>
  );
}
