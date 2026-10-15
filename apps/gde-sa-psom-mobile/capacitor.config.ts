import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Permanent once the app is on Google Play / the App Store.
  appId: 'com.gdesapsom.app',
  appName: 'Gde sa psom',
  // Build first: `npx nx run gde-sa-psom-mobile:cap-sync` builds and copies this folder.
  webDir: '../../dist/apps/gde-sa-psom-mobile/browser',
  // OpenStreetMap's tile policy asks apps to identify themselves.
  appendUserAgent: 'GdeSaPsom/1.0 (+https://www.gdesapsom.com)',
  android: {
    // Only needed for `cap run android -l` against a dev server on the LAN.
    allowMixedContent: false,
  },
  plugins: {
    // Core plugin. The app draws edge to edge (MainActivity, viewport-fit=cover in
    // index.html). On Android this passes the system bar sizes to the page as
    // --safe-area-inset-*, which Ionic's --ion-safe-area-* read first; with a
    // WebView older than 140 (env(safe-area-inset-*) always 0) it keeps the page
    // out from under the bars instead.
    SystemBars: {
      insetsHandling: 'css',
      // index.html is always `cover`: saying so up front avoids a layout jump at launch.
      initialViewportFitValueHint: 'cover',
    },
    SplashScreen: {
      // Hidden by the app once the first screen has rendered.
      launchAutoHide: false,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
  },
};

export default config;
