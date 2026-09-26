# Gde sa psom: mobile app

Ionic Angular + Capacitor app for Android (iOS later). It uses the same data
layer as the web portal through `@gde/shared/data-access` and `@gde/shared/util`;
only the UI and the platform services in `src/app/core/platform/` are mobile-specific.

## Environment files

`src/env/` is gitignored, as in the portal. Create the three files with these keys:

```ts
// src/env/env.dev.ts (development builds and `nx serve`)
export const environment = {
  apiUrl: 'https://dev.gdesapsom.com/', // must end with '/'
  production: false,
  useCatalogMocks: false,
};
```

- `env.qa.ts` is the same (the `uat` configuration).
- `env.prod.ts` uses `apiUrl: 'https://gdesapsom.com/'` and `production: true`.

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
