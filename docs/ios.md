# NewsVio on the App Store: every App Store Connect answer

What to enter in App Store Connect for **NewsVio** (`com.newsvio.app`), section by section, in the
order the console asks. Each answer is based on what the app and backend actually do (October 2026
code). Re-check this file whenever a feature changes what data we collect or who we send it to.

Checked against Apple's rules as of **10 October 2026**. Apple changes these forms often (new age
ratings in 2025, AI data-sharing rule in November 2025, social-media questions in September 2026),
so read the "What changed recently" list before every submission.

---

## 0. Fix before submitting

| # | Item | Why | Status |
|---|---|---|---|
| 1 | **Add Sign in with Apple** (or another login that limits data to name + email, lets people hide their email and doesn't track) next to "Continue with Google", just as prominent | Guideline 4.8: any app that offers a third-party login (Google) for the main account must offer such an option. Email + password doesn't count. This is the most likely rejection. | **Not done.** Needs: Apple Developer → Identifiers → enable *Sign in with Apple* for `com.newsvio.app`; Supabase → Auth → Providers → Apple; in the app `expo-apple-authentication` + `supabase.auth.signInWithIdToken({ provider: 'apple' })`. |
| 2 | Ask before sending fact-check input to third-party AI, naming the providers | Guideline 5.1.2(i), November 2025 | **Done (10 Oct 2026).** First check shows "Send this to our AI checkers?" naming Google Gemini, Groq and OpenRouter. Profile → Privacy has a switch to withdraw it. Copy: `FC_AI_CONSENT` in `packages/shared/src/constants.ts`. |
| 3 | Finalise the privacy policy | `/privacy` still says "Draft · to be reviewed before launch". Apple compares it with your App Privacy answers. It must name the AI providers (Google Gemini, Groq, OpenRouter), say what each receives, and match section 4 below. | Not done |
| 4 | Build with the iOS 26 SDK or later | Required for uploads since April 2026. We build with Xcode 27. The **scene life cycle plugin** (`apps/mobile/plugins/with-scene-lifecycle.js`) must stay in `app.json`: without it the app crashes at launch on iOS 27. | Done |
| 5 | Demo account for App Review | Orders, notifications and paying need an account | `ios.tester@newsvio.in` exists (customer role, profile complete). Password is in `~/newsvio-test-accounts.txt`; type it into App Review Information, never into the repo. |
| 6 | EU trader status (Digital Services Act) | App Store Connect asks every developer whose app is available in the EU. A *trader* must publish an address, phone and email on the store page. | Decide: either set availability to **India only** for launch (simplest), or declare trader status with the business contact details. |

---

## 1. App Information

| Field | Answer |
|---|---|
| Name | NewsVio |
| Subtitle (30 chars) | Fact check & publish your story |
| Bundle ID | com.newsvio.app |
| Primary language | English (India) |
| Primary category | **News** |
| Secondary category | Utilities |
| Content rights: "Does your app contain, show, or access third-party content?" | **Yes.** It shows headlines, links and logos of third-party news sites and fact-checkers (sources in reports, our partner portals). We show them as links with attribution and have rights to the portal logos and the six campaign photos (client-supplied, `public/USAGE.md`). Tick "I have the necessary rights". |
| Age rating | See section 3 |
| Privacy Policy URL | https://www.newsvio.in/privacy |
| User Privacy Choices URL (optional) | https://www.newsvio.in/account (signed-in data and account deletion) |

## 2. Pricing and Availability

| Field | Answer |
|---|---|
| Price | Free |
| In-app purchases | None. See "Payments" in section 6. |
| Availability | India (recommended for launch, see item 6 above). Add other countries only after the DSA trader decision and the privacy policy cover them. |
| Distribution | Public on the App Store |

## 3. Age Rating (the 2025 questionnaire, plus September 2026 social-media questions)

Apple's tiers are now 4+, 9+, 13+, 16+ and 18+. The questionnaire has content descriptors
(None / Infrequent / Frequent) and capability questions.

**Content descriptors**

| Question | Answer | Why |
|---|---|---|
| Cartoon or fantasy violence | None | |
| Realistic violence | None | |
| Prolonged graphic or sadistic violence | None | |
| Profanity or crude humour | None | |
| Mature or suggestive themes | **Infrequent** | Fact-check reports quote the claim the user submitted. Forwards can be about crime, politics or health, so mild mature themes can appear. |
| Horror / fear themes | None | |
| Medical or treatment information | **Infrequent** | Health rumours get fact-checked; reports summarise what sources say. They are not medical advice. |
| Alcohol, tobacco or drug use or references | None | |
| Sexual content or nudity | None | |
| Simulated gambling / real gambling / contests | None | |
| Guns or other weapons | None | |

**Capabilities**

| Question | Answer | Why |
|---|---|---|
| Unrestricted web access | **No** | The app has no browser to go anywhere. It opens specific links (a source in a report, a published story, our help pages) in Safari View Controller. |
| User-generated content | **No** | People submit stories and claims to *us*. Nothing a user writes is shown to other users in the app. Stories appear only on external news portals after our editors approve them. |
| Messaging and chat | No | |
| Advertising | No | No ads, no ad SDKs. |
| Parental controls / in-app controls | No | |
| Age assurance | No | |
| **Social media** (from Sept 2026): "Does your app redistribute, amplify or surface user-generated content to a broad audience through feeds, communities, search or recommendations?" | **No** | There is no feed of user content. "Recently published" is a list of articles our editors chose to feature. |
| Social media for under-13s blocked | Not asked (answered No above) | |

**Expected result:** 13+ (mature themes and medical information, both infrequent). Don't
override it lower.

## 4. App Privacy ("nutrition label")

**Do you or your third-party partners collect data from this app?** Yes.

**Do you use data for tracking?** **No.** No IDFA, no ad networks, no data brokers, no
cross-app linking. So no App Tracking Transparency prompt is needed.

Declare these data types. All are **linked to the user's identity** (signed-in users) and
**not used for tracking**.

| Apple data type | What we collect | Purposes to tick |
|---|---|---|
| Contact Info → **Name** | Full name (profile, Google sign-in) | App Functionality |
| Contact Info → **Email Address** | Login email; order and report emails | App Functionality |
| Contact Info → **Phone Number** | Phone (profile completion, order contact) | App Functionality |
| User Content → **Photos or Videos** | 1–2 images for a story; screenshots for fact checks | App Functionality |
| User Content → **Other User Content** | Story headline and article, Instagram handle, fact-check text and links | App Functionality |
| Identifiers → **User ID** | Account id | App Functionality |
| Identifiers → **Device ID** | A random id the app creates, so guests get their free daily fact checks and the limit can't be dodged. Not the IDFA or vendor id. | App Functionality |
| Purchases → **Purchase History** | Orders, package, amount, status | App Functionality |

**Don't declare:**
- **Payment Info**: card and UPI details go to Razorpay's hosted page and never reach the app or our servers.
- **Diagnostics, Usage Data, Location, Contacts, Browsing History, Search History, Health, Sensitive Info**: not collected. There is no crash reporter, no analytics SDK, and no location or contacts permission.

AI providers (Gemini, Groq, OpenRouter) process fact-check content to provide the service. Apple
counts that as collection for App Functionality; it isn't tracking. The in-app consent
(item 2) and the privacy policy disclose it.

**Privacy manifest** (`ios/NewsVio/PrivacyInfo.xcprivacy`, generated by prebuild):
`NSPrivacyTracking` is false and required-reason API uses are declared (file timestamps C617.1,
UserDefaults CA92.1 and C56D.1, system boot time 35F9.1). *Recommended:* also list the collected
data types above under `NSPrivacyCollectedDataTypes` via `ios.privacyManifests` in `app.json`, so
the manifest and the label match.

## 5. Export Compliance (encryption)

`app.json` sets `ios.config.usesNonExemptEncryption: false`, which writes
`ITSAppUsesNonExemptEncryption = NO`, so App Store Connect doesn't ask per build. Why that is correct:

| Encryption in the app | Exempt because |
|---|---|
| HTTPS/TLS to our API, Supabase and Razorpay | Standard OS networking |
| Keychain storage (`expo-secure-store`) | Apple's own APIs |
| AES-256 of the saved login session in AsyncStorage (`lib/large-secure-store.ts`, key kept in the Keychain) | Standard algorithm used only to protect the user's own login credential (authentication), not to offer encryption to users |

No proprietary algorithms, no end-to-end messaging, no VPN. No export documents or
self-classification report are needed. If a future feature adds user-facing encryption (e.g.
encrypted chat), revisit this.

**France:** no separate declaration is needed for exempt encryption.

## 6. App Review Information and guideline checks

**Sign-in required:** Yes for orders. Fact checking works without an account.
Demo account: `ios.tester@newsvio.in` / password from `~/newsvio-test-accounts.txt`.

**Notes for the reviewer** (paste and adjust):

> NewsVio has two features. (1) A free fact checker: paste a message, link or screenshot and the
> app returns a verdict with sources. The first check asks permission to send the content to
> Google Gemini / Groq / OpenRouter, which can be withdrawn in Profile → Privacy. (2) "Publish
> your story": a paid service where our editorial team reviews a customer's story and manually
> publishes it on partner news websites and our Instagram/Facebook pages, then sends the live
> links and a PDF report. The service is carried out by people outside the app, so per
> guideline 3.1.3(e) it is paid through Razorpay (UPI/cards) on our website, not in-app purchase.
> Use the demo account to see orders. Account deletion: Profile → Delete account.

| Guideline | How we comply |
|---|---|
| 2.1 Completeness | Point the build at production (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SITE_URL=https://www.newsvio.in`). No placeholder text: `/privacy` must be final (item 3), and support contacts come from app settings, with placeholders hidden by `settingText()`. |
| 3.1.1 / **3.1.3(e)** Payments | PR publishing is a real-world service performed by our editors on third-party sites, so external payment (Razorpay hosted page) is the required method, not optional. No digital content is unlocked in the app by paying. |
| **4.8** Login services | **Needs Sign in with Apple** (item 1). |
| **5.1.1(v)** Account deletion | In-app: Profile → Delete account (allowed once there's no active order). Deletes profile, notifications, devices and fact-check uploads. Order records keep the purchase contact details for tax and legal reasons, as the policy says. |
| **5.1.2(i)** Third-party AI | Consent prompt before the first check, naming the providers; withdraw in Profile (item 2). |
| 5.1.1 Data minimisation | Photos: picker only, no camera or microphone (`app.json` sets `cameraPermission: false`, `microphonePermission: false`). Push permission is asked only after the user does something, never at launch. |
| 1.2 User-generated content | Not applicable in-app: no user sees another user's content. Stories pass editorial review before anything is published. |
| 1.1.6 / 5.6 Misleading content | Verdicts are "Likely false / Misleading / Likely true / Unverified", never "FAKE". Every report shows sources, the tools used and a disclaimer. Paid stories are labelled sponsored. |
| 4.2 Minimum functionality | Native screens, haptics, push notifications, PDF sharing. Not a web wrapper. |

**Permissions and their prompts** (`Info.plist`):

| Key | Text |
|---|---|
| `NSPhotoLibraryUsageDescription` | "Allow access to your photos to add images to your story or check a screenshot." |
| Push notifications (`aps-environment` = production) | Asked after the first order or successful check, never at launch |

## 7. Store listing assets

| Asset | Requirement |
|---|---|
| iPhone screenshots | 6.9" display (1320 × 2868 or 1290 × 2796), 3–10 images. Apple scales them to smaller iPhones. `supportsTablet: false`, so no iPad set. |
| App preview video | Optional, up to 30 s |
| Promotional text | 170 chars, can change without a new build |
| Description | Lead with both services. Don't claim to be "official" or name partners we don't have. Fact checkers we search are sources, not partners. |
| Keywords (100 chars) | fact check,fake news,whatsapp forward,press release,PR,publish story,news,verify,India,Dehradun |
| Support URL | https://www.newsvio.in/support |
| Marketing URL | https://www.newsvio.in |
| Copyright | © 2026 <legal entity name> |

## 8. Before every upload

- [ ] Bump `ios.buildNumber` in `app.json` (build 1 was uploaded 2 Oct 2026; build 2 prepared 4 Oct).
- [ ] `npx dotenv -e .env.production -- npx expo prebuild -p ios`, then archive in Xcode 26+.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm test:sql` all green.
- [ ] If the change adds a data type, an SDK or an AI provider, update section 4, `FC_AI_PROVIDERS` and `/privacy` together.

## What changed recently (watch list)

- **31 Jan 2026:** new age-rating questionnaire required for submissions (13+/16+/18+ tiers).
- **Nov 2025:** guideline 5.1.2(i) requires naming third-party AI and asking permission.
- **Sept 2026:** social-media age-rating questions mandatory for new apps and updates.
- **April 2026:** uploads must be built with the iOS 26 SDK. Expect iOS 27 SDK in spring 2027.
- **iOS 27:** apps must adopt the UIScene life cycle or they crash at launch (handled by our plugin).

## Sources

- [Updated age ratings in App Store Connect (Apple)](https://developer.apple.com/news/?id=ks775ehf)
- [Age rating questionnaire now includes social media questions (Apple)](https://developer.apple.com/news/?id=tlur8uvi)
- [Apple adds social media questions (9to5Mac, July 2026)](https://9to5mac.com/2026/07/09/apple-adds-social-media-questions-to-app-store-connect-age-rating-questionnaire/)
- [Age rating updates required by 31 Jan 2026](https://www.socastdigital.com/2025/12/15/important-ios-app-age-rating-updates-required-by-january-31-2026/)
- [Guideline 5.1.2(i): third-party AI data sharing](https://dev.to/arshtechpro/apples-guideline-512i-the-ai-data-sharing-rule-that-will-impact-every-ios-developer-1b0p)
- [Guideline 4.8 login services explained](https://ptkd.com/journal/app-store-rejection-4-8-sign-in-with-apple-requirement-fix)
- [ITSAppUsesNonExemptEncryption, decoded](https://orbitkit.io/blog/app-store-export-compliance-encryption/)
- [Guideline 3.1.3(e) goods and services outside the app (Apple forums)](https://developer.apple.com/forums/thread/747239)
- [Expo: Xcode 27 replaced Simulator.app with Device Hub](https://github.com/expo/expo/issues/46671)
- [Expo: UIScene life cycle backport for SDK 57](https://github.com/expo/expo/pull/50026)
