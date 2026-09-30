import type { Metadata } from 'next';
import { BRAND_NAME } from '@prapp/shared';
import { Badge, Page } from '@/components/ui';

export const metadata: Metadata = { title: `Privacy · ${BRAND_NAME}` };

// LLD §13 / §15: data collected, AI providers, retention, deletion.
// DECISION: placeholder text covering the required points; have it reviewed before launch.
export default function PrivacyPage() {
  return (
    <Page
      width="md"
      className="gap-4! text-body-md text-body [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-headline-sm [&_h2]:text-ink"
    >
      <h1 className="font-display text-headline-lg-mobile text-ink sm:text-headline-lg">
        Privacy policy
      </h1>
      <Badge variant="warn" className="self-start">
        Draft · to be reviewed before launch
      </Badge>
      <h2>What we collect</h2>
      <p>
        Your name, email and phone number; stories and images you submit for publishing; messages,
        links and screenshots you submit for fact checking; payment status from Razorpay (never your
        card or UPI details); and push-notification tokens for the app. Guests are identified by a
        random device id.
      </p>
      <h2>AI processing</h2>
      <p>
        Fact-check inputs are processed by third-party AI and search providers (for example Google
        Gemini and, as fallbacks, other AI providers). Free tiers of these services may use inputs
        to improve their models. Do not submit private or sensitive personal information for fact
        checking.
      </p>
      <h2>Retention</h2>
      <p>
        Screenshots uploaded for fact checks are deleted after 30 days. Unpaid drafts untouched for
        7 days are deleted. Order records, images and publication reports are kept for our business
        records.
      </p>
      <h2>Deleting your account</h2>
      <p>
        You can delete your account from the Account page once you have no active order. We delete
        your profile, notifications, devices and fact-check uploads. Order records keep the contact
        details given at purchase.
      </p>
    </Page>
  );
}
