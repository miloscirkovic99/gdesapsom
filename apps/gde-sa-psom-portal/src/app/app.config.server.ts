import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { provideStaticTranslocoLoader } from '@gde/shared/util/i18n-static';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

/** The browser config plus what the build-time prerenderer needs. */
const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(withRoutes(serverRoutes)), provideStaticTranslocoLoader()],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
