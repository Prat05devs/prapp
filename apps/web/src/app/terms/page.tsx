import type { Metadata } from 'next';
import { BRAND_NAME } from '@prapp/shared';
import { Badge, Page } from '@/components/ui';

export const metadata: Metadata = { title: `Terms · ${BRAND_NAME}` };

// DECISION: placeholder terms covering what the product does; replace with lawyer-reviewed text before launch.
export default function TermsPage() {
  return (
    <Page
      width="md"
      className="gap-4! text-body-md text-body [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-headline-sm [&_h2]:text-ink"
    >
      <h1 className="font-display text-headline-lg-mobile text-ink sm:text-headline-lg">
        Terms of use
      </h1>
      <Badge variant="warn" className="self-start">
        Draft · to be reviewed before launch
      </Badge>
      <h2>Fact checks</h2>
      <p>
        Fact checks are AI-assisted analyses of publicly available sources at the time of checking.
        They are not an official or legal determination. Each report lists its sources and the tools
        used so you can verify it.
      </p>
      <h2>Publishing your story</h2>
      <p>
        You confirm the content you submit is yours and accurate. Stories are published as sponsored
        content on our partner portals and our Instagram news page, usually within 24 hours of
        payment. We may ask for changes, or reject content we cannot publish; rejected orders are
        refunded in full.
      </p>
      <h2>Payments and refunds</h2>
      <p>
        Payments are processed by Razorpay. Prices include all taxes. Refunds take 5–7 working days
        to reach your bank. If a portal cannot carry your story and no replacement is available, we
        refund the undelivered part.
      </p>
      <h2>Your account</h2>
      <p>You can delete your account from the Account page once you have no active order.</p>
    </Page>
  );
}
