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
    SplashScreen: {
      // Hidden by the app once the first screen has rendered.
      launchAutoHide: false,
      backgroundColor: '#0d542b',
      showSpinner: false,
    },
  },
};

export default config;
