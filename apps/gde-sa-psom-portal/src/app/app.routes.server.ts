import { RenderMode, ServerRoute } from '@angular/ssr';
import { PLANNER_LIVE, PLANNER_PAGES } from './features/planner/planner-pages';
import { WINTER_PAGES } from './features/winter/winter-pages';

/**
 * Which routes `nx build` turns into HTML files (`outputMode: "static"`, so
 * nothing renders on a server in production).
 *
 * Only the winter pages and the planner form are prerendered. Every other
 * route (/plan/:id among them) stays a client-side page served by the SPA
 * fallback, exactly as before; it moves here once its components render
 * without a browser.
 */
const PRERENDERED = [...WINTER_PAGES, ...(PLANNER_LIVE ? PLANNER_PAGES : [])];

export const serverRoutes: ServerRoute[] = [
  ...PRERENDERED.map((page) => ({ path: page.path.slice(1), renderMode: RenderMode.Prerender as const })),
  { path: '**', renderMode: RenderMode.Client },
];
