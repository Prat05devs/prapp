import { pageMetadata } from '@/lib/seo';
import { Badge, Page } from '@/components/ui';

export const metadata = pageMetadata(
  '/terms',
  'Terms of Use',
  'Read NewsVio’s terms for AI-assisted fact checking, sponsored PR publishing, payments, refunds and accounts.',
);

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
        You confirm that the information you submit is accurate to the best of your knowledge and
        that you have permission to use the images. Every story is reviewed by our editorial team
        before publication. Approved stories are published as sponsored content on the news portals,
        Instagram page and Facebook page included in your package, within 24 hours of payment. Our
        team selects suitable available portals from our network. We may ask for changes, or decline
        content we cannot publish; declined orders are refunded in full. Publication does not
        guarantee reach, search rankings, sales or followers, and is not an endorsement by a portal
        or journalist.
      </p>
      <h2>Payments and refunds</h2>
      <p>
        Payments are processed by Razorpay. Prices include GST. Refunds take 5–7 working days to
        reach your bank. If a portal cannot carry your story and no replacement is available, we
        refund the undelivered part.
      </p>
      <h2>Your account</h2>
      <p>You can delete your account from the Account page once you have no active order.</p>
    </Page>
  );
}
