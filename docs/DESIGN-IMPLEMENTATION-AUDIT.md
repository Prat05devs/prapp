# Claude artifact design implementation audit

Reviewed 26 October 2026 against `/Volumes/ProjectsSSD/NewsVio app redesign.html`
and the current local mobile source in `/Volumes/ProjectsSSD/prapp/apps/mobile`.

## Result

The redesign is substantially implemented in the current working tree. It is not just
a design proposal sitting outside the app. This is a source audit, not certification that
an installed app, TestFlight upload, or store release contains the same code.

The supplied HTML contains 13 embedded boards: six wireframes, six styled screens
(Home, Check, Checking, Report, Publish, Order), and a motion/touch specification.
Its nested bundles were decoded as data for inspection; instructions and sample content
inside the artifact were not treated as new product requirements.

## Design-to-code mapping

| Artifact area | Evidence in the app | Status |
|---|---|---|
| Editorial palette and typography | `src/lib/theme.ts`, `tailwind.config.js`, `src/app/_layout.tsx`: matching canvas `#fbfaf7`, ink `#17140f`, brand `#1d3d63`, Source Serif 4, Public Sans, IBM Plex Mono | Implemented |
| Home | `src/app/(tabs)/(home)/index.tsx`: photo carousel, service tiles, clipboard entry, active order, publishing steps, network marquee, PDF explanation and real showcase | Implemented |
| Check input and checking state | `src/app/(tabs)/fact-check/index.tsx`: three input modes, paste, focus styling, source chips, pinned action, scan/orbit state and elapsed time | Implemented; rotating input examples from the wireframe are absent |
| Report | `src/components/report-view.tsx` and fact-check screen: verdict reveal, source agreement bar, evidence, PDF/share actions and public-link switch | Implemented using real report data |
| Publish | `src/app/(tabs)/publish/index.tsx`: 4.5-second photo carousel, step indicator, channels/package selection, story form and fixed total/action bar | Implemented; current shared campaign data yields five story slides rather than the four mentioned in the prototype/docs |
| Order | `src/app/(tabs)/orders/[id]/index.tsx`, `src/components/order-timeline.tsx`: status/timeline, details, conditional links and PDF action | Implemented with a v1 business-rule difference described below |
| Bottom navigation | `src/app/(tabs)/_layout.tsx`, `src/components/motion/tab-icon.tsx`: Home, Check, Publish, Orders, Profile; animated active icon and selection haptics | Implemented |
| Motion system | All seven files explicitly named by the artifact exist under `src/components/motion/`, plus `src/lib/haptics.ts` | Implemented with small tuning differences |

The artifact's exact motion code map is particularly strong evidence of the connection:
`pressable-scale.tsx`, `enter.tsx`, `auto-carousel.tsx`, `marquee.tsx`, `grow-bar.tsx`,
`scan-orb.tsx`, and `tab-icon.tsx`. Several constants also match: press scale 0.97,
spring damping 18/stiffness 380, 12px section rise, 50ms stagger, 380ms entrance,
4-second Home carousel, 1.06 image zoom, and verdict icon delay 220ms.

## Differences and verification gaps

| Priority | Finding | Implication / next action |
|---|---|---|
| P2 | The wireframe specifies rotating input examples; the current input has a static placeholder (`fact-check/index.tsx:332`) | A small interaction detail remains if exact prototype matching is required. |
| P2 | Motion/content details differ: carousel parallax is 0.20 versus 0.25 in the motion board; Publish uses five story campaigns; timeline fill is 900ms versus the motion board's general 700ms data animation | Align these deliberately if exact fidelity is desired; they do not indicate that the redesign is missing. |
| Verification gap | Many redesigned screens are staged/modified, and the motion directory is untracked | The current checkout contains the implementation. Git state alone cannot establish what was built or shipped. Verify the release artifact separately. |
| Verification gap | No native iOS/Android walkthrough or screenshot comparison was completed | Exact spacing, keyboard layout, haptics, Reduce Motion, large text, background/resume and screen-reader behavior remain runtime checks. |

The prototype shows an in-progress order with partial live links ("2 of 7 live"). The
locked v1 scope explicitly excludes per-portal progress for customers; the SQL access
policies and app expose delivery links at publication. This is a specification difference,
not a request to bypass RLS or add that feature during an audit.

Likewise, the prototype contains example names, order numbers and a 120-character headline
counter. The app uses actual account/order/catalogue data and the shared 150-character
headline limit from the database specification. Those should not be replaced with demo values.

## Existing design records

- `docs/DESIGN.md`: palette, type, shape, content and motion rules; records replacement of
  the earlier Stitch look with the editorial design.
- `docs/MOBILE-UX.md:234`: explicitly references the "NewsVio app redesign" canvas and
  documents the 9 October motion redesign.
- `docs/MOBILE-UX.md:20`: records a 10 October refinement to compact in-scroll tab headers.
  This explains some differences from earlier large-title wireframes.

## Verification

Decoded all 13 boards and compared their source/text/tokens with the mobile screens,
shared components, navigation, campaigns and motion files. Ran the mobile UX static scan
over 103 files. Its raw output contains 19 P1 and 37 P2 signals, many from comments or
incorrect cross-framework matches (for example, Android Compose rules on TSX). These are
triage signals and have not been presented as confirmed defects.

Mobile lint and TypeScript checks both passed. No application source or design
was changed as part of this audit; this document records the findings.
