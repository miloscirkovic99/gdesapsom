import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { RouteConstants } from '@gde/shared/util';
import { PET_FRIENDLY_PAGES } from './features/pet-friendly/pet-friendly-pages';

/**
 * Which routes `nx build` turns into HTML files (`outputMode: "static"`, so
 * nothing renders on a server in production).
 *
 * Every public page is prerendered, so crawlers that run no JavaScript get its
 * title, description, canonical, H1, text and links. Pages with an id or slug
 * take theirs from the committed sitemap.xml (the indexable URLs): run
 * `nx run gde-sa-psom-portal:generate-sitemap` before the build so new places
 * get their own HTML. A place added after the build still opens: it falls back
 * to the client-side shell (index.csr.html) until the next release.
 *
 * Forms, login and admin stay client-side: they are noindex and depend on the
 * visitor's session.
 */
const SITEMAP_FILE = join(process.cwd(), 'apps/gde-sa-psom-portal/public/sitemap.xml');
const SITE_ORIGIN = 'https://www.gdesapsom.com';

/** `{ [param]: value }` for every sitemap URL of the form `/<prefix>/<value>`. */
async function sitemapParams(prefix: string, param: string): Promise<Record<string, string>[]> {
  let xml: string;
  try {
    xml = readFileSync(SITEMAP_FILE, 'utf8');
  } catch {
    console.warn(`prerender: ${SITEMAP_FILE} is missing, /${prefix}/* pages stay client-side`);
    return [];
  }

  const start = `${SITE_ORIGIN}/${prefix}/`;
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(([, loc]) => loc.replace(/&amp;/g, '&'))
    .filter((loc) => loc.startsWith(start) && !loc.slice(start.length).includes('/'))
    .map((loc) => ({ [param]: decodeURIComponent(loc.slice(start.length)) }));
}

const fromSitemap = (path: string, prefix: string, param: string): ServerRoute => ({
  path,
  renderMode: RenderMode.Prerender,
  fallback: PrerenderFallback.Client,
  getPrerenderParams: () => sitemapParams(prefix, param),
});

const prerender = (path: string): ServerRoute => ({ path, renderMode: RenderMode.Prerender });

export const serverRoutes: ServerRoute[] = [
  // Before spots/:id, which would otherwise match them.
  { path: RouteConstants.addSpot, renderMode: RenderMode.Client },
  { path: RouteConstants.addPark, renderMode: RenderMode.Client },
  { path: RouteConstants.admin, renderMode: RenderMode.Client },
  { path: `${RouteConstants.admin}/**`, renderMode: RenderMode.Client },
  { path: 'login', renderMode: RenderMode.Client },

  prerender(''),
  prerender(RouteConstants.allSpots),
  prerender(RouteConstants.petParks),
  prerender(RouteConstants.vet_clinics),
  prerender(RouteConstants.dogFood),
  prerender(RouteConstants.petShops),
  prerender(RouteConstants.blog),
  prerender(RouteConstants.about),
  prerender(RouteConstants.business),
  prerender(RouteConstants.cookiesPolicy),
  prerender(RouteConstants.privacyPolicy),
  // All hubs, also the ones below their listing threshold: those render noindex.
  ...PET_FRIENDLY_PAGES.map((page) => prerender(page.path.slice(1))),

  fromSitemap(RouteConstants.spotDetail, 'spots', 'id'),
  fromSitemap(RouteConstants.blogDetails, 'blog', 'slug'),
  fromSitemap(RouteConstants.dogFoodDetail, 'dog-food', 'slug'),
  fromSitemap(RouteConstants.petShopDetail, 'pet-shops', 'slug'),

  // Unknown URLs: the not-found page, rendered in the browser.
  { path: '**', renderMode: RenderMode.Client },
];
