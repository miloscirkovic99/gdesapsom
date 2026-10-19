import { Route } from '@angular/router';
import launch from './planner-launch.json';
import { PET_FRIENDLY_CITIES } from '../pet-friendly/pet-friendly-pages';

/**
 * Routes of the dog planner:
 *
 *   /planer, /planer/<city>   the form (indexable, prerendered)
 *   /plan/:id                 a saved plan (noindex, client-rendered)
 *
 * Imported by eager code (routes, server routes, winter pages), so it holds
 * only paths and the Serbian <title> / description of each page.
 *
 * Nothing is routed or linked until planner-launch.json says `live`: the
 * winter pages ship first, and must not point to a planner whose backend is
 * not deployed yet. tools/generate-sitemap.mjs reads the same file.
 */
export const PLANNER_LIVE: boolean = launch.live === true;

export const PLANNER_PATH = '/planer';
export const PLAN_PATH = '/plan';

/** Route data key that carries the page path to PlannerPageComponent. */
export const PLANNER_PAGE_DATA = 'plannerPage';

export interface PlannerPageInfo {
  path: string;
  /** Preselected city of the "Dan u gradu" tab; null on /planer. */
  citySlug: string | null;
  title: string;
  description: string;
}

const TITLE_SUFFIX = ' | Gde sa psom';

export const PLANNER_PAGES: readonly PlannerPageInfo[] = [
  {
    path: PLANNER_PATH,
    citySlug: null,
    title: 'Planer sa psom – plan dana u gradu ili zimovanja' + TITLE_SUFFIX,
    description:
      'Napravi plan dana sa psom u Beogradu ili Novom Sadu, ili plan zimovanja na Kopaoniku, Zlatiboru i Tari, od mesta iz naše baze, po meri psa i prognoze.',
  },
  ...PET_FRIENDLY_CITIES.map((city) => ({
    path: `${PLANNER_PATH}/${city.slug}`,
    citySlug: city.slug,
    title: `Planer sa psom za ${city.name.nameSr} – dan po meri tvog psa` + TITLE_SUFFIX,
    description: `Plan dana sa psom ${city.locative.nameSr}: šetnje, kafići i restorani koji primaju pse, poređani prema prognozi, veličini i energiji tvog psa.`,
  })),
];

export function findPlannerPage(path: string | null | undefined): PlannerPageInfo | null {
  return PLANNER_PAGES.find((page) => page.path === path) ?? null;
}

export function plannerRoutes(load: { planner: Route['loadComponent']; plan: Route['loadComponent'] }): Route[] {
  if (!PLANNER_LIVE) return [];
  return [
    ...PLANNER_PAGES.map((page) => ({
      path: page.path.slice(1),
      loadComponent: load.planner,
      title: page.title,
      data: { description: page.description, [PLANNER_PAGE_DATA]: page.path },
    })),
    {
      path: `${PLAN_PATH.slice(1)}/:id`,
      loadComponent: load.plan,
      title: 'Plan sa psom' + TITLE_SUFFIX,
      // A personal plan: shared by link, never a search result.
      data: { description: 'Plan dana ili zimovanja sa psom, sastavljen od mesta iz baze Gde sa psom.', noindex: true },
    },
  ];
}
