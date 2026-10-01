const EXPIRED = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';

export function readCookie(document: Document, name: string): string | null {
  const prefix = `${name}=`;
  const hit = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return hit ? decodeURIComponent(hit.slice(prefix.length)) : null;
}

/**
 * Expires a cookie on the current host and on every parent domain it may
 * have been set for: gtag.js writes `_ga` on the registrable domain
 * (`gdesapsom.com`), the old banner wrote its cookie on `environment.cookieDomain`.
 */
export function deleteCookie(document: Document, name: string): void {
  const base = `${name}=; ${EXPIRED}; path=/`;
  document.cookie = base;

  const parts = document.location.hostname.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const domain = parts.slice(i).join('.');
    document.cookie = `${base}; domain=${domain}`;
    document.cookie = `${base}; domain=.${domain}`;
  }
}
