import { environment } from '../../../env/env.dev';

/** Cloudflare's always-passing test site key; production secret keys reject its tokens. */
const TEST_SITE_KEY = '1x00000000000000000000AA';

/**
 * The public Turnstile site key (`turnstileSiteKey` in the env file). A
 * development build without one uses the test key; a production build
 * without one has no planner form, rather than a widget the API will refuse.
 */
export const TURNSTILE_SITE_KEY: string | null =
  (environment as { turnstileSiteKey?: string }).turnstileSiteKey || (environment.production ? null : TEST_SITE_KEY);
