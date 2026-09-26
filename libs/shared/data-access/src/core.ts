/**
 * `@gde/shared/data-access/core`: what an app needs at bootstrap.
 *
 * Kept apart from the main entry point on purpose. The stores are created by
 * top-level `signalStore()` calls, which the bundler has to treat as side
 * effects, so importing the main barrel from eager code (app config, guards,
 * the app shell) would pull every store into the initial bundle. Eager code
 * imports from here; lazy pages import stores from `@gde/shared/data-access`.
 */
export * from './lib/config/app-config';
export * from './lib/platform/notifier';
export * from './lib/platform/session-store';
export * from './lib/http/api-prefix.interceptor';
export * from './lib/http/ddos-protection.interceptor';
export * from './lib/http/provide-api-http';
export * from './lib/contact/contact-form.service';
