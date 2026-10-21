import type { AllowedPetType, SpotType, Township } from '@gde/shared/data-access';
import { Coordinates, descriptionToKeyMap, descriptionToKeyMapSpot, foldPlaceName, pluralKey } from '@gde/shared/util';
import { formatDistance } from '../../shared/format-distance';
import { summarizeTownships, townshipShortName } from '../../shared/ui/township-groups';
import { SPOT_CATEGORIES, SpotCategory, spotTypeIdsByName } from './place-groups';

/** What the venue list is filtered by on the Places tab. */
export interface SpotFilters {
  word: string | null;
  townshipIds: number[];
  /** Venue types (`ugo_id`); empty for every type. A category is several of them. */
  spotTypeIds: number[];
  /** 0 = any (ion-select cannot hold null as an option value). */
  petSizeId: number;
  near: Coordinates | null;
  /** Metres, used only with `near`. */
  radius: number;
}

export const NO_SPOT_FILTERS: SpotFilters = {
  word: null,
  townshipIds: [],
  spotTypeIds: [],
  petSizeId: 0,
  near: null,
  radius: 5000,
};

/** "Near me" radii in metres, the website's options. */
export const RADIUS_OPTIONS: readonly number[] = [1000, 2000, 3000, 5000, 7500, 10000];

export function activeSpotFilterCount(f: SpotFilters): number {
  return [f.townshipIds.length > 0, f.spotTypeIds.length > 0, f.petSizeId > 0, f.near !== null].filter(Boolean).length;
}

/** Active filters as the website reports them in `filter_applied` (same keys, same order). */
export function spotFilterKeys(f: SpotFilters): string[] {
  return [
    ...(f.petSizeId ? ['sta_id'] : []),
    ...(f.spotTypeIds.length ? ['ugo_id'] : []),
    ...(f.townshipIds.length ? ['ops_id'] : []),
    ...(f.near ? ['location'] : []),
  ];
}

/** Body of `pet-friendly-spots/search-query`. */
export interface SpotSearchBody {
  /** Comma-separated township ids. */
  ops_id: string | null;
  ugo_id: number | null;
  sta_id: number | null;
  word: string | null;
  lat: number | null;
  lon: number | null;
  radius: number | null;
  offset: number;
  limit: number;
}

/** One page of one venue type (`typeId` null: every type); the API takes a single `ugo_id`. */
export function toSearchBody(f: SpotFilters, typeId: number | null, offset: number, limit: number): SpotSearchBody {
  return {
    ops_id: f.townshipIds.length ? f.townshipIds.join(',') : null,
    ugo_id: typeId,
    sta_id: f.petSizeId || null,
    word: f.word,
    lat: f.near?.latitude ?? null,
    lon: f.near?.longitude ?? null,
    radius: f.near ? f.radius : null,
    offset,
    limit,
  };
}

/** Venue types in category order (Restoran, Splav, Kafić, Kafeterija, …), then the rest as the API lists them. */
export function orderSpotTypes(spotTypes: readonly SpotType[]): SpotType[] {
  const position = (t: SpotType): [number, number] => {
    const name = foldPlaceName(t.ime);
    for (const [i, c] of SPOT_CATEGORIES.entries()) {
      const j = c.spotTypes.findIndex((type) => foldPlaceName(type) === name);
      if (j >= 0) return [i, j];
    }
    return [SPOT_CATEGORIES.length, 0];
  };
  return spotTypes
    .map((t, i) => ({ t, i, p: position(t) }))
    .sort((a, b) => a.p[0] - b.p[0] || a.p[1] - b.p[1] || a.i - b.i)
    .map(({ t }) => t);
}

/** Every venue type id of a category. */
export function categoryTypeIds(category: SpotCategory, spotTypes: readonly SpotType[]): number[] {
  return spotTypeIdsByName(category.spotTypes, spotTypes);
}

export interface TypeSelection {
  /** Categories whose every type is chosen. */
  categories: SpotCategory[];
  /** Chosen types outside those categories. */
  rest: SpotType[];
}

/** Chosen venue types as people think of them: "Kafići" rather than Kafić + Kafeterija. */
export function summarizeSpotTypes(ids: readonly number[], spotTypes: readonly SpotType[]): TypeSelection {
  const chosen = new Set(ids.map(Number));
  const covered = new Set<number>();
  const categories = SPOT_CATEGORIES.filter((c) => {
    const typeIds = categoryTypeIds(c, spotTypes);
    const all = typeIds.length > 0 && typeIds.every((id) => chosen.has(id));
    if (all) typeIds.forEach((id) => covered.add(id));
    return all;
  });
  const rest = spotTypes.filter((t) => chosen.has(Number(t.id)) && !covered.has(Number(t.id)));
  return { categories, rest };
}

/** A filter label before translation: a key (with params), or text from the API. */
export interface ChipSpec {
  /** What `withoutChip` removes. */
  id: string;
  key?: string;
  params?: Record<string, unknown>;
  text?: string;
}

export interface SpotFilterLookups {
  spotTypes: readonly SpotType[];
  townships: readonly Township[];
  petSizes: readonly AllowedPetType[];
}

/** At most this many townships outside whole cities get a chip each; more become "N opština". */
const TOWNSHIP_CHIPS = 2;

export function spotTypeLabels(ids: readonly number[], spotTypes: readonly SpotType[]): ChipSpec[] {
  const { categories, rest } = summarizeSpotTypes(ids, spotTypes);
  return [
    ...categories.map((c) => ({ id: `cat:${c.slug}`, key: c.labelKey })),
    ...rest.map((t) => {
      const key = descriptionToKeyMapSpot[t.ime];
      return key ? { id: `type:${t.id}`, key } : { id: `type:${t.id}`, text: t.ime };
    }),
  ];
}

/** Whole cities by name, then the other townships; `collapse` counts them instead past two. */
export function placeLabels(
  ids: readonly number[],
  townships: readonly Township[],
  lang: string,
  collapse: boolean,
): ChipSpec[] {
  const { cities, rest } = summarizeTownships(ids, townships);
  const labels: ChipSpec[] = cities.map((c) => ({ id: `city:${c.cityId ?? c.name}`, text: c.name }));
  if (collapse && rest.length > TOWNSHIP_CHIPS) {
    const count = rest.length;
    labels.push({ id: 'townships', key: pluralKey('filter_townships_count', count, lang), params: { count } });
  } else {
    labels.push(...rest.map((t) => ({ id: `township:${t.id}`, text: townshipShortName(t) })));
  }
  return labels;
}

/** The filters in force, in the order of the sheet. The search word has its own field. */
export function spotFilterChips(f: SpotFilters, lookups: SpotFilterLookups, lang: string): ChipSpec[] {
  const chips = spotTypeLabels(f.spotTypeIds, lookups.spotTypes);

  const size = f.petSizeId ? lookups.petSizes.find((s) => Number(s.id) === f.petSizeId) : null;
  if (size) {
    const key = descriptionToKeyMap[size.ime];
    chips.push(key ? { id: 'size', key } : { id: 'size', text: size.ime });
  }

  chips.push(...placeLabels(f.townshipIds, lookups.townships, lang, true));

  if (f.near) {
    chips.push({ id: 'near', key: 'mobile_near_me_radius', params: { distance: formatDistance(f.radius, lang) } });
  }
  return chips;
}

/** `f` without the filter behind chip `id`. */
export function withoutChip(f: SpotFilters, id: string, lookups: SpotFilterLookups): SpotFilters {
  const [kind, value = ''] = id.split(/:(.*)/);
  switch (kind) {
    case 'cat': {
      const category = SPOT_CATEGORIES.find((c) => c.slug === value);
      const drop = new Set(category ? categoryTypeIds(category, lookups.spotTypes) : []);
      return { ...f, spotTypeIds: f.spotTypeIds.filter((t) => !drop.has(t)) };
    }
    case 'type':
      return { ...f, spotTypeIds: f.spotTypeIds.filter((t) => String(t) !== value) };
    case 'size':
      return { ...f, petSizeId: 0 };
    case 'city': {
      const city = summarizeTownships(f.townshipIds, lookups.townships).cities.find(
        (c) => String(c.cityId ?? c.name) === value,
      );
      const drop = new Set(city?.ids ?? []);
      return { ...f, townshipIds: f.townshipIds.filter((t) => !drop.has(t)) };
    }
    case 'township':
      return { ...f, townshipIds: f.townshipIds.filter((t) => String(t) !== value) };
    case 'townships': {
      // The counted chip: keep the whole cities, drop the rest.
      const keep = new Set(summarizeTownships(f.townshipIds, lookups.townships).cities.flatMap((c) => c.ids));
      return { ...f, townshipIds: f.townshipIds.filter((t) => keep.has(t)) };
    }
    case 'near':
      return { ...f, near: null };
    default:
      return f;
  }
}
