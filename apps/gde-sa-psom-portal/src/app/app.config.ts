import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom, isDevMode, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { appRoutes } from './app.routes';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideTransloco, TRANSLOCO_LOADER } from '@ngneat/transloco';
import { TranslocoHttpLoader } from './transloco/transloco-loader';
import { ApiPrefixInterceptor } from './shared/interceptors/api.interceptor';
import { BrowserAnimationsModule, provideAnimations } from '@angular/platform-browser/animations';
import { environment } from '../env/env.dev';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    provideRouter(appRoutes,  withInMemoryScrolling({
      scrollPositionRestoration: 'enabled',
    }),),
    // provideClientHydration(),
    provideHttpClient(),
    importProvidersFrom(BrowserAnimationsModule),
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
      useClass: ApiPrefixInterceptor,
      multi: true,
    },
    { provide: TRANSLOCO_LOADER, useClass: TranslocoHttpLoader }

    
  ]
};
