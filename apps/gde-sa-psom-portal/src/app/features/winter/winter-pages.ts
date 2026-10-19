import { Route } from '@angular/router';

/**
 * The winter pages: a hub, one page per ski destination and the EU travel
 * guide. They are the only routes prerendered at build time
 * (app.routes.server.ts), so a crawler gets the H1 and the accommodation
 * list in the first HTML response.
 *
 * Imported by eager code (routes, server routes, sitemap), so it holds only
 * paths, names and the Serbian <title> / description of each page; the page
 * copy lives in the lazy chunk.
 *
 * A new path also needs a line in the root .htaccess, which serves the
 * prerendered `<path>/index.html` (see docs/seo/README.md).
 */

export type WinterPageKind = 'hub' | 'destination' | 'euTravel';

export interface WinterDestination {
  /** URL segment and key in winter-data.json. */
  slug: string;
  /** "Kopaonik". */
  name: string;
  /** "na Kopaoniku". */
  locative: string;
}

export interface WinterPage {
  kind: WinterPageKind;
  /** Site-relative URL, e.g. '/zimovanje-sa-psom/kopaonik'. */
  path: string;
  destination: WinterDestination | null;
  title: string;
  description: string;
}

/** Route data key that carries the page path to the page components. */
export const WINTER_PAGE_DATA = 'winterPage';

export const WINTER_HUB_PATH = '/zimovanje-sa-psom';
export const EU_TRAVEL_PATH = '/putovanje-sa-psom-u-eu';

/** The planner the winter pages point to; its links show only once it is live (planner-launch.json). */
export { PLANNER_LIVE, PLANNER_PATH } from '../planner/planner-pages';

const TITLE_SUFFIX = ' | Gde sa psom';

export const WINTER_DESTINATIONS: readonly WinterDestination[] = [
  { slug: 'kopaonik', name: 'Kopaonik', locative: 'na Kopaoniku' },
  { slug: 'zlatibor', name: 'Zlatibor', locative: 'na Zlatiboru' },
  { slug: 'tara', name: 'Tara', locative: 'na Tari' },
];

const DESTINATION_SEO: Readonly<Record<string, { title: string; description: string }>> = {
  kopaonik: {
    title: 'Kopaonik sa psom – smeštaj, restorani i staze za zimovanje',
    description:
      'Zimovanje na Kopaoniku sa psom: smeštaj koji prima pse, restorani u koje psi smeju unutra, zimske staze za šetnju, gondole i najbliži veterinar.',
  },
  zlatibor: {
    title: 'Zlatibor sa psom – pet friendly smeštaj i zimske šetnje',
    description:
      'Zimovanje na Zlatiboru sa psom: smeštaj koji prima pse, restorani gde psi smeju unutra, staze za zimske šetnje, gondola i veterinar u blizini.',
  },
  tara: {
    title: 'Tara sa psom – smeštaj i šetnje kroz zimsku planinu',
    description:
      'Zimovanje na Tari sa psom: smeštaj koji prima pse, restorani u koje psi smeju unutra, zimske staze kroz nacionalni park i najbliži veterinar.',
  },
};

export function destinationPath(destination: WinterDestination): string {
  return `${WINTER_HUB_PATH}/${destination.slug}`;
}

function buildPages(): WinterPage[] {
  return [
    {
      kind: 'hub',
      path: WINTER_HUB_PATH,
      destination: null,
      title: 'Zimovanje sa psom u Srbiji – Kopaonik, Zlatibor i Tara' + TITLE_SUFFIX,
      description:
        'Gde na zimovanje sa psom: smeštaj koji prima pse, restorani gde psi smeju unutra, zimske staze i veterinari na Kopaoniku, Zlatiboru i Tari.',
    },
    ...WINTER_DESTINATIONS.map((destination) => {
      const seo = DESTINATION_SEO[destination.slug];
      if (!seo) throw new Error(`winter-pages.ts: no title for "${destination.slug}"`);
      return {
        kind: 'destination' as const,
        path: destinationPath(destination),
        destination,
        title: seo.title + TITLE_SUFFIX,
        description: seo.description,
      };
    }),
    {
      kind: 'euTravel',
      path: EU_TRAVEL_PATH,
      destination: null,
      title: 'Putovanje sa psom u EU iz Srbije – dokumenta i rokovi' + TITLE_SUFFIX,
      description:
        'Šta je psu potrebno za put iz Srbije u Evropsku uniju: mikročip, vakcina protiv besnila, test na antitela, veterinarsko uverenje i rokovi, korak po korak.',
    },
  ];
}

export const WINTER_PAGES: readonly WinterPage[] = buildPages();

export function findWinterPage(path: string | null | undefined): WinterPage | null {
  return WINTER_PAGES.find((page) => page.path === path) ?? null;
}

/** One explicit route per page, so /zimovanje-sa-psom/divcibare falls through to the not-found page. */
export function winterRoutes(load: {
  hub: Route['loadComponent'];
  destination: Route['loadComponent'];
  euTravel: Route['loadComponent'];
}): Route[] {
  return WINTER_PAGES.map((page) => ({
    path: page.path.slice(1),
    loadComponent: load[page.kind],
    title: page.title,
    data: { description: page.description, [WINTER_PAGE_DATA]: page.path },
  }));
}
