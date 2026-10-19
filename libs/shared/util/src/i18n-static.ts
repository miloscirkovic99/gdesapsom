/**
 * `@gde/shared/util/i18n-static`: translations bundled into the code instead
 * of fetched over HTTP.
 *
 * Only for the build-time prerenderer. There is no web server while `nx build`
 * renders a page, so the HTTP loader of `provideAppTransloco` would ask the
 * live site for `/assets/i18n/rs.json`. Kept apart from the main entry point
 * so the browser bundles never carry both JSON files.
 */
export * from './lib/i18n/static-transloco-loader';
