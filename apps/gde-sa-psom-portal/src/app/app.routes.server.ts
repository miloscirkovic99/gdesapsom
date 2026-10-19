import { RenderMode, ServerRoute } from '@angular/ssr';
import { WINTER_PAGES } from './features/winter/winter-pages';

/**
 * Which routes `nx build` turns into HTML files (`outputMode: "static"`, so
 * nothing renders on a server in production).
 *
 * Only the winter pages are prerendered. Every other route stays a
 * client-side page served by the SPA fallback, exactly as before; it moves
 * here once its components render without a browser.
 */
export const serverRoutes: ServerRoute[] = [
  ...WINTER_PAGES.map((page) => ({ path: page.path.slice(1), renderMode: RenderMode.Prerender as const })),
  { path: '**', renderMode: RenderMode.Client },
];
