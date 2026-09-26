import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

/**
 * Runtime settings the shared data layer needs from the app that hosts it.
 *
 * Each app builds this from its own `src/env/env.dev.ts` (swapped per build
 * configuration by `fileReplacements`), so stores, APIs and interceptors never
 * import an environment file themselves.
 */
export interface AppConfig {
  /** API host, ending with `/`. Requests go to `${apiUrl}api/v2/<path>`. */
  apiUrl: string;
  production: boolean;
  /** Serve the dog food / pet shop catalog from in-memory mock data. */
  useCatalogMocks: boolean;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

export function provideAppConfig(config: AppConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: APP_CONFIG, useValue: config }]);
}
