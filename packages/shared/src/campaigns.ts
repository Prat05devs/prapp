/** Client-supplied campaign scenes, not customer testimonials or published stories. */
export const STORY_CAMPAIGNS = [
  {
    id: '01-business-launch',
    /** the Publish screen's "What's your story?" slide */
    prompt: 'Launching a business?',
    title: 'Your new beginning deserves to be seen.',
    body: 'Launching a business? Turn your announcement into published coverage through the NewsVio network.',
    cta: 'Publish your story',
    alt: 'Indian founders opening their local-products shop in Dehradun.',
  },
  {
    id: '02-cafe-event',
    /** the Publish screen's "What's your story?" slide */
    prompt: 'Hosting an event?',
    title: 'Turn your event into a story.',
    body: 'Share what is happening, where it is happening and why people should know about it.',
    cta: 'Publish your event story',
    alt: 'A café owner preparing an acoustic event in a Dehradun café.',
  },
  {
    id: '03-home-business',
    /** the Publish screen's "What's your story?" slide */
    prompt: 'Running a business from home?',
    title: 'Built from home. Ready for the city.',
    body: 'Put your growing business in the news. Choose your package and see the full price before you pay.',
    cta: 'Start your story',
    alt: 'An Indian home baker packing products while an assistant photographs them.',
  },
  {
    id: '04-citizen-story',
    /** the Publish screen's "What's your story?" slide */
    prompt: 'A problem in your area?',
    title: 'Some local stories need public attention.',
    body: 'Share an incident, concern or community issue that deserves to be heard.',
    cta: 'Tell your story',
    alt: 'Dehradun residents documenting a waterlogged road and damaged drain.',
  },
  {
    id: '05-human-interest',
    /** the Publish screen's "What's your story?" slide */
    prompt: 'An achievement to share?',
    title: 'A journey worth sharing.',
    body: 'Turn a personal milestone, achievement or inspiring experience into a story people can discover.',
    cta: 'Share your achievement',
    alt: 'An Indian para-athlete speaking with her coach at a Dehradun sports ground.',
  },
] as const;

export const FACT_CHECK_CAMPAIGN = {
  id: '06-family-fact-check',
  title: 'Before you forward it, check it.',
  body: 'Check a message, link or screenshot against reliable sources—and share the evidence.',
  cta: 'Check a claim',
  alt: 'An Indian family reviewing a forwarded message together on a phone.',
} as const;

export type Campaign = (typeof STORY_CAMPAIGNS)[number] | typeof FACT_CHECK_CAMPAIGN;
