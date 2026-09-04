import {  ApplicationConfig, importProvidersFrom, inject, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { appRoutes } from './app.routes';
import { HTTP_INTERCEPTORS, provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { provideTransloco, TRANSLOCO_LOADER } from '@ngneat/transloco';
import { TranslocoHttpLoader } from './transloco/transloco-loader';
import { BrowserAnimationsModule, provideAnimations, } from '@angular/platform-browser/animations';
import { ApiPrefixInterceptor } from './core/interceptors/api-prefix.interceptor';
import { DdosProtectionInterceptor } from './core/interceptors/ddos-protection.interceptor';
import {NgcCookieConsentConfig, provideNgcCookieConsent} from 'ngx-cookieconsent';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../env/env.dev';

/**
 * Opt-in cookie banner. Google Analytics is loaded only after "Prihvatam";
 * "Odbijam" is stored as a real answer so the banner does not nag on every
 * visit. `ConsentService` reads the answer, `AnalyticsService` acts on it.
 * The choice can be changed from the cookie policy page.
 */
const cookieConfig: NgcCookieConsentConfig = {
  cookie: {
    domain: `${environment.cookieDomain}`,
    expiryDays: 365,
  },
  position: 'bottom',
  theme: 'classic',
  palette: {
    popup: {
      background: '#000',
    },
    button: {
      background: '#44cd88',
    },
  },
  type: 'opt-in',
  revokable: false,
  content: {
    message:
      'Koristimo analitičke kolačiće (Google Analytics) da bismo razumeli kako se sajt koristi. Učitavaju se samo uz vašu saglasnost.',
    allow: 'Prihvatam',
    deny: 'Odbijam',
    link: 'Saznaj više',
    href: `${environment.baseUrl}/cookies-policy`,
    policy: 'Politika kolačića',
  },
};
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
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
    provideTransloco({
      config: {
        availableLangs: ['en', 'rs'],
        defaultLang: 'rs',
        // Remove this option if your application doesn't support changing language in runtime.
        reRenderOnLangChange: true,
        prodMode: environment.production,
      },
      loader: TranslocoHttpLoader
    }),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: DdosProtectionInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiPrefixInterceptor,
      multi: true,
    },
    { provide: TRANSLOCO_LOADER, useClass: TranslocoHttpLoader }


  ]
};
