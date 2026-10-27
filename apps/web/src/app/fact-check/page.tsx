import Link from 'next/link';
import { JsonLd } from '@/components/site/json-ld';
import { SearchFaq } from '@/components/site/search-faq';
import { FACT_CHECK_QUESTIONS } from '@/lib/search-content';
import { pageMetadata, serviceSchema } from '@/lib/seo';
import { Page, PageHeader } from '@/components/ui';
import { publicEnv } from '@/lib/env';
import { historyFor } from '@/server/fact-checks';
import { getCurrentUser } from '@/server/session';
import { createServiceClient } from '@/server/supabase/service';
import { FactChecker } from './fact-checker';

export const metadata = pageMetadata(
  '/fact-check',
  'Free WhatsApp Fact Checker in India',
  'Check a WhatsApp forward, news link or screenshot in Hindi or English. See the verdict, the evidence and every source, then share the result.',
);

export default async function FactCheckPage() {
  const me = await getCurrentUser().catch(() => null);
  const history = me ? await historyFor(createServiceClient(), me.id) : [];
  return (
    <Page width="md">
      <JsonLd
        data={serviceSchema(
          '/fact-check',
          'AI-assisted fact checking',
          'Check a claim against recognised fact-checkers, live reporting and official sources. Every verdict comes with its sources. Free within daily limits.',
        )}
      />
      <PageHeader
        eyebrow="Free fact-check"
        title="Before you forward it, check it."
        lede="Check a claim. See the evidence. Share the result."
      />
      <FactChecker
        siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL}
        signedIn={Boolean(me)}
        history={history}
      />
      <SearchFaq title="How to check a message before sharing" questions={FACT_CHECK_QUESTIONS} />
      <Link href="/methodology" className="text-label-md text-brand underline">
        How we check, and how to send a correction
      </Link>
    </Page>
  );
}
