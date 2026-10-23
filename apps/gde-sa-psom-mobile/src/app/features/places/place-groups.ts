import type { SpotType, Township } from '@gde/shared/data-access';
import { foldPlaceName } from '@gde/shared/util';

/**
 * Venue categories and hub cities as the website's hub pages define them
 * (portal features/pet-friendly/pet-friendly-taxonomy.json). Keep the slugs and
 * the venue types in step with that file: the slugs are the website paths the
 * app opens (/kafici, /novi-sad/barovi, see core/platform/deep-links.ts).
 *
 * A category is several API venue types (`ugo_ime`). The search endpoint takes
 * one `ugo_id` per request, so SpotSearch pages each type on its own and merges them.
 *
 * Eager code (deep links) imports this file: keep it free of stores.
 */
export interface SpotCategory {
  slug: string;
  /** `ugo_objekat.ugo_ime` values that belong to the category. */
  spotTypes: readonly string[];
  /** Translation key of its name, on Home and in the filter chips. */
  labelKey: string;
  /** ionicons name. */
  icon: string;
}

export const SPOT_CATEGORIES: readonly SpotCategory[] = [
  { slug: 'restorani', spotTypes: ['Restoran', 'Splav'], labelKey: 'lp_cat_restaurants', icon: 'restaurant-outline' },
  { slug: 'kafici', spotTypes: ['Kafić', 'Kafeterija'], labelKey: 'mobile_cat_cafes', icon: 'cafe-outline' },
  { slug: 'barovi', spotTypes: ['Bar', 'Pab'], labelKey: 'mobile_cat_bars', icon: 'beer-outline' },
  { slug: 'smestaj', spotTypes: ['Hotel', 'Motel', 'Apartman'], labelKey: 'mobile_cat_stays', icon: 'bed-outline' },
];

export interface HubCity {
  slug: string;
  /** `grad.grd_ime` of the city. */
  name: string;
  labelKey: string;
  /** What the city's page offers, for Home. */
  descriptionKey: string;
}

/** Cities with a hub page on the website (/beograd, /novi-sad, /nis). Any city can be opened in the app. */
export const HUB_CITIES: readonly HubCity[] = [
  { slug: 'beograd', name: 'Beograd', labelKey: 'mobile_city_beograd', descriptionKey: 'lp_hub_beograd' },
  { slug: 'novi-sad', name: 'Novi Sad', labelKey: 'mobile_city_novi_sad', descriptionKey: 'lp_hub_novi_sad' },
  { slug: 'nis', name: 'Niš', labelKey: 'mobile_city_nis', descriptionKey: 'lp_hub_nis' },
];

export function categoryBySlug(slug: string | null | undefined): SpotCategory | null {
  return SPOT_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

/** The category a venue type (`ugo_ime`) belongs to. Gyms and "Ostalo" have none. */
export function categoryForSpotType(name: string | null | undefined): SpotCategory | null {
  const key = foldPlaceName(name);
  if (!key) return null;
  return SPOT_CATEGORIES.find((c) => c.spotTypes.some((type) => foldPlaceName(type) === key)) ?? null;
}

/** Ids of the venue types named `names`, compared without case or diacritics. */
export function spotTypeIdsByName(names: readonly string[], spotTypes: readonly SpotType[]): number[] {
  const wanted = new Set(names.map(foldPlaceName));
  return spotTypes.filter((t) => wanted.has(foldPlaceName(t.ime))).map((t) => Number(t.id));
}

export interface CityArea {
  /** `grd_id`, when the townships carry it. */
  cityId: number | null;
  name: string;
  townshipIds: number[];
}

/**
 * The city `ref` names, with its townships: a website slug ('novi-sad'), a
 * `grd_ime` ('Novi Sad') or a `grd_id` ('3'). `township/:grd_id` is not
 * deployed, so this reads the full township list. Null for an unknown city.
 */
export function cityArea(ref: string | null | undefined, townships: readonly Township[]): CityArea | null {
  const raw = (ref ?? '').trim();
  if (!raw) return null;
  const id = /^\d+$/.test(raw) ? Number(raw) : null;
  const key = foldPlaceName(raw.replace(/-/g, ' '));
  const inCity = townships.filter((t) =>
    id !== null ? Number(t.grd_id) === id : foldPlaceName(t.city_name) === key,
  );
  if (!inCity.length) return null;
  return {
    cityId: inCity[0].grd_id != null ? Number(inCity[0].grd_id) : null,
    name: inCity[0].city_name ?? raw,
    townshipIds: inCity.map((t) => Number(t.id)),
  };
}
