import {
  CatalogLookups,
  DogFoodFilters,
  DogFoodSort,
  EMPTY_DOG_FOOD_FILTERS,
  EMPTY_PET_SHOP_FILTERS,
  LookupItem,
  PetShopFilters,
  Township,
} from '@gde/shared/data-access';
import { LocalNamePipe, pluralKey, RsdPricePipe } from '@gde/shared/util';
import type { FilterChip } from '../../shared/ui/filter-chips.component';

/** TranslocoService.translate, passed in so these stay plain functions. */
export type Translate = (key: string, params?: Record<string, unknown>) => string;

const localName = new LocalNamePipe();
const rsdPrice = new RsdPricePipe();

/** Active dog-food filters for `filter_applied`. The sort order is not a filter. */
export function foodFilterKeys(f: DogFoodFilters): string[] {
  return [
    ...(f.foodType ? ['food_type'] : []),
    ...(f.lifeStage ? ['life_stage'] : []),
    ...(f.breedSize ? ['breed_size'] : []),
    ...(f.brands.length ? ['brand'] : []),
    ...(f.grainFree !== null ? ['grain_free'] : []),
    ...(f.minPrice !== null || f.maxPrice !== null ? ['price'] : []),
  ];
}

/** Active pet-shop filters for `filter_applied`, named like the venue filters where they match. */
export function shopFilterKeys(f: PetShopFilters): string[] {
  return [
    ...(f.townshipIds.length ? ['ops_id'] : []),
    ...(f.hasDelivery ? ['delivery'] : []),
    ...(f.near ? ['location'] : []),
  ];
}

// ── Price range ─────────────────────────────────────────────────────────────

/** A typed price bound. Empty, negative or non-numeric input means no bound. */
export function parsePrice(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Swaps the bounds when the lower one is higher, rather than searching an empty range. */
export function withOrderedPrices(f: DogFoodFilters): DogFoodFilters {
  const { minPrice, maxPrice } = f;
  return minPrice !== null && maxPrice !== null && minPrice > maxPrice
    ? { ...f, minPrice: maxPrice, maxPrice: minPrice }
    : f;
}

function priceLabel(min: number | null, max: number | null, lang: string, t: Translate): string | null {
  if (min !== null && max !== null) {
    const from = new Intl.NumberFormat(lang.startsWith('en') ? 'en-US' : 'sr-Latn-RS').format(min);
    return `${from} – ${rsdPrice.transform(max, lang)}`;
  }
  if (min !== null) return t('price_from', { price: rsdPrice.transform(min, lang) });
  if (max !== null) return t('price_up_to', { price: rsdPrice.transform(max, lang) });
  return null;
}

// ── Active filter chips ─────────────────────────────────────────────────────
// Chip ids: 'foodType' | 'lifeStage' | 'breedSize' | 'brand:<slug>' | 'grainFree' | 'price'
// for dog food, 'township:<id>' | 'delivery' | 'near' for pet shops.

export function foodFilterChips(
  f: DogFoodFilters,
  lookups: CatalogLookups | null,
  lang: string,
  t: Translate,
): FilterChip[] {
  const nameOf = (list: LookupItem[] | undefined, code: string): string => {
    const match = list?.find((item) => item.code === code);
    return match ? localName.transform(match, lang) : code;
  };

  const chips: FilterChip[] = [];
  if (f.foodType) chips.push({ id: 'foodType', label: nameOf(lookups?.foodTypes, f.foodType) });
  if (f.lifeStage) chips.push({ id: 'lifeStage', label: nameOf(lookups?.lifeStages, f.lifeStage) });
  if (f.breedSize) chips.push({ id: 'breedSize', label: nameOf(lookups?.breedSizes, f.breedSize) });
  for (const slug of f.brands) {
    chips.push({ id: `brand:${slug}`, label: lookups?.brands.find((b) => b.slug === slug)?.name ?? slug });
  }
  if (f.grainFree) chips.push({ id: 'grainFree', label: t('grain_free') });
  const price = priceLabel(f.minPrice, f.maxPrice, lang, t);
  if (price) chips.push({ id: 'price', label: price });
  return chips;
}

export function withoutFoodChip(f: DogFoodFilters, id: string): DogFoodFilters {
  switch (id) {
    case 'foodType':
      return { ...f, foodType: null };
    case 'lifeStage':
      return { ...f, lifeStage: null };
    case 'breedSize':
      return { ...f, breedSize: null };
    case 'grainFree':
      return { ...f, grainFree: null };
    case 'price':
      return { ...f, minPrice: null, maxPrice: null };
  }
  if (id.startsWith('brand:')) {
    const slug = id.slice('brand:'.length);
    return { ...f, brands: f.brands.filter((b) => b !== slug) };
  }
  return f;
}

export function shopFilterChips(f: PetShopFilters, townships: Township[], t: Translate): FilterChip[] {
  const chips: FilterChip[] = f.townshipIds.map((id) => ({
    id: `township:${id}`,
    label: townships.find((township) => township.id === id)?.ime ?? t('filter_township'),
  }));
  if (f.hasDelivery) chips.push({ id: 'delivery', label: t('filter_has_delivery') });
  if (f.near) chips.push({ id: 'near', label: `${t('mobile_near_me')} · ${f.near.radius / 1000} km` });
  return chips;
}

export function withoutShopChip(f: PetShopFilters, id: string): PetShopFilters {
  if (id === 'delivery') return { ...f, hasDelivery: false };
  if (id === 'near') return { ...f, near: null };
  if (id.startsWith('township:')) {
    const townshipId = Number(id.slice('township:'.length));
    return { ...f, townshipIds: f.townshipIds.filter((existing) => existing !== townshipId) };
  }
  return f;
}

/** The municipality row of the shop filter sheet: one or two names, else a count. Null for none. */
export function townshipSummary(ids: number[], townships: Township[], lang: string, t: Translate): string | null {
  if (!ids.length) return null;
  const names = ids.map((id) => townships.find((township) => township.id === id)?.ime);
  if (names.length <= 2 && names.every(Boolean)) return names.join(', ');
  return t(pluralKey('filter_townships_count', ids.length, lang), { count: ids.length });
}

// ── Entry from a link ───────────────────────────────────────────────────────

/**
 * Query params the catalog reads: `segment` (food | shops), the website's
 * /dog-food params (q, type, stage, size, brand, grainFree, minPrice, maxPrice, sort)
 * and its /pet-shops params (q, township, delivery), plus `t`: the stamp Home puts on its
 * links (freshLink in places/place-links.ts) so the same tile tapped again still applies.
 */
export const CATALOG_QUERY_PARAMS = [
  'segment',
  't',
  'q',
  'type',
  'stage',
  'size',
  'brand',
  'grainFree',
  'minPrice',
  'maxPrice',
  'sort',
  'township',
  'delivery',
] as const;

const FOOD_PARAMS = ['type', 'stage', 'size', 'brand', 'grainFree', 'minPrice', 'maxPrice', 'sort'];
const SHOP_PARAMS = ['township', 'delivery'];

interface ParamSource {
  get(name: string): string | null;
}

export interface CatalogEntry {
  segment: 'food' | 'shops' | null;
  /** Set when the link carries dog-food filters; replaces the current ones. */
  food: DogFoodFilters | null;
  /** Set when the link carries pet-shop filters; replaces the current ones. */
  shops: PetShopFilters | null;
}

/** Identifies a set of catalog params, to tell a new link from the same one shown again. */
export function catalogParamsKey(params: ParamSource): string {
  return CATALOG_QUERY_PARAMS.map((name) => params.get(name) ?? '').join('\n');
}

/**
 * What a link into the catalog asks for. `q` belongs to the segment the link
 * names; without one, shop-only params mean shops and anything else means food.
 */
export function catalogEntry(params: ParamSource): CatalogEntry {
  const get = (name: string): string | null => params.get(name)?.trim() || null;
  const listOf = (name: string): string[] =>
    (get(name) ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  const hasAny = (names: string[]): boolean => names.some((name) => get(name) !== null);

  const named = get('segment');
  const segment =
    named === 'food' || named === 'shops'
      ? named
      : hasAny(SHOP_PARAMS)
        ? 'shops'
        : hasAny(['q', ...FOOD_PARAMS])
          ? 'food'
          : null;

  const sort = get('sort');
  const food: DogFoodFilters | null =
    segment === 'food' && hasAny(['q', ...FOOD_PARAMS])
      ? withOrderedPrices({
          ...EMPTY_DOG_FOOD_FILTERS,
          word: get('q'),
          foodType: get('type'),
          lifeStage: get('stage'),
          breedSize: get('size'),
          brands: listOf('brand'),
          grainFree: get('grainFree') === '1' ? true : null,
          minPrice: parsePrice(get('minPrice')),
          maxPrice: parsePrice(get('maxPrice')),
          sort: sort === 'price' || sort === 'new' ? (sort as DogFoodSort) : 'name',
        })
      : null;

  const shops: PetShopFilters | null =
    segment === 'shops' && hasAny(['q', ...SHOP_PARAMS])
      ? {
          ...EMPTY_PET_SHOP_FILTERS,
          word: get('q'),
          townshipIds: listOf('township')
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0),
          hasDelivery: get('delivery') === '1',
        }
      : null;

  return { segment, food, shops };
}
