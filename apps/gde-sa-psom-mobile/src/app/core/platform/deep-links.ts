/** The five tab roots; the hardware back button minimises the app from these. */
export const ROOT_TAB_PATHS: ReadonlySet<string> = new Set([
  '/tabs/home',
  '/tabs/places',
  '/tabs/vets',
  '/tabs/catalog',
  '/tabs/more',
]);

/**
 * The app route for a website URL opened from outside (a shared link, a
 * search result). Mirrors the portal's RouteConstants; unknown pages land on Home.
 */
export function webUrlToAppRoute(url: string): string {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return '/tabs/home';
  }
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const [first, second] = parts;
  const enc = encodeURIComponent;

  switch (first) {
    case 'spots':
      return second && second !== 'new' ? `/tabs/places/spots/${enc(second)}` : '/tabs/more/suggest-spot';
    case 'parks':
      return '/tabs/more/suggest-park';
    case 'all-spots':
      return '/tabs/places';
    case 'pet-parks':
      return '/tabs/places?segment=parks';
    case 'vet-clinics':
      return '/tabs/vets';
    case 'dog-food':
      return second ? `/tabs/catalog/food/${enc(second)}` : '/tabs/catalog?segment=food';
    case 'pet-shops':
      return second ? `/tabs/catalog/shops/${enc(second)}` : '/tabs/catalog?segment=shops';
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
