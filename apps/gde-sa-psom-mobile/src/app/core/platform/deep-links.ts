import { categoryBySlug, HUB_CITIES } from '../../features/places/place-groups';

/** The five tab roots; the hardware back button minimises the app from these. */
export const ROOT_TAB_PATHS: ReadonlySet<string> = new Set([
  '/tabs/home',
  '/tabs/places',
  '/tabs/vets',
  '/tabs/catalog',
  '/tabs/more',
]);

/** Website query params the app's screens read, per website page. */
const SPOT_PARAMS = ['word', 'spotType'];
/** The dog-food filters the website keeps in its URL (portal DogFoodCatalogComponent). */
const FOOD_PARAMS = ['q', 'type', 'stage', 'size', 'brand', 'grainFree', 'minPrice', 'maxPrice', 'sort'];
/** The pet-shop filters the website keeps in its URL (portal PetShopsComponent). */
const SHOP_PARAMS = ['q', 'township', 'delivery'];

const enc = encodeURIComponent;
/** Query values keep their commas readable (`township=3,5`), as Angular writes them. */
const encValue = (value: string) => enc(value).replace(/%2C/gi, ',');

/** `path` with `fixed` params, then the `kept` ones the website URL carries, in that order. */
function withQuery(path: string, fixed: Record<string, string>, search: URLSearchParams, kept: string[] = []): string {
  const pairs = Object.entries(fixed);
  for (const name of kept) {
    const value = search.get(name);
    if (value) pairs.push([name, value]);
  }
  return pairs.length ? `${path}?${pairs.map(([k, v]) => `${enc(k)}=${encValue(v)}`).join('&')}` : path;
}

/**
 * The app route for a website URL opened from outside (a shared link, a
 * search result). Mirrors the portal's RouteConstants and its pet-friendly
 * hub pages (/kafici, /beograd, /novi-sad/barovi), which open the venue list
 * filtered the same way; unknown pages land on Home.
 */
export function webUrlToAppRoute(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return '/tabs/home';
  }
  const parts = parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const [first, second] = parts;
  const search = parsed.searchParams;

  const category = categoryBySlug(first);
  if (category) return withQuery('/tabs/places', { segment: 'venues', category: category.slug }, search);
  const city = HUB_CITIES.find((c) => c.slug === first);
  if (city) {
    const inCity = categoryBySlug(second);
    return withQuery(
      '/tabs/places',
      { segment: 'venues', city: city.slug, ...(inCity ? { category: inCity.slug } : {}) },
      search,
    );
  }

  switch (first) {
    case 'spots':
      return second && second !== 'new' ? `/tabs/places/spots/${enc(second)}` : '/tabs/more/suggest-spot';
    case 'parks':
      return '/tabs/more/suggest-park';
    case 'all-spots':
      return withQuery('/tabs/places', { segment: 'venues' }, search, SPOT_PARAMS);
    case 'pet-parks':
      return '/tabs/places?segment=parks';
    case 'vet-clinics':
      return '/tabs/vets';
    case 'dog-food':
      return second
        ? `/tabs/catalog/food/${enc(second)}`
        : withQuery('/tabs/catalog', { segment: 'food' }, search, FOOD_PARAMS);
    case 'pet-shops':
      return second
        ? `/tabs/catalog/shops/${enc(second)}`
        : withQuery('/tabs/catalog', { segment: 'shops' }, search, SHOP_PARAMS);
    case 'blog':
      return second ? `/tabs/more/blog/${enc(second)}` : '/tabs/more/blog';
    case 'about-us':
      return '/tabs/more/about';
    case 'for-business':
      return '/tabs/more/business';
    default:
      return '/tabs/home';
  }
}
