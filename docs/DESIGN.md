# NewsVio design system

The look of the web app and the mobile app. Tokens live in `apps/web/src/app/globals.css`
and `apps/mobile/tailwind.config.js` (same names, same values). If you change one, change the
other.

## Direction: editorial newsroom

NewsVio asks people to trust a verdict, so it should look like a careful publication, not a
startup landing page. That means a serif voice for headlines, plain readable text, real sources
shown prominently, and almost no decoration. When in doubt, take something away.

This replaced the earlier Stitch "Obsidian & Emerald" look in October 2026, after client feedback
that the product looked AI-generated. The specific things that read as generated are listed under
"Never" below; don't reintroduce them.

## Colour

| Token | Value | Use |
|---|---|---|
| `canvas` | `#fbfaf7` | Page background (warm paper) |
| `paper` | `#ffffff` | Cards, inputs, sheets on the canvas |
| `subtle` / `elevated` | `#f5f3ee` / `#ece8df` | Tinted bands, read-only fields, pressed states |
| `hairline` / `divider` / `input` | `#e2ddd2` / `#ebe7de` / `#d6d0c3` | Borders. `input` is the darker one, for controls |
| `ink` | `#17140f` | Headlines, primary text, the default (secondary-weight) button |
| `body` / `slate` / `faint` | `#3b3731` / `#6b655b` / `#8f8879` | Body text / secondary text / decorative only (fails AA for text) |
| `brand` | `#1d3d63` | The one main action on a screen, links, focus ring, the active step |
| `verified` | `#1e6b45` | "Likely true", done, saved, paid |
| `warn` | `#8a5300` | "Misleading", changes requested |
| `danger` | `#b3261e` | "Likely false", errors, destructive actions |

Rules:

- **Verdict and status colours mean something.** Green, amber and red appear only for a verdict or a
  status. Never use them for decoration, icons in marketing copy, or "brand".
- **One brand-blue button per screen.** Everything else is ink, outline or a text link.
- **Light only.** Dark mode is not offered; that's a decision, not an omission.
- No gradients, glows, blurred blobs or coloured shadows anywhere.

## Type

- **Source Serif 4** (600/700) for headlines and the wordmark: `font-display`.
- **Public Sans** (400/500/600) for everything else: `font-sans`.
- **IBM Plex Mono** (500) only for data: order numbers, report IDs, URLs, codes. Never for labels.
- Sentence case everywhere. No all-caps labels, no wide letter-spacing.
- Body text is 16px on web. Prices, dates and counts use `tabular` (tabular figures).

## Shape and space

- Radius: 4px (small controls), 6px (buttons, inputs, cards), 10px (large panels), full (avatars,
  source chips). Nothing larger on the web. The mobile app is rounder to match phone controls
  (10px inputs, 12px buttons and cards, 16px sheets); its layout patterns and wireframes are in
  `docs/MOBILE-UX.md`.
- A card is either a white sheet with a hairline border, or a tinted plane with no border. Never
  both, and never with a shadow.
- Prefer rules (`border-y`, `divide-y`) and definition lists to boxes. Lists of sources, tools,
  FAQs and steps are ruled lists, not grids of cards.
- Left-align. Centre only single short lines (an empty state).

## Components

- `PageHeader`: optional sentence-case kicker, serif title, lede in `body` colour.
- `StepHeading`: serif section title over a hairline. No "01 /" numbering.
- `Badge`: small, square-ish (4px), sentence case, sans. Tones only for real states.
- `LiveDot`: solid brand dot, only while work is genuinely running (a fact check in progress).
- Verdict panel: the verdict's tint as background, the verdict name in its colour in serif, then
  confidence and the summary. See `report-view.tsx` on both apps.

## Motion

**Web:** only to show a change of state: a progress bar while checking, a spinner on a busy
button, the FAQ plus turning into a cross. No entrance animations, hover lifts or ping rings.

**Mobile app (changed 9 October 2026):** the client asked for an app that feels alive, with touch
effects everywhere and photo sliders, so the app now uses motion on purpose. The editorial look
(type, palette, real content) stays; motion adds the life. Rules:

- **Everything you touch answers back.** Buttons, cards, rows, chips and tabs sink to 0.97 on
  touch and spring back (`PressableScale`). Main actions give a light haptic; tabs, segments,
  radio cards and checkboxes give a selection tick.
- **Things arrive.** A screen's sections fade in and rise 12pt the first time it opens, 50 ms apart,
  the first 8 only (`ScrollScreen` does this for every screen).
- **Photo sliders** advance every 4–4.5 s with story-style bars (Home) or dots (Publish), a slow
  zoom and parallax. Holding pauses them, leaving the screen stops them.
- **Data draws itself:** progress, the source agreement bar and the order timeline grow from zero
  to their real value. They never show progress the server hasn't reported.
- **Loops only while work is real:** the scan animation during a fact check (indeterminate: the API
  reports checking or done, not which step), and the breathing dot on an order's current step.
- **The verdict lands** with a pop and a haptic that matches it (success, warning, error).
- **Reduce Motion** turns entrances, sliders and loops off; presses still give feedback.

Specs and the code map are on the design canvas ("Motion and touch") and in
`apps/mobile/src/components/motion/`.

## Content

- Use only real content: real verdict definitions, real sources, real portals, real stories from
  the admin showcase. No mock "example verdict" cards or invented stats. Only the client-supplied campaign images
  documented in `public/USAGE.md` may illustrate publishing scenarios; keep them separate from
  the real admin showcase.
- Copy describes what the product does, plainly. No "Free · with sources" pills or hype words.

## Never

These are the patterns that made the old design look generated. Don't add them back.

- Pulsing "Live" pills or dots on things that aren't live
- Mono, uppercase, tracked micro-labels ("01 / PASTE THE FORWARD")
- Decorative numbering of sections and steps (a real multi-step flow shows "Step 1 of 3" once)
- Icon-in-a-tinted-square feature cards, three in a row
- Blurred gradient blobs, glows, coloured shadows, floating cards over photos. The one allowed
  gradient is the dark scrim under text on an app photo slide, so white type reads on any image
- Unapproved generated photos of newsrooms or people. The six client-supplied campaign images
  in `public/USAGE.md` are approved for illustrative scenarios, never as proof of real customers
  or published stories. On the web, keep live text alongside or below them. In the app's photo
  sliders text sits on the bottom scrim, clear of faces (public/USAGE.md display guidance).
- A coloured border on one edge of a card
- Everything at the same big radius
