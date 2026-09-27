import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withFetch,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { ApiPrefixInterceptor } from './api-prefix.interceptor';
import { DdosProtectionInterceptor } from './ddos-protection.interceptor';

/**
 * HttpClient wired for the gdesapsom API. Interceptor order matters:
 * DdosProtection (timeout, retry, circuit breaker) sees the bare path, then
 * ApiPrefix rewrites it to the full API URL. Needs `provideAppConfig()`.
 */
export function provideApiHttp(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    { provide: HTTP_INTERCEPTORS, useClass: DdosProtectionInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ApiPrefixInterceptor, multi: true },
  ]);
}
