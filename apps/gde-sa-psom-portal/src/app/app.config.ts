import {  ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideAppTransloco } from '@gde/shared/util';
import { BrowserAnimationsModule, provideAnimations, } from '@angular/platform-browser/animations';
import { provideApiHttp, provideAppConfig, Notifier } from '@gde/shared/data-access/core';
import { SnackbarNotifier } from './core/services/snackbar-notifier';
import {NgcCookieConsentConfig, provideNgcCookieConsent} from 'ngx-cookieconsent';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../env/env.dev';

const cookieConfig:NgcCookieConsentConfig = {
  cookie: {
    domain: `${environment.cookieDomain}`
  },
  position: "bottom",
  theme:'classic',
  palette: {
    popup: {
      background: '#000'
    },
    button: {
      background: '#44cd88'
    }
  },
  type: 'info',
  content: {
    "message": "This website uses cookies to ensure you get the best experience on our website.",
    "link": "Learn more",
    "href": `${environment.baseUrl}${'/cookies-policy'}`,
    "policy": "Cookie Policy",

  }
};
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAppConfig({
      apiUrl: environment.apiUrl,
      production: environment.production,
      // Optional key: the env files are gitignored and older copies do not
      // have it. Missing means the real API, the safe default for deployments.
      useCatalogMocks: (environment as { useCatalogMocks?: boolean }).useCatalogMocks === true,
    }),
    provideApiHttp(),
    { provide: Notifier, useClass: SnackbarNotifier },
    provideAnimations(),
    provideRouter(appRoutes,  withInMemoryScrolling({
      scrollPositionRestoration: 'top',
    }),),
    provideNgcCookieConsent(cookieConfig),
    importProvidersFrom(BrowserAnimationsModule),
     provideServiceWorker('ngsw-worker.js', {
      enabled:true,
      registrationStrategy: 'registerWhenStable:3000'
    }),
    provideAppTransloco({ prodMode: environment.production, assetsBaseUrl: environment.baseUrl }),
  ]
};
