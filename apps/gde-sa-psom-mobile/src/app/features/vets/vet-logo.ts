import { SITE_ORIGIN } from '@gde/shared/util';

/**
 * A clinic's `vetc_logo` as an image URL, or null when it has none.
 *
 * The website puts the value straight into `src`, so a path is relative to the
 * site root there; the app has to add the website's origin itself.
 */
export function vetLogoUrl(value: string | null | undefined): string | null {
  const logo = (value ?? '').trim();
  if (!logo) return null;
  if (/^(https?:|data:image\/)/i.test(logo)) return logo;
  return `${SITE_ORIGIN}/${logo.replace(/^\/+/, '')}`;
}
