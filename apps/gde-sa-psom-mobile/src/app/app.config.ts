import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, RouteReuseStrategy, withComponentInputBinding } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import {
  Notifier,
  provideApiHttp,
  provideAppConfig,
  SessionStore,
} from '@gde/shared/data-access/core';
import { provideAppTransloco } from '@gde/shared/util';
import { environment } from '../env/env.dev';
import { appRoutes } from './app.routes';
import { AppSettingsService } from './core/platform/app-settings.service';
import { PreferencesSessionStore } from './core/platform/preferences-session-store';
import { ToastNotifier } from './core/platform/toast-notifier';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideIonicAngular(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter(appRoutes, withComponentInputBinding()),

    provideAppConfig({
      apiUrl: environment.apiUrl,
      production: environment.production,
      useCatalogMocks: environment.useCatalogMocks,
    }),
    provideApiHttp(),
    // Translations are bundled with the app: '' fetches /assets/i18n/*.json from the WebView origin.
    provideAppTransloco({ prodMode: environment.production, assetsBaseUrl: '' }),
    { provide: Notifier, useClass: ToastNotifier },
    { provide: SessionStore, useExisting: PreferencesSessionStore },

    provideAppInitializer(() => {
      const session = inject(PreferencesSessionStore);
      const settings = inject(AppSettingsService);
      return Promise.all([session.load(), settings.load()]);
    }),
  ],
};
