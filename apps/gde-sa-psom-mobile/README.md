# Gde sa psom: mobile app

Ionic Angular + Capacitor app for Android (iOS later). It uses the same data
layer as the web portal through `@gde/shared/data-access` and `@gde/shared/util`;
only the UI and the platform services in `src/app/core/platform/` are mobile-specific.

## Environment files

`src/env/` is gitignored, as in the portal. Create the three files with these keys:

```ts
// src/env/env.dev.ts (development builds and `nx serve`)
export const environment = {
  apiUrl: 'https://gdesapsom.com/', // must end with '/'
  production: false,
  useCatalogMocks: false,
};
```

- `env.prod.ts`: same `apiUrl`, `production: true`.
- `env.qa.ts` (the `uat` configuration): `apiUrl: 'https://dev.gdesapsom.com/'`.

Development uses the production API, like the portal, because `dev.gdesapsom.com` is an
incomplete mirror: as of 2026-09-26 it lacks `pet-friendly-spots/all/:id` and
`blog/getAll/:slug` (it answers with the website's HTML), so venue and article pages fail there.
Submitting the suggest-a-place forms from a dev build therefore creates real pending entries.

Source files always import `../env/env.dev`; `fileReplacements` in `project.json`
swaps in the right file per configuration.

## Commands

```bash
npx nx serve gde-sa-psom-mobile                 # browser, http://localhost:4300
npx nx test gde-sa-psom-mobile
npx nx lint gde-sa-psom-mobile

npx nx run gde-sa-psom-mobile:cap-sync:development       # debug build (dev API) + copy into android/
npx nx run gde-sa-psom-mobile:cap-run-android:development # build, sync, install on a device/emulator
npx nx run gde-sa-psom-mobile:cap-sync                   # production build (production API)
npx nx run gde-sa-psom-mobile:cap-open-android           # open android/ in Android Studio
```

The configuration after the target name (`development`, `uat`, `production`) is passed on
to `build`. Without one, `build` uses its default, **production**.

## Android toolchain (one-time, Windows)

1. Install Android Studio, then in the SDK Manager add SDK Platform 36, Platform-Tools
   and the Emulator. Create a Pixel device with an API 35 or 36 image.
2. Set `JAVA_HOME` to Android Studio's bundled JDK
   (`C:\Program Files\Android\Android Studio\jbr`) and `ANDROID_HOME` to
   `%LOCALAPPDATA%\Android\Sdk`; add `%ANDROID_HOME%\platform-tools` to `PATH`.
3. `git config core.longpaths true` (Gradle paths get long).

Debug the WebView from desktop Chrome at `chrome://inspect`; native logs with `adb logcat`.

## Icons and splash screens

Sources live in `assets/` (made from the portal logo): `icon-only.png`, `icon-foreground.png` +
`icon-background.png` (adaptive icon), `splash.png`, `splash-dark.png`. After changing them:

```bash
cd apps/gde-sa-psom-mobile && npx capacitor-assets generate --android --assetPath assets
```

## Releasing to Google Play (Android)

1. **Upload key (once).** Create it outside the repo and back it up; losing it means an
   upload-key reset through Play support:
   ```bash
   keytool -genkeypair -v -keystore C:\keys\gdesapsom-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```
   Then create `android/keystore.properties` (gitignored):
   ```properties
   storeFile=C:/keys/gdesapsom-upload.jks
   storePassword=...
   keyAlias=upload
   keyPassword=...
   ```
2. **Version.** Raise `versionCode` (integer, +1 every upload) and `versionName` in
   `android/app/build.gradle`.
3. **Build.** `npx nx run gde-sa-psom-mobile:cap-sync:production`, then in Android Studio
   (`cap-open-android`) *Build > Generate Signed App Bundle*, or from `android/`:
   `gradlew bundleRelease` -> `app/build/outputs/bundle/release/app-release.aab`.
4. **Play Console.** Create the app, enrol in Play App Signing, upload the `.aab` to the
   *Internal testing* track first. Fill in *App content* as described in
   [Google Play: Data safety and App content](#google-play-data-safety-and-app-content).
5. **App Links (optional).** To open website links in the app, publish
   `https://www.gdesapsom.com/.well-known/assetlinks.json` (and on the apex host) with the
   SHA-256 of the **Play app signing** certificate (Play Console > App integrity):
   ```json
   [{ "relation": ["delegate_permission/common.handle_all_urls"],
      "target": { "namespace": "android_app", "package_name": "com.gdesapsom.app",
                  "sha256_cert_fingerprints": ["AA:BB:..."] } }]
   ```
   The paths the app claims are in `AndroidManifest.xml`; `core/platform/deep-links.ts` maps them.

## Analytics (Google Analytics 4 through Firebase)

The app reports to the same GA4 property as the website, as its own Android data stream,
through `@capacitor-firebase/analytics`. Event names and parameters are the website's
(`search`, `filter_applied`, `near_me_used`, `generate_lead`, `share`, `outbound_click`,
`contact_click`, `language_switch`; types in `@gde/shared/util` analytics-events), plus
`screen_view` with the path as `screen_name` (`places/spots/41`) and the route pattern as
`screen_class` (`places/spots/:id`). `search_scope` gains `dog_food`.

**Consent.** Nothing is collected until the user says yes:

- `AndroidManifest.xml` switches collection off by default, denies every consent type,
  and turns off the advertising ID, the SSAID (Android ID) and per-Activity screen reports.
  It also removes the advertising ID permissions that Firebase adds (`AD_ID`,
  `ACCESS_ADSERVICES_AD_ID`, `ACCESS_ADSERVICES_ATTRIBUTION`).
- On first launch `ConsentPromptService` shows a sheet with *Allow* and *Don't allow*. The
  answer is kept in Preferences (`analyticsConsent`) and can be changed in More > Settings >
  Usage statistics. `AnalyticsConsentService` applies it (`setConsent(analytics_storage)` +
  `setEnabled`). Switching it off also calls `resetAnalyticsData()`, which deletes the data
  still on the phone and the app-instance ID.
- `AnalyticsService` drops every event while consent is off. In a browser (`nx serve`) it
  never loads Firebase and logs the events to the console (dev mode only).

**Setup (once).**

1. GA4 > Admin > Data streams > Add stream > Android app, package `com.gdesapsom.app`.
   GA creates or links a Firebase project.
2. Download `google-services.json` into `android/app/`. It holds project identifiers, not
   secrets. Without it the app builds and runs, but Firebase has no project and nothing is sent.
3. `npx nx run gde-sa-psom-mobile:cap-sync:production`, then build as below.
4. Check the events live: `adb shell setprop debug.firebase.analytics.app com.gdesapsom.app`,
   answer *Allow* in the app, and watch GA4 > Admin > DebugView. Undo with
   `adb shell setprop debug.firebase.analytics.app .none.`.

Keep **Google signals** and **Google Ads links** off for this stream. With either one on,
the data counts as shared for advertising: the Data safety answers below and the consent
text would then be wrong. GA4 > Admin > Data retention decides how long event data is kept.
The privacy policy promises at most 14 months.

## Google Play: Data safety and App content

The answers follow from the code as of 2026-09-26. Change them whenever a plugin, SDK or
form that sends data off the phone is added. The privacy policy page on the website
(`/privacy-policy`, portal `pages/privacy-policy-page`, keys `privacy_*`) must say the same.

**Privacy policy URL:** `https://www.gdesapsom.com/privacy-policy`. Deploy the portal before
submitting: the page is new, and the app links to it from More.

**Data safety, overview**

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | Yes |
| Is all of the user data collected by your app encrypted in transit? | Yes (API, Firebase and map tiles are HTTPS only) |
| Which methods of account creation does your app support? | None: the app has no accounts |
| Do you provide a way for users to request that their data is deleted? | Yes: the website contact form, and the Usage statistics switch deletes on-device analytics data |

**Data types.** For every row: *Shared* = No (Google, the hosting provider and Gmail process
data on our behalf as service providers), *Required or optional* = Optional.

| Category | Data type | Ephemeral | Purposes | Where it comes from |
|---|---|---|---|---|
| Location | Approximate location | No | App functionality, Analytics | "Near me" with only coarse permission; Firebase derives the city from the IP |
| Location | Precise location | Yes | App functionality | "Near me": coordinates go to the search API and are not stored |
| Photos and videos | Photos | No | App functionality | Photos attached to a suggested place |
| App activity | App interactions | No | Analytics | Screens, filters, taps on links, shares (Firebase, after consent) |
| App activity | In-app search history | No | App functionality, Analytics | Search terms: sent to the API for results and, after consent, as `search_term` |
| App activity | Other user-generated content | No | App functionality | Name, address, description and contact details of a suggested place or park |
| Device or other IDs | Device or other IDs | No | Analytics | Firebase app-instance ID (after consent); no advertising ID, no Android ID |

Not collected: personal info (name, email, phone), financial info, health, messages,
contacts, calendar, audio, files, app info and performance, web browsing. The app has no
contact form, and recent searches and viewed places stay on the phone.

**Other App content answers**

- *Advertising ID*: "No". The merged manifest has no `AD_ID` or `ACCESS_ADSERVICES_*`
  permission (check `app/build/intermediates/merged_manifest/*/process*MainManifest/AndroidManifest.xml`).
- *Ads*: the app has no ad SDK and no banner or native ads. The Wolt and Glovo buttons are
  affiliate links, which Play's help does not classify either way; answer "Yes" if a venue
  ever pays for its placement.
- *Target audience*: adult age groups only. The app is not aimed at children, and a
  younger audience brings the Families policy with it.

## Notes

- `android/` is a normal Capacitor project and is committed, except what its own
  `.gitignore` lists (the copied web bundle in `app/src/main/assets/public`, build output).
  It is excluded from ESLint, Prettier and Nx (`.nxignore`).
- Signing keys (`*.jks`, `*.keystore`, `keystore.properties`) are gitignored. Keep the
  upload keystore outside the repo and backed up; losing it means an upload-key reset
  through Google Play support.
- `appId` in `capacitor.config.ts` (`com.gdesapsom.app`) cannot change after the first
  Play Store upload.
- Unit tests run transpile-only (`isolatedModules` in `jest.config.ts`) and mock
  `@ionic/angular` / `@capacitor/*`; type errors are caught by `nx build` and lint.
- No Tailwind or daisyUI: Ionic components plus the CSS variables in `src/styles.scss`.
