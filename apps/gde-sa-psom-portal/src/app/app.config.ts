import { ApplicationConfig, importProvidersFrom, isDevMode, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { HTTP_INTERCEPTORS, provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideTransloco } from '@ngneat/transloco';
import { TranslocoHttpLoader } from './transloco/transloco-loader';
import { ApiPrefixInterceptor } from './shared/interceptors/api.interceptor';
import { BrowserAnimationsModule, provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    provideRouter(appRoutes),
    provideClientHydration(),
    provideHttpClient(),
    importProvidersFrom(BrowserAnimationsModule),
    provideTransloco({
      config: {
        availableLangs: ['en', 'rs'],
        defaultLang: 'rs',
        // Remove this option if your application doesn't support changing language in runtime.
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader
    }),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiPrefixInterceptor,
      multi: true,
    },
  
  ]
};
