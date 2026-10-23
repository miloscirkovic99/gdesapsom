import { HTTP_INTERCEPTORS, HttpBackend } from '@angular/common/http';
import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { provideStaticTranslocoLoader } from '@gde/shared/util/i18n-static';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { PrerenderBackend, PrerenderInterceptor } from './core/prerender/page-data';

/** The browser config plus what the build-time prerenderer needs. */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideStaticTranslocoLoader(),
    { provide: HTTP_INTERCEPTORS, useClass: PrerenderInterceptor, multi: true },
    { provide: HttpBackend, useClass: PrerenderBackend },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
