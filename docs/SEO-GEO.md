# NewsVio SEO and generative search plan

Research and implementation: 4 October 2026. Target: India; local expansion begins with Dehradun/Uttarakhand, as specified in CONTEXT.md. Keyword candidates below are based on product fit and public search research, **not measured search volumes or difficulty scores**.

## Positioning

NewsVio has two distinct intents: free AI-assisted fact checking with linked evidence, and self-service sponsored PR publishing through its news portal and Instagram network. Keep these distinct in titles, navigation, claims and attribution. A paid story is not independent earned coverage or a purchased fact-check verdict.

The primary service descriptions are “free WhatsApp fact checker in India” and “self-service PR and news portal publishing in India.” Use natural synonyms in useful answers. Do not add keyword lists to page footers, keyword meta tags, hidden text, manufactured reviews, unverified reach claims or near-identical city pages.

## Implemented in the application

- Unique titles, descriptions, canonical URLs, Open Graph and Twitter cards for all seven public landing/information routes.
- A branded 1200 × 630 PNG at `/social-image`; existing fact-check report cards remain report-specific.
- `/sitemap.xml` containing only curated public pages, without invented update dates. Automated customer reports and private routes are not enumerated.
- `/robots.txt` allows public crawling and points to the sitemap. API/auth paths are excluded. Login, account, orders, admin, checkout, API and auth responses carry `X-Robots-Tag: noindex, nofollow`. Authentication remains the actual access control.
- Organization and WebSite JSON-LD on the homepage; Service JSON-LD on the two service pages. Script serialization escapes HTML opening brackets.
- Search-focused headings, visible answers about fact checks and PR, stronger internal links, AI limitations and a correction contact route.
- Canonicals for public fact-check report pages, whose existing visibility checks remain intact.

Structured data describes visible content; it does not claim ratings, awards, customer counts, exact reach, accreditation, ownership of unverified social profiles or guaranteed placement outcomes. No automatic ClaimReview markup is added to AI-generated multi-claim reports. A reviewed claim needs a traceable origin, matching evidence and verdict, a correction process, and the applicable engine's eligibility requirements checked first. Exclusion from a sitemap is not noindex: existing public reports can still be discovered through shared links.

## Keyword and intent map

| Intent / target | Candidate searches and variations | Useful answer or proof |
| --- | --- | --- |
| Homepage `/` | NewsVio; NewsVio fact checker; NewsVio PR; fact checking and PR app India | Concise explanation of the two services, direct links to each |
| Fact checker `/fact-check` | free fact checker India; online fact checker; AI fact checker India; WhatsApp fact checker; WhatsApp forward verification; check viral message; verify news online; fake news checker India | Inputs accepted, linked evidence, limitations and daily limits |
| Hindi and screenshots `/fact-check` | Hindi fact check; Hindi WhatsApp message verification; screenshot fact checker; check viral screenshot; news link verification | Actual language/input support; do not imply image forensics or deepfake detection |
| Fact-check education `/methodology` | how to verify a WhatsApp forward; how to check if news is true; reliable fact-check sources India; what does unverified mean; AI fact-check accuracy | Source selection, tool disclosure, verdict meanings, corrections |
| PR transaction `/publish` | self-service PR India; do your own PR; DIY PR India; online PR publishing; publish my story online; news portal publishing India; press release distribution India; paid news article publishing | Current packages, named network, editorial process, sponsored disclosure |
| PR price `/publish` | affordable PR India; PR publishing cost India; news portal publishing price; press release distribution packages; low-cost PR for small business | Live prices and inclusions from the catalogue; do not put stale prices in metadata |
| Instagram `/publish` | Instagram collaboration post; Instagram news page promotion; PR with Instagram promotion; news portal and Instagram package; promote business on Instagram news page | Package inclusion, handle submission, example live posts; distinguish audience size from actual reach |
| Network quality `/publish` | high-DA news portals; publish on high domain authority websites; news portal PR network India | Named portals, dated third-party metric source, relevant audience and sponsored-link policy |
| Startup / business `/publish` | startup PR India; small business PR; product launch press release; founder announcement PR; business launch news publishing | Verified example stories, writing checklist, clear eligibility |
| Personal / event `/publish` | personal branding PR India; publish achievement in news; event announcement publishing; local business publicity | Suitable use cases without guaranteed reputation or popularity claims |
| Local future content | PR publishing Dehradun; Uttarakhand news portal publishing; local business PR Dehradun | Only create a dedicated page with real local portals, original examples and genuinely different information |
| Hindi future content | व्हाट्सएप मैसेज की सच्चाई कैसे जांचें; फैक्ट चेक ऑनलाइन; अपनी खबर कैसे प्रकाशित करें; प्रेस रिलीज वितरण भारत | Native-reviewed Hindi content; do not add hreflang until translated pages actually exist |

Combinations to test: **service + India**, **service + audience**, **service + price**, **service + input**, **service + desired publication**, **how + task**. For example: “PR publishing for startups in India,” “check a Hindi WhatsApp screenshot,” “news portal publishing with Instagram collaboration,” and “how to publish a business announcement online.” Map related combinations to a strong page rather than generating one thin page per phrase.

## Research findings and their implications

Google's [generative AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) prioritizes ordinary SEO foundations and original, useful content. It specifically discourages chasing special GEO hacks and unnecessary AI text files. Therefore no `llms.txt` ranking mechanism or unsupported AI-ranking claims are added.

[Google's spam policies](https://developers.google.com/search/docs/essentials/spam-policies) describe keyword stuffing, link spam, scaled low-value content and site reputation abuse. [Paid-link guidance](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links) calls for sponsored link qualification. PR should be sold for transparent distribution and audience relevance, not as a purchase of search ranking credit. A large distribution network alone does not demonstrate independent authority or actual impressions.

[Google's ClaimReview documentation](https://developers.google.com/search/docs/appearance/structured-data/factcheck) requires content/markup consistency, source traceability and a correction mechanism. Treat schema eligibility as a separate editorial check, not something every automated report receives by default. FAQ copy is for readers; no FAQ rich-result promise is made.

[Bing's AI performance documentation](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c) describes tracking citations and grounding queries. Measure actual visibility rather than treating a crawler visit as proof of an AI recommendation.

[India PR Distribution](https://www.indiaprdistribution.com/) is a market vocabulary reference for press release distribution and national/regional media intent. Its claims are its own: do not borrow its network, journalist outreach, print/TV coverage or metrics for NewsVio. NewsVio's implemented workflow is editorial posting within its network.

## Evidence to collect before stronger marketing claims

For every portal: name, URL, ownership/relationship, audience geography and language, real sponsored sample, available placement terms, and the source/date of any DA score. For each Instagram account: handle, ownership, dated follower count, actual median reach across a stated sample period, and how that reach was measured. Do not equate followers with views or sum overlapping audiences as unique reach.

Add a named company/operator and editorial contacts once verified. Publish original case studies with client permission: goal, submission date, live publication links, measured outcomes and limitations. Do not invent customer testimonials or present sponsored articles as independent endorsements. Keep the fact-check evidence sources visually distinct from the paid publishing network.

## Editorial roadmap

1. A practical press release writing guide with an original annotated example, headline, supporting facts, quote, contact details and image permissions.
2. A PR package comparison guide explaining sponsored placements versus earned media, portal selection, turnaround, deliverables and refunds.
3. A WhatsApp verification walkthrough using a safe public example, source dates and original-context checks.
4. An Instagram collaboration guide explaining the submitted handle, collaboration acceptance, post format and realistic measurement.
5. Verified network profiles and customer case studies, then local pages only when enough original evidence exists.

Each article should identify its real author/reviewer, link primary sources, state genuine publication/update dates and link to the appropriate service page. Do not mass-publish automated claim pages to manufacture traffic. The current task enhances existing pages; these new editorial pieces require original evidence and are not presented as already published.

## Deployment and measurement checklist

1. Deploy the reviewed change to the existing Next.js host. Confirm `NEXT_PUBLIC_SITE_URL=https://newsvio.in` in production; use one canonical host and redirect alternatives. Preview hosts must be protected or noindexed by the hosting layer.
2. Fetch all seven public routes as a signed-out crawler: verify 200 responses, canonical host/path, page-specific title, visible content and no accidental noindex. Fetch `/robots.txt`, `/sitemap.xml`, `/social-image`, a valid public report, and login/account/payment routes. Verify private report IDs still return 404.
3. Verify domain ownership in Google Search Console and Bing Webmaster Tools with the owner's accounts/DNS. Submit `https://newsvio.in/sitemap.xml`; inspect homepage, fact checker, publishing and methodology. No account verification or sitemap submission has been performed by this code change.
4. Inspect JSON-LD with Schema.org Validator and use engine-specific validators for supported rich results. Test social cards in actual sharing tools. Check hosting/WAF rules allow legitimate search crawlers; `robots.txt` alone cannot override a firewall.
5. Run PageSpeed Insights on the deployed mobile routes. Record LCP, INP and CLS and fix measured bottlenecks. Local compilation is not a field performance audit.
6. Record weekly: indexed pages, non-branded impressions/clicks by intent, query-to-page matches, successful fact checks, PR form starts, paid orders and conversion rate. Add analytics only with the site's consent/privacy requirements and avoid sending submitted claims or personal information to analytics.
7. Track generative search citations using available Google/Bing reporting and a monthly prompt sample: “How can I check a Hindi WhatsApp forward?”, “How can a small business publish a story in India?”, “PR packages with Instagram collaboration”, and “How do I compare high-DA news portals?” Record date, engine, location, cited URL and answer accuracy. Results vary and cannot be guaranteed.

The public-domain fetch failed in the research tool during this task. Live crawlability, current search rankings, verified network metrics and analytics access were not established. Implementation and local verification are separate from deployment and observed ranking/citation improvement.

## Local verification results

- `pnpm lint`, `pnpm typecheck` and `pnpm test` pass using installed Node 24. The lint run retains one pre-existing mobile warning; web lint is clean. The web suite has 21 passing tests, including canonical/discovery and safe JSON-LD regression checks. Unchanged workspace packages used Turbo's cached checks.
- `pnpm --filter web build --webpack` passes with network access for the existing Google Fonts. Default Turbopack compilation could not start a CSS worker under the environment's port restrictions.
- A local production server returned 200 for all seven public pages, sitemap, robots and share image. Googlebot requests exposed the intended unique titles, canonicals and parseable JSON-LD. Login and the redirected orders request carried `noindex, nofollow`.
- The generated 1200 × 630 share image was rendered and visually inspected. Local URLs correctly use the local `NEXT_PUBLIC_SITE_URL`; production must set the public domain **before building**.
- SQL tests could not start because `dropdb` is unavailable. No database migrations or business-rule changes are included.
- No deployment, search-console submission or ranking/citation improvement is claimed.
