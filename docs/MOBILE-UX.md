# NewsVio mobile: app structure and wireframes

The mobile app follows the colours, type and "Never" list in `docs/DESIGN.md`. This file covers
what makes it a phone app rather than the website in a frame: navigation, layout patterns and
the wireframe for every screen. Written October 2026, after client feedback that the app "looks
like a website".

## Why it looked like a website

- Every tab was one long scrolling page: serif hero headline, lede paragraph, then stacked
  sections, like a landing page.
- The main action of each screen sat at the bottom of the scroll, inside a card.
- A custom wordmark bar on every tab instead of a navigation bar with the screen's title.
- Section headings with rules, tinted panels and grids of cards: web layout primitives.

## Mobile patterns we use

| Pattern | Where |
|---|---|
| Compact in-scroll header per tab root (kicker, serif title and actions on one row, right under the status bar; `ScrollScreen` `header`, `TAB_ROOT`). Replaced the iOS large-title bar on 10 October 2026: its separate button row and title band wasted the top of every screen | Every tab root; pushed screens keep the native bar |
| Grouped list: white rounded group, inset hairlines between rows, a short sentence-case label above and an optional note below | Profile, order details, report sources, settings-like content |
| Bottom action bar pinned above the tab bar or the home indicator, holding the screen's one main action | Fact check, publish, edit & pay, order detail, report |
| Segmented control for switching modes inside a screen | Text / Link / Screenshot; Log in / Create account |
| Sheet (native form sheet) for reference content that doesn't need its own tab | How we check (verdicts + sources) |
| Horizontal carousels for browseable sets | Recently published; the network strip drifts on its own |
| Auto-advancing photo slider | Home (story bars), Publish (dots) |
| Header buttons for secondary actions | Bell (home), new story (orders), help (order) |
| Native switch for on/off settings | Public report link |
| Centered empty states with one action | No orders, no notifications, guest orders |

Shape on mobile: 10px inputs, 12px buttons, cards and groups, 16px sheets. Bigger than the web
radii because phones' own controls are rounder. Still no shadows, gradients or glows.

Tap targets are at least 44pt. Primary buttons are 52pt tall and full width in the bottom bar.

## Navigation

```
Root stack
├── (tabs)                      bottom tabs: Home · Check · Publish · Orders · Profile
│   ├── (home)      stack       index
│   ├── fact-check  stack       index (input → checking → report, one screen with three states)
│   ├── publish     stack       index
│   ├── orders      stack       index → [id] → [id]/edit
│   └── profile     stack       index
├── (auth)/sign-in              modal
├── complete-profile            modal, not dismissible
├── how-we-check                form sheet (medium / large)
├── notifications               push, large title
└── payment-result, reset-password
```

## Wireframes

### Home

```
┌──────────────────────────────────┐
│ NewsVio                    [bell]│  large title; "Log in" instead of bell for guests
│ Namaste, Prateek. Check the news…│
│ ┌──────────────────────────────┐ │
│ │ ▬▬ ▬▬ ▭▭ ▭▭ ▭▭ ▭▭            │ │  photo slider: 6 campaign scenes, story bars,
│ │        (photo)               │ │  4 s each, swipe / tap a bar, hold to pause
│ │ [Fact check · free]          │ │  kicker on a white chip
│ │ Before you forward it,       │ │  serif title on the bottom scrim
│ │ check it.   [Check a claim →]│ │  tap → Check (fact-check slide) or Publish
│ └──────────────────────────────┘ │
│ ┌─────────────┐ ┌──────────────┐ │
│ │ (shield)    │ │ (news) [₹499]│ │  the two services: brand tile and ink tile
│ │ Fact check  │ │ Publish your │ │
│ │ Free · 3 way│ │ story · chans│ │
│ └─────────────┘ └──────────────┘ │
│ ( Got a forward? Paste…  [Paste])│  paste → Check tab, link or text mode
│                                  │
│ Your order                       │  only with an active order; bar grows in
│ ┌──────────────────────────────┐ │
│ │ NV-1042           In progress│ │
│ │ Headline of the story        │ │
│ │ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▭▭▭▭▭▭  >  │ │
│ └──────────────────────────────┘ │
│ Your story in the news, without  │
│ an agency                        │
│  (1)────(2)────(3)               │  write · pay ₹499 · go live; line draws in,
│ Write  Pay ₹499  Go live         │  numbers pop one after another
│                                  │
│ Where your story appears  See all│
│ [logo][logo][logo][Instagram]…   │  drifts on a loop; touch stops it
│ ┌──────────────────────────────┐ │
│ │ [pdf]  A report you can      │ │  tinted card → Check
│ │        forward back (QR)     │ │
│ └──────────────────────────────┘ │
│ Recently published               │
│ [▢ card][▢ card][▢ ca…  →        │  real showcase, opens the live article
│ ┌──────────────────────────────┐ │
│ │ How we check               > │ │  → How we check sheet
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ (Home) Check Publish Orders  You │  active tab: pill springs in behind the icon
└──────────────────────────────────┘
```

### Check (fact check)

```
Input                          Checking                    Report
┌────────────────────────┐ ┌────────────────────────┐ ┌────────────────────────┐
│ Fact check             │ │ Fact check             │ │ < Report        [share]│
│ [▓Text▓| Link | Screen]│ │    ( news )            │ │ ┌────────────────────┐ │
│ ┌────────────────────┐ │ │ (wiki) [doc]  (checks) │ │ │ Our verdict        │ │ settles in,
│ │ Paste the message… │ │ │   scan ↕   (domain)    │ │ │ (!) Likely false   │ │ icon pops,
│ │                    │ │ │ Checking this claim    │ │ │ Summary…           │ │ haptic
│ │ [Paste]   120/10000│ │ │ Usually under a minute │ │ │ [Confidence][7 src]│ │
│ └────────────────────┘ │ │ 0:12                   │ │ └────────────────────┘ │
│ Where we look          │ │ ▭▭▬▬▬▭▭▭▭ (sweeps)     │ │ What the sources say   │
│ (• fact checks)(• news)│ │ What we're checking    │ │ ▓▓▓▓▓▓▓▓▓░░░ 5 · 2 · 0 │ grows in
│ (• wiki)(• site age)…  │ │ │ Reading the claims  │ │ │ The claim · Evidence   │
│ │ PDF report + QR    > │ │ │ Fact checkers …     │ │ │ ┌ Forward the proof ┐  │ ink card,
│ │ How we check       > │ │ └─────────────────────┘ │ │ │ [QR] Download PDF │  │ PDF with QR
├────────────────────────┤ ├────────────────────────┤ │ Public link (on)       │
│ [  Check this claim → ]│ │ [        Cancel       ]│ │ [New check][Share ↗]   │
└────────────────────────┘ └────────────────────────┘ └────────────────────────┘
```

The segmented thumb slides with a spring; the input's border turns brand blue on focus. The
orbit and scan are indeterminate on purpose: the API says "checking" or "done", nothing finer.
PDF, image and link sharing all ask to make the report public first. Guests over the daily
limit see the sign-up prompt in place of the error, as before.

### Publish

```
┌──────────────────────────────────┐
│ Publish                          │
│ ┌──────────────────────────────┐ │
│ │        (photo)               │ │  "What's your story?" slider: 4 scenes,
│ │ Launching a business?        │ │  4.5 s, dots stretch as you swipe
│ └──────────────────────────────┘ │
│            ━ • • •               │
│ Step 1 of 3 · Write your story   │
│ ▬▬▬▬▬▬▬▬▬▬ ▭▭▭▭▭▭▭▭▭▭ ▭▭▭▭▭▭▭▭▭▭ │  fills in
│ ┌──────────────────────────────┐ │  ink card: what the package buys
│ │ Story Package         [₹499] │ │
│ │ Where your story goes        │ │
│ │ [▤][▤][▤][▤][▤][Instagram]   │ │  channel tiles pop in one by one
│ │ Offer line, editorial review │ │
│ └──────────────────────────────┘ │
│ Package                          │
│ ┌──────────────────────────────┐ │
│ │ (•) Story Package       ₹499 │ │  radio cards: sink + selection haptic
│ └──────────────────────────────┘ │
│ Your story                       │
│ │ Headline · Article · Instagram │ │
│ [x] Feature my story…            │
│ │ Our network · 18 portals   > │ │
├──────────────────────────────────┤
│ Total ₹499        [Add images →] │  bottom bar
└──────────────────────────────────┘
```

Edit & pay (orders/[id]/edit) uses the same layout with Photos added after the story, the
declaration under Review, and the bottom bar showing the save state, total and **Pay ₹499**.

### Orders

```
List                                  Order
┌──────────────────────────────┐     ┌──────────────────────────────┐
│ Orders                    [+]│     │ < Orders                  [?]│
│ ┌──────────────────────────┐ │     │ In progress                  │
│ │ Headline of story   [In  │ │     │ Headline of the story        │
│ │ NV-1042 · 3 Oct   prog.] │ │     │ NV-1042                      │
│ ├──────────────────────────┤ │     │ ┌──────────────────────────┐ │
│ │ Another headline  [Draft]│ │     │ │ ✓ Draft … ● In progress  │ │ timeline
│ │ NV-1039 · 1 Oct          │ │     │ └──────────────────────────┘ │
│ └──────────────────────────┘ │     │ Live links                   │
│                              │     │ ┌──────────────────────────┐ │
│ Empty: icon, "No orders yet",│     │ │ Portal  https://…      ↗ │ │
│ [Publish your story]         │     │ └──────────────────────────┘ │
│                              │     │ Details                      │
│ Guest: "Log in to see your   │     │ ┌──────────────────────────┐ │
│ orders" [Log in] [Create]    │     │ │ Package        Standard  │ │
│                              │     │ │ Amount           ₹499  │ │
│                              │     │ └──────────────────────────┘ │
│                              │     ├──────────────────────────────┤
│                              │     │ [  Pay now / Download PDF  ] │
└──────────────────────────────┘     └──────────────────────────────┘
```

### Profile

```
┌──────────────────────────────────┐
│ Profile                          │
│ ┌──────────────────────────────┐ │
│ │ (P)  Prateek Thapliyal       │ │
│ │      prateek@example.com     │ │
│ └──────────────────────────────┘ │
│ Account                          │
│ │ Phone          +91 98…       │ │
│ │ Notifications              > │ │
│ Support · 10am–7pm               │
│ │ WhatsApp us                > │ │
│ │ Call us        +91 …       > │ │
│ About                            │
│ │ How we check · Terms · Priv. │ │
│ ┌──────────────────────────────┐ │
│ │ Sign out                     │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ Delete account               │ │  red row, confirm alert
│ └──────────────────────────────┘ │
│ Deletes your profile, … note     │
└──────────────────────────────────┘
```

### Sign in (modal)

```
┌──────────────────────────────────┐
│                              [x] │
│ NewsVio                          │
│ Log in                           │  serif title
│ Why we're asking (reason)        │
│ [ Log in | Create account ]      │
│ Email     [_________________]    │
│ Password  [_________________]    │
│ Forgot password?                 │
│ [            Log in           ]  │
│ ─────────── or ───────────       │
│ [ G  Continue with Google     ]  │
└──────────────────────────────────┘
```

## Redesign: an app that feels alive (9 October 2026)

Client feedback: the app "is not giving a good design vibe". It should feel lively, with touch
effects everywhere and photo sliders, and showcase both services: ₹499 self-serve PR on our
portals, Instagram and Facebook, and the free fact checker with its shareable PDF and QR code.
Wireframes, high-fidelity screens and the motion spec are on the "NewsVio app redesign" design
canvas; motion rules are in docs/DESIGN.md.

What we took from the competition (October 2026):

- **Logically Facts**: verify at the touch of a button and pick out claims for the user. We
  keep one big input with Paste, and make the wait visible.
- **Snopes**: ratings readable at a glance. Our verdict panel leads, in its colour, with a
  haptic that matches it.
- **Ground News**: one signature data graphic (its bias bar). Ours is "What the sources say", a
  bar of how many sources contradict, give context or support.
- **Inshorts / Instagram stories**: Indian users know story bars and swipeable cards. The home
  slider uses story bars.
- **Indian press-release services** (PRIndiaWire, NewsVoir, RedPress, India PR Distribution):
  web-only, form-heavy and priced from about ₹4,500 to ₹15,000 a release. Our advantages to
  show off: mobile-first, a fixed low price on the screen, our own portals and social pages,
  and live links plus a PDF report at the end. The app shows our price and channels; it
  never names or prices competitors.
- **Fact-check tiplines** (Factly, Vishvas News, BOOM on WhatsApp): people already forward
  claims to be checked. The paste bar on Home and the Paste button make that one tap here.

Every screen enters with a short stagger (`ScrollScreen`), and every tappable thing sinks
under the finger (`PressableScale`). The tab bar's active icon gets a springy pill.

## Campaign image placement (6 October 2026)

Since the 9 October redesign all six scenes run in the Home photo slider (family fact check
first), four of them in the Publish "What's your story?" slider, and the family image also
appears in the “How we check” sheet. Slide copy sits on the bottom scrim, clear of faces.
These are illustrative scenarios, separate from real “Recently published” stories.
Use the shared campaign copy and locally bundled assets; the images work offline.

Offer text in the wireframes is illustrative: the active package supplies price, channels and
turnaround. The launch package is ₹499, GST included, for 5 portals, 1 Instagram collaboration
post and 1 Facebook page post, subject to editorial approval.
