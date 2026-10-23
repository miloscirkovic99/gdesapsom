import {  ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, TitleStrategy, withInMemoryScrolling } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideAppTransloco } from '@gde/shared/util';
import { BrowserAnimationsModule, provideAnimations, } from '@angular/platform-browser/animations';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { transferToBrowser } from './core/prerender/page-data';
import { provideApiHttp, provideAppConfig, Notifier } from '@gde/shared/data-access/core';
import { SnackbarNotifier } from './core/services/snackbar-notifier';
import { SearchTitleStrategy } from './core/services/seo.service';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../env/env.dev';

// The cookie banner is the app's own CookieBannerComponent + ConsentService
// (core/consent); ngx-cookieconsent is no longer used.
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Prerendered pages (app.routes.server.ts) keep their HTML instead of being
    // wiped and redrawn; client-rendered routes have nothing to hydrate.
    provideClientHydration(
      withEventReplay(),
      withHttpTransferCacheOptions({ includePostRequests: true, filter: transferToBrowser }),
    ),
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
    { provide: TitleStrategy, useExisting: SearchTitleStrategy },
    importProvidersFrom(BrowserAnimationsModule),
     provideServiceWorker('ngsw-worker.js', {
      enabled:true,
      registrationStrategy: 'registerWhenStable:3000'
    }),
    provideAppTransloco({ prodMode: environment.production, assetsBaseUrl: environment.baseUrl }),
  ]
};
