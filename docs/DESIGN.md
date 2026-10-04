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
  source chips). Nothing larger.
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

Only to show a change of state: a progress bar while checking, a spinner on a busy button,
the FAQ plus turning into a cross. No entrance animations, hover lifts, ping rings or
scale-on-press. Respect `prefers-reduced-motion`.

## Content

- Use only real content: real verdict definitions, real sources, real portals, real stories from
  the admin showcase. No mock "example verdict" cards, invented stats or generated stock photos.
- Copy describes what the product does, plainly. No "Free · with sources" pills or hype words.

## Never

These are the patterns that made the old design look generated. Don't add them back.

- Pulsing "Live" pills or dots on things that aren't live
- Mono, uppercase, tracked micro-labels ("01 / PASTE THE FORWARD")
- Decorative numbering of sections and steps (a real multi-step flow shows "Step 1 of 3" once)
- Icon-in-a-tinted-square feature cards, three in a row
- Blurred gradient blobs, image overlays with gradients, glows, floating cards over photos
- AI-generated photos of newsrooms or people
- A coloured border on one edge of a card
- Everything at the same big radius
