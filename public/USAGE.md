# NewsVio website image set

All images are 16:9, photorealistic and composed with negative space for live HTML text. Keep copy outside the image for accessibility, mobile responsiveness and easy campaign updates.

| Asset                      | Scenario                          | Text position | Headline                                  | Supporting copy                                                                                   | CTA                    |
| -------------------------- | --------------------------------- | ------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------- |
| `01-business-launch.png`   | New retail business in Dehradun   | Left          | Your new beginning deserves to be seen.   | Launching a business? Turn your announcement into published coverage through the NewsVio network. | Publish your story     |
| `02-cafe-event.png`        | Café open-mic event               | Right         | Turn your event into a story.             | Share what is happening, where it is happening and why people should know about it.               | Get published          |
| `03-home-business.png`     | Home bakery and local service     | Left          | Built from home. Ready for the city.      | Put your growing business in the news—starting at ₹499, GST included.                             | Start your story       |
| `04-citizen-story.png`     | Local civic issue                 | Right         | Some local stories need public attention. | Share an incident, concern or community issue that deserves to be heard.                          | Tell your story        |
| `05-human-interest.png`    | Athlete and personal achievement  | Left          | A journey worth sharing.                  | Turn a personal milestone, achievement or inspiring experience into a story people can discover.  | Share your achievement |
| `06-family-fact-check.png` | Family checking a forwarded claim | Right         | Before you forward it, check it.          | Check a message, link or screenshot against reliable sources—and share the evidence.              | Check a claim          |

## Display guidance

- Use white text over a dark translucent gradient when copy sits over photography.
- On brighter images, use charcoal text on a soft warm-white content panel.
- Keep faces and hands unobstructed.
- Use `object-position` to protect the subject on mobile.
- Do not place more than one headline, one supporting sentence and one CTA over an image.
- Add descriptive alt text for the scene; do not repeat the full headline in the alt text.

## Suggested alt text

- `01-business-launch.png`: Indian founders opening their local-products shop in Dehradun.
- `02-cafe-event.png`: A café owner preparing an acoustic event in a Dehradun café.
- `03-home-business.png`: An Indian home baker packing products while an assistant photographs them.
- `04-citizen-story.png`: Dehradun residents documenting a waterlogged road and damaged drain.
- `05-human-interest.png`: An Indian para-athlete speaking with her coach at a Dehradun sports ground.
- `06-family-fact-check.png`: An Indian family reviewing a forwarded message together on a phone.

## Implementation (6 October 2026)

The repository-root `public` folder contains the originals; Next.js serves
`apps/web/public`. Run `node scripts/prepare-campaign-images.mjs` to regenerate
1600×900 WebP assets there and 960×540 bundled assets in `apps/mobile/assets/campaigns`.
Original PNGs are preserved. Shared copy and alt text live in
`packages/shared/src/campaigns.ts`; runtime offer copy comes from the active package.
The home-business copy avoids a fixed price so it cannot drift from checkout.

| Scenario          | Original file                              | Generated filename          |
| ----------------- | ------------------------------------------ | --------------------------- |
| Business launch   | `2314D029-0801-429D-953B-EEA9B1C187F3.PNG` | `01-business-launch.webp`   |
| Café event        | `94EB8F8C-61BB-48C9-A3EE-F809156B39EB.PNG` | `02-cafe-event.webp`        |
| Home business     | `B3B5F6BF-EBA7-4F0C-8C1F-B82EF982C53A.PNG` | `03-home-business.webp`     |
| Citizen story     | `7638CC25-CDF5-4D0E-ABBD-C1278D9F5A3F.PNG` | `04-citizen-story.webp`     |
| Human interest    | `EDEC66E2-76C8-42FD-A642-CF7B5D9CAD52.PNG` | `05-human-interest.webp`    |
| Family fact-check | `AB4C76DE-CF68-4F36-93E7-E409A8536A18.PNG` | `06-family-fact-check.webp` |

Website: family image beside the fact-check hero; business-launch image in the
publishing section; four other scenarios under “Find your story”. Text appears below
images on the website, on the existing solid surfaces. Mobile (redesign, 9 October
2026): all six scenes in the auto-advancing Home photo slider, four in the Publish
“What's your story?” slider, and the family image in the “How we check” sheet. Slider
photos are cropped to fill the slide, with one kicker, one headline and one CTA on a
dark scrim at the bottom, following the display guidance above. Images illustrate
scenarios and do not stand in for the real “Recently published” showcase.

The confirmed offer is **₹499, GST included**, with 5 news portals, 1 Instagram
collaboration post and 1 Facebook page post, subject to editorial approval.
