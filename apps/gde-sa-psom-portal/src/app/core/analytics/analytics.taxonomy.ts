/**
 * Centralised GA4 taxonomy for Gde sa psom.
 *
 * Every value that ends up as a GA4 event parameter comes from here so the
 * reports never see `hotel` / `hotels` / `smestaj` side by side. Components
 * must not pass free-form strings for these dimensions; they pass one of the
 * constants (or run a backend string through the `to*` normalisers below).
 *
 * The values are registered in GA4 Admin as event-scoped custom dimensions -
 * see the "GA4 Admin configuration" section in README.md.
 */

/** Canonical listing / place category. Maps to the `item_category` dimension. */
export const ItemCategory = {
  accommodation: 'accommodation',
  restaurant: 'restaurant',
  cafe: 'cafe',
  bar: 'bar',
  park: 'park',
  beach: 'beach',
  trip: 'trip',
  petShop: 'pet_shop',
  petService: 'pet_service',
  veterinary: 'veterinary',
  activity: 'activity',
  other: 'other',
} as const;
export type ItemCategory = (typeof ItemCategory)[keyof typeof ItemCategory];

/** What the user searched for. Maps to the `search_category` dimension. */
export const SearchCategory = {
  ...ItemCategory,
  /** No category filter - "all pet-friendly spots". */
  all: 'all',
} as const;
export type SearchCategory = (typeof SearchCategory)[keyof typeof SearchCategory];

/** How the search was triggered. Low-cardinality helper next to `search_term`. */
export const SearchType = {
  text: 'text',
  filter: 'filter',
  nearMe: 'near_me',
} as const;
export type SearchType = (typeof SearchType)[keyof typeof SearchType];

/** Where an outbound business action leads. Maps to the `destination_type` dimension. */
export const DestinationType = {
  website: 'website',
  instagram: 'instagram',
  facebook: 'facebook',
  phone: 'phone',
  booking: 'booking',
  directions: 'directions',
  email: 'email',
} as const;
export type DestinationType = (typeof DestinationType)[keyof typeof DestinationType];

/** Which navigation app handled a `get_directions` request. */
export const DirectionsProvider = {
  googleMaps: 'google_maps',
  waze: 'waze',
  appleMaps: 'apple_maps',
} as const;
export type DirectionsProvider = (typeof DirectionsProvider)[keyof typeof DirectionsProvider];

/** Kind of content being viewed or shared. Maps to the `content_type` dimension. */
export const ContentType = {
  article: 'article',
  spot: 'spot',
  park: 'park',
  vetClinic: 'vet_clinic',
} as const;
export type ContentType = (typeof ContentType)[keyof typeof ContentType];

/** Blog call-to-action kinds. Maps to the `cta_type` dimension. */
export const CtaType = {
  /** Link to a single listing (`/spots/:id`). */
  listingLink: 'listing_link',
  /** Link to a listing category / search page (`/all-spots?spotType=…`, `/pet-parks`, `/vet-clinics`). */
  categoryLink: 'category_link',
  /** Any other internal link inside the article body. */
  internalLink: 'internal_link',
  /** Link that leaves the site. */
  externalLink: 'external_link',
} as const;
export type CtaType = (typeof CtaType)[keyof typeof CtaType];

/** Map implementation. Maps to the `map_type` dimension. */
export const MapType = {
  leaflet: 'leaflet',
} as const;
export type MapType = (typeof MapType)[keyof typeof MapType];

/** Logical page a map or interaction lives on. */
export const PageType = {
  spotDetail: 'spot_detail',
  spotList: 'spot_list',
  parkList: 'park_list',
  vetList: 'vet_list',
  blogArticle: 'blog_article',
} as const;
export type PageType = (typeof PageType)[keyof typeof PageType];

/** Named lists a listing can be selected from. Maps to the `list_name` dimension. */
export const ListName = {
  featuredSpots: 'featured_spots',
  searchResults: 'search_results',
  parks: 'parks',
  vetClinics: 'vet_clinics',
} as const;
export type ListName = (typeof ListName)[keyof typeof ListName];

/** Share channel. Uses the GA4 recommended `method` parameter. */
export const ShareMethod = {
  facebook: 'facebook',
  whatsapp: 'whatsapp',
  viber: 'viber',
  telegram: 'telegram',
  copyLink: 'copy_link',
} as const;
export type ShareMethod = (typeof ShareMethod)[keyof typeof ShareMethod];

/** Authentication method for `login` / `sign_up`. */
export const AuthMethod = {
  password: 'password',
} as const;
export type AuthMethod = (typeof AuthMethod)[keyof typeof AuthMethod];

/** Only these depth milestones are ever sent. */
export const SCROLL_DEPTH_MILESTONES = [25, 50, 75, 90] as const;
export type ScrollDepth = (typeof SCROLL_DEPTH_MILESTONES)[number];

// ---------------------------------------------------------------------------
// Normalisers: backend (Serbian) strings -> canonical taxonomy values
// ---------------------------------------------------------------------------

/**
 * Backend `ugo_ime` (spot type) -> canonical category.
 * Keep in sync with `shared/helpers/map.helpers.ts#descriptionToKeyMapSpot`.
 */
const SPOT_TYPE_TO_CATEGORY: Readonly<Record<string, ItemCategory>> = {
  kafić: ItemCategory.cafe,
  kafic: ItemCategory.cafe,
  kafeterija: ItemCategory.cafe,
  restoran: ItemCategory.restaurant,
  splav: ItemCategory.restaurant,
  pab: ItemCategory.bar,
  bar: ItemCategory.bar,
  hotel: ItemCategory.accommodation,
  motel: ItemCategory.accommodation,
  apartman: ItemCategory.accommodation,
  teretana: ItemCategory.activity,
  ostalo: ItemCategory.other,
};

/**
 * Converts a backend spot-type label (e.g. `'Kafić'`) to the canonical
 * `item_category`. Unknown or missing labels become `other` rather than
 * leaking raw strings into GA4.
 */
export function toItemCategory(spotType: string | null | undefined): ItemCategory {
  if (!spotType) return ItemCategory.other;
  return SPOT_TYPE_TO_CATEGORY[spotType.trim().toLowerCase()] ?? ItemCategory.other;
}

/** Same as {@link toItemCategory} but `null`/empty means "no category filter". */
export function toSearchCategory(spotType: string | null | undefined): SearchCategory {
  if (!spotType) return SearchCategory.all;
  return toItemCategory(spotType);
}

/**
 * Turns a human label (blog category, city name, …) into a stable, ASCII,
 * snake_case token so the same thing never appears under two spellings.
 * `'Saveti za Šetnju'` -> `'saveti_za_setnju'`. Returns `null` for empty input.
 */
export function toSlug(value: string | null | undefined): string | null {
  if (!value) return null;
  const slug = value
    .normalize('NFD')
    // Strip combining diacritics left behind by NFD (š -> s + U+030C).
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || null;
}
