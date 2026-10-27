import Link from 'next/link';
import { STORY_CAMPAIGNS } from '@prapp/shared';
import { CampaignImage } from './campaign-image';

/** Illustrative publishing use cases, deliberately separate from the live-story showcase. */
export function StoryCampaigns() {
  return (
    <section className="flex flex-col gap-6" aria-labelledby="story-ideas-title">
      <div className="flex flex-col gap-2 border-b border-hairline pb-4">
        <h2 id="story-ideas-title" className="font-display text-headline-md text-ink">
          Find your story
        </h2>
        <p className="max-w-2xl text-body-md text-body">
          A new beginning, a local concern or a personal milestone. These are some of the stories
          you can share through sponsored publishing, subject to editorial review.
        </p>
      </div>
      <ul className="grid gap-x-8 gap-y-10 md:grid-cols-2">
        {STORY_CAMPAIGNS.slice(1).map((campaign) => (
          <li key={campaign.id} className="flex flex-col gap-3">
            <CampaignImage campaign={campaign} />
            <h3 className="font-display text-headline-sm text-ink">{campaign.title}</h3>
            <p className="text-body-md text-body">{campaign.body}</p>
            <Link
              href="/publish"
              className="mt-auto inline-flex min-h-11 items-center self-start text-label-md text-brand underline underline-offset-4"
            >
              {campaign.cta}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
