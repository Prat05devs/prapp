# NewsVio on Google Play: every Play Console answer

What to enter in Google Play Console for **NewsVio** (`com.newsvio.app`), page by page, in the
order of **Policy and programs → App content**, then the store listing and release. Each answer is
based on what the app and backend actually do (October 2026 code). Update it whenever a feature
changes the data we collect, the permissions, or who we send data to.

Checked against Google Play's rules as of **10 October 2026**. Google changes these often (target
API every August, News declaration expanded in 2025–26, developer verification from September 2026),
so read "What changed recently" before every release.

---

## 0. Fix before submitting

| # | Item | Why | Status |
|---|---|---|---|
| 1 | Finalise the privacy policy | `/privacy` still says "Draft · to be reviewed before launch". Play checks it against the Data safety form. It must name the AI providers (Google Gemini, Groq, OpenRouter) and match section 7. | Not done |
| 2 | A **public** web page for deleting an account | The Data safety form needs a URL where someone can ask for deletion *without the app installed*. `https://www.newsvio.in/account` works but sits behind login (it redirects to sign-in). Google accepts that only if the page explains the steps. | Recommended: add a public "Delete your account" section (e.g. `/support#delete-account`) saying "Log in at newsvio.in/account → Delete account, or email support", and use that URL. |
| 3 | AI consent shown before sending data | Play's User Data policy requires a prominent in-app disclosure and consent before personal data is sent somewhere users wouldn't expect | **Done (10 Oct 2026):** the first fact check asks permission, naming Google Gemini, Groq and OpenRouter. Withdraw it in Profile → Privacy. |
| 4 | Closed test before production | **Personal** developer accounts created after 13 Nov 2023 must run a closed test with ≥12 testers for 14 days in a row (Google now checks they really used the app) before they can apply for production access. | Check the account type. Organisation accounts are exempt. |
| 5 | Developer identity verification | From 30 Sept 2026 Android requires verified developer identity (rolling out by country; Play Console accounts verify in the console). Needs government photo ID, proof of address and phone. | Complete in Play Console → Account details if prompted |

---

## 1. Privacy policy

`https://www.newsvio.in/privacy` (must be public, not a PDF, not geo-blocked, and name NewsVio).

## 2. App access

**"All or some functionality is restricted"**. Fact checking works without an account; orders,
notifications and paying need one. Add instructions:

- Username: `ios.tester@newsvio.in` (same review account as iOS; password in
  `~/newsvio-test-accounts.txt`. Type it in the console, never commit it.)
- Instructions: "Log in from Home → Log in. Orders tab shows a sample order. Fact check needs no
  login: tap Check, paste any message, allow AI processing when asked."

## 3. Ads

**No, my app does not contain ads.** No ad SDKs. The merged manifest has no
`com.google.android.gms.permission.AD_ID`, so on the **Advertising ID** question answer
**No, the app doesn't use advertising ID**.

## 4. Content rating (IARC questionnaire)

- Email: the support address. Category: **Reference, News, or Educational**.

| Topic | Answer | Why |
|---|---|---|
| Violence / blood / gore | No | |
| Sexuality / nudity | No | |
| Language (profanity) | No | |
| Controlled substances | No | |
| Crude humour | No | |
| Gambling / simulated gambling | No | |
| Fear / horror | No | |
| References to real-world sensitive topics in a news or educational context | **Yes** | Fact checks quote claims about crime, politics or health from forwarded messages |
| Users can interact or exchange content with other users | **No** | No user sees another user's content in the app |
| Shares the user's location with others | No | No location permission |
| Allows purchase of digital goods | **No** | Customers pay for a real-world service (our editors publish their story on news sites). No digital goods are unlocked in the app. |
| Unrestricted internet / web browsing | **No** | Specific links open in a Custom Tab; there's no general browser |

Expected rating: around **Teen / PEGI 12**. Accept what IARC returns; don't argue it down.

## 5. Target audience and content

| Question | Answer |
|---|---|
| Target age groups | **18 and over** only (paid service, news and political content). Choosing under-13 groups would bring in the Families policy, which the app isn't built for. |
| Could the app unintentionally appeal to children? | No |
| Store listing aimed at children? | No |

## 6. News and magazine apps declaration

**This applies to us.** Google requires it from any app in the News & Magazines category **or with
"news" in its title, icon or developer name**, and "NewsVio" has it. The expanded declaration was
due 27 May 2026; apps without it can be removed.

| Question (summarised) | Answer |
|---|---|
| Is this a news or magazine app? | **Yes** (by Google's definition: name and category) |
| Owner / publisher | Legal entity name, registered address, contact email and phone. The same details must be on the website (`/support`) and the store listing. |
| What content does the app show? | (1) Fact-check reports generated from public sources (fact-checkers, news outlets, Wikipedia, domain records) with AI assistance. Every report lists its sources and tools and carries a disclaimer. (2) Links to stories published on partner news portals. Paid stories are labelled sponsored, after editorial review. |
| Original reporting? | No original news reporting in the app. Reports summarise and link to the sources. |
| Editorial standards / corrections | Methodology at `https://www.newsvio.in/methodology`; corrections through "Send a correction" on every report and `/support` |
| Paid content labelled? | Yes. Sponsored stories carry a disclosure, and editors use `rel="sponsored"` on links (CONTEXT.md golden rule 10). |

Category in the store listing: **News & Magazines**.

## 7. Data safety

**Does your app collect or share any of the required user data types?** Yes.
**Is all collected data encrypted in transit?** **Yes** (HTTPS/TLS everywhere).
**Do you provide a way for users to request deletion?** **Yes**: in the app (Profile → Delete
account) and on the web (URL from item 2).
**Account creation methods:** Username/email and password; OAuth (Google).
**Independent security review:** No.

**Collected data.** None of it is *shared*: Google doesn't count sending data to service providers
that process it for us (Supabase, Vercel, Google Gemini, Groq, OpenRouter, Expo push, Razorpay,
the email provider) as sharing. None of it is processed ephemerally only.

| Play data type | What | Required or optional | Purposes |
|---|---|---|---|
| Personal info → **Name** | Profile full name | Optional (only with an account) | App functionality, Account management |
| Personal info → **Email address** | Login and order emails | Optional (only with an account) | App functionality, Account management |
| Personal info → **Phone number** | Profile / order contact | Optional (only with an account) | App functionality, Account management |
| Personal info → **User IDs** | Account id | Optional (only with an account) | App functionality, Account management |
| Financial info → **Purchase history** | Orders and amounts | Optional (only if they order) | App functionality |
| Photos and videos → **Photos** | Story images, fact-check screenshots | Optional | App functionality |
| App activity → **Other user-generated content** | Story text, Instagram handle, fact-check text and links | Optional | App functionality |
| Device or other IDs → **Device or other IDs** | A random install id (guest fact-check limits) and the push token | Required (sent with every fact check) | App functionality, Fraud prevention, security and compliance |

**Don't declare:** Payment info (Razorpay's hosted page collects it, never the app),
Location, Contacts, Messages, Audio, Health, Files, Calendar, Web browsing, App
interactions/analytics, Crash logs, Diagnostics, Installed apps. The app has none of these
permissions or SDKs.

Retention (also in the policy): fact-check screenshots deleted after 30 days; unpaid drafts
untouched for 7 days deleted; order records kept for accounting.

## 8. Other App content declarations

| Declaration | Answer |
|---|---|
| Government apps | No |
| Financial features | **"My app doesn't provide any financial features."** Taking payment for our own service through Razorpay isn't a financial feature. This declaration is required even when the answer is none. |
| Health apps | **No health features.** Fact checks can cover health rumours, but the app gives no health services. Required even when the answer is none. |
| COVID-19 contact tracing / status | No |
| Photo and video permissions | **Not applicable.** The app uses the system Photo Picker (`expo-image-picker`) and declares no `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO`, so no declaration is needed. Keep it that way. |
| Foreground service, exact alarms, full-screen intents | None used |
| Sensitive permissions (SMS, call log, location, all files, accessibility, query all packages) | None |

**Permissions in the release manifest:** `INTERNET`, `ACCESS_NETWORK_STATE`, `POST_NOTIFICATIONS`
(asked after a first action, never at launch), `VIBRATE` (haptics), `WAKE_LOCK`,
`RECEIVE_BOOT_COMPLETED` (notifications), `USE_BIOMETRIC` / `USE_FINGERPRINT` (pulled in by
`expo-secure-store`, never prompted), launcher badge permissions. Removed on purpose in `app.json`:
camera, microphone, `READ/WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`.

## 9. Store listing

| Field | Answer |
|---|---|
| App name (30) | NewsVio |
| Short description (80) | Check WhatsApp forwards for free. Publish your own story in the news from ₹499. |
| Full description (4000) | Both services, plainly. Name fact-checkers as *sources we search*, not partners. Say paid stories are sponsored and reviewed. No "official" claims. |
| App icon | 512 × 512 PNG, 32-bit |
| Feature graphic | 1024 × 500 JPG/PNG (no text over faces; campaign images allowed, see `public/USAGE.md`) |
| Phone screenshots | 2–8, 9:16, each side 320–3840 px (1080 × 1920 or larger recommended) |
| Category | News & Magazines |
| Contact email | Support email from app settings (required, shown publicly) |
| Website | https://www.newsvio.in |
| Privacy policy | https://www.newsvio.in/privacy |

**Payments policy:** Play requires Google Play Billing only for *digital* goods. Our product is a
service performed outside the app, so Razorpay in the browser is allowed. No Play Billing Library
is used, so the Billing Library v8 deadline doesn't apply.

## 10. Release requirements

| Requirement | Our status |
|---|---|
| Android App Bundle (.aab), Play App Signing | Yes. Upload key `~/newsvio-android-keys/newsvio-upload.jks`, injected by `plugins/with-release-signing.js`. |
| **Target API 36 (Android 16)** for new apps and updates from **31 Aug 2026** (extension to 1 Nov on request) | React Native 0.86 / Expo SDK 57: `targetSdk 36`, `compileSdk 36`, `minSdk 24` |
| 16 KB memory page size support (apps targeting Android 15+) | RN 0.86 ships 16 KB-aligned native libraries. Confirm in Play Console → App bundle explorer, which flags misaligned libraries. |
| `versionCode` | Bump `android.versionCode` in `app.json` for every upload (1 is the first) |
| Build | `npx dotenv -e .env.production -- npx expo prebuild -p android`, then `./gradlew bundleRelease` |
| Checks | `pnpm typecheck && pnpm lint && pnpm test && pnpm test:sql` all green |

## What changed recently (watch list)

- **31 Aug 2026:** target API 36 required for new apps and updates.
- **27 May 2026:** deadline for the expanded News & Magazines declaration. "News" in the title brings an app into scope.
- **30 Sept 2026:** developer verification starts (Brazil, Indonesia, Singapore, Thailand first, then everywhere).
- **2026:** closed-test rule for new personal accounts now checks testers really used the app.
- Financial features and Health declarations are required even when the answer is "none".
- Photo and video permissions: apps with occasional photo access must use the Photo Picker.

## Sources

- [Policy announcement: 15 July 2026 (Play Console Help)](https://support.google.com/googleplay/android-developer/answer/17134731?hl=en)
- [Policy announcement: 15 April 2026 (Play Console Help)](https://support.google.com/googleplay/android-developer/answer/16926792?hl=en)
- [How to declare a news and magazine app (Play Console Help)](https://support.google.com/googleplay/android-developer/answer/16189314?hl=en)
- [Requirements for news and magazine apps (Play Console Help)](https://support.google.com/googleplay/android-developer/answer/10523915)
- [Understanding Play's account deletion requirements (Play Console Help)](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [Google Play target API 36 deadline: 31 Aug 2026](https://primetestlab.com/blog/google-play-target-api-level-2026)
- [Google Play publishing requirements 2026 checklist](https://primetestlab.com/blog/google-play-publishing-requirements-2026)
- [Closed testing requirements 2026](https://www.testerscommunity.com/blog/google-play-closed-testing-requirements-2026)
- [Google Play developer verification 2026](https://testerbee.com/blog/google-play-developer-verification-2026)
- [Support 16 KB page sizes (Android Developers)](https://developer.android.com/guide/practices/page-sizes)
- [READ_MEDIA_IMAGES and the Photo Picker requirement](https://github.com/ivpusic/react-native-image-crop-picker/issues/2152)
