import type { SpotType, Township } from '@gde/shared/data-access';
import { categoryBySlug, cityArea, CityArea, spotTypeIdsByName } from './place-groups';

/**
 * What a link into Places asks for, from Home, a venue page or a website URL
 * (core/platform/deep-links.ts):
 *
 *   ?category=kafici    a category, i.e. several venue types; comma-separated for more
 *   ?spotType=Kafić     venue types by API name (the website's /all-spots?spotType=)
 *   ?city=novi-sad      a whole city: website slug, `grd_ime` or `grd_id`
 *   ?word=bar           the search word
 *   ?segment=parks, ?near=1
 *   ?t=…                a tap in the app (`freshLink`): the same link tapped twice still applies
 *
 * A link replaces the filters on screen. Ionic hands a page its query params
 * again on every tab switch and back navigation, so Places follows each
 * distinct link once (`linkKey`), as Shopping does.
 */
export interface PlacesLink {
  word: string | null;
  categories: string[];
  spotTypes: string[];
  city: string | null;
}

interface ParamSource {
  get(name: string): string | null;
}

const list = (value: string | null): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const LINK_PARAMS = ['segment', 'near', 'word', 'category', 'spotType', 'city', 't'];

/** What tells one link from another; equal keys are the same link handed back. */
export function linkKey(params: ParamSource): string {
  return JSON.stringify(LINK_PARAMS.map((name) => params.get(name)));
}

/** `params` as a new link, applied even when the same one was followed before. */
export function freshLink(params: Record<string, string>): Record<string, string> {
  return { ...params, t: Date.now().toString(36) };
}

/** Null when the link asks for no search (just `?segment=parks`, say). */
export function readPlacesLink(params: ParamSource): PlacesLink | null {
  const word = params.get('word');
  const link: PlacesLink = {
    word: word?.trim() || null,
    categories: list(params.get('category')),
    spotTypes: list(params.get('spotType')),
    city: params.get('city')?.trim() || null,
  };
  const asksSomething = word !== null || link.categories.length > 0 || link.spotTypes.length > 0 || !!link.city;
  return asksSomething ? link : null;
}

/** Which lookup lists must have loaded before the link can become filters. */
export function linkNeeds(link: PlacesLink): { spotTypes: boolean; townships: boolean } {
  return { spotTypes: link.categories.length > 0 || link.spotTypes.length > 0, townships: !!link.city };
}

export interface ResolvedLink {
  word: string | null;
  spotTypeIds: number[];
  townshipIds: number[];
  /** Null when there was no city, or an unknown one (which then does not filter). */
  city: CityArea | null;
}

export function resolvePlacesLink(
  link: PlacesLink,
  spotTypes: readonly SpotType[],
  townships: readonly Township[],
): ResolvedLink {
  const names = [...link.categories.flatMap((slug) => categoryBySlug(slug)?.spotTypes ?? []), ...link.spotTypes];
  const city = cityArea(link.city, townships);
  return {
    word: link.word,
    spotTypeIds: [...new Set(spotTypeIdsByName(names, spotTypes))],
    townshipIds: city?.townshipIds ?? [],
    city,
  };
}

/** Query params of a link that opens the venue list filtered: `routerLink="/tabs/places"` plus these. */
export function placesQueryParams(target: {
  category?: string | null;
  spotType?: string | null;
  city?: string | null;
}): Record<string, string> {
  const params: Record<string, string> = { segment: 'venues' };
  if (target.category) params['category'] = target.category;
  if (target.spotType) params['spotType'] = target.spotType;
  if (target.city) params['city'] = target.city;
  return params;
}
