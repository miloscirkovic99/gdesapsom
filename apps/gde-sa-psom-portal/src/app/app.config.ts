import {  ApplicationConfig, importProvidersFrom, inject, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { appRoutes } from './app.routes';
import { HTTP_INTERCEPTORS, provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { provideTransloco, TRANSLOCO_LOADER } from '@ngneat/transloco';
import { TranslocoHttpLoader } from './transloco/transloco-loader';
import { BrowserAnimationsModule, } from '@angular/platform-browser/animations';
import { environment } from '../env/env.dev';
import { ApiPrefixInterceptor } from './core/interceptors/api-prefix.interceptor';
import { DdosProtectionInterceptor } from './core/interceptors/ddos-protection.interceptor';
import {NgcCookieConsentConfig, provideNgcCookieConsent} from 'ngx-cookieconsent';
import { provideServiceWorker } from '@angular/service-worker';

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
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    provideRouter(appRoutes,  withInMemoryScrolling({
      scrollPositionRestoration: 'top',
    }),),
    provideNgcCookieConsent(cookieConfig),
    provideHttpClient(),
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
