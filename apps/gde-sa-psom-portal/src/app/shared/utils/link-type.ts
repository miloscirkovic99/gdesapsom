import { LinkType } from '../../core/services/analytics.service';

/** Hosts where a venue's "site or social network" link is a profile, not a website. */
const SOCIAL_HOSTS: readonly string[] = [
  'instagram.com',
  'facebook.com',
  'fb.com',
  'fb.me',
  'tiktok.com',
  'x.com',
  'twitter.com',
  'youtube.com',
  'youtu.be',
  'linkedin.com',
  'threads.net',
];

/**
 * Classifies a venue's `iuo_link_web` / `websiteUrl` for `data-link-type`:
 * an Instagram or Facebook page is `social`, anything else `venue_website`.
 * Tolerates values saved without a scheme ("instagram.com/kafic").
 */
export function venueLinkType(url: string | null | undefined): LinkType {
  const value = url?.trim();
  if (!value) return 'venue_website';

  let hostname: string;
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
    hostname = new URL(withScheme).hostname.replace(/^(www|m)\./, '');
  } catch {
    return 'venue_website';
  }

  const isSocial = SOCIAL_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  return isSocial ? 'social' : 'venue_website';
}
