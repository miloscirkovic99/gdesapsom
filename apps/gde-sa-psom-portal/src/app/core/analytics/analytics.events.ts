/**
 * Typed GA4 event catalogue.
 *
 * `AnalyticsEventMap` is the single source of truth for which events exist and
 * which parameters each one carries. `AnalyticsService` is generic over it, so
 * a typo in an event name or a stray parameter is a compile error.
 *
 * Privacy: nothing in here may carry PII. Listing ids (`item_id`) are public
 * business identifiers, never a person. Search terms are redacted by the
 * service if they look like an email or phone number.
 */
import {
  AuthMethod,
  ContentType,
  CtaType,
  DestinationType,
  DirectionsProvider,
  ItemCategory,
  ListName,
  MapType,
  PageType,
  ScrollDepth,
  SearchCategory,
  SearchType,
  ShareMethod,
} from './analytics.taxonomy';

/** Primitive GA4 parameter value. `null`/`undefined` are dropped before sending. */
export type GaParamValue = string | number | boolean | null | undefined;
export type GaParams = Record<string, GaParamValue>;

/** Identifies a business listing (spot, park, vet clinic). */
export interface ItemParams extends GaParams {
  /** Public listing id (`iuo_id`, `par_id`, `vetc_id`) as a string. */
  item_id: string;
  /** Business name. Not a person. */
  item_name?: string | null;
  item_category: ItemCategory;
  /** City name (`grd_ime`). */
  city?: string | null;
  /** Region. The backend has no region field yet - see README "Missing backend fields". */
  region?: string | null;
}

export interface PageViewParams extends GaParams {
  /** Path without query/fragment, e.g. `/spots/41`. */
  page_path: string;
  page_location: string;
  page_title?: string | null;
}

export interface SearchParams extends GaParams {
  /** Free-text query. Omitted for filter-only searches. */
  search_term?: string | null;
  search_category: SearchCategory;
  results_count: number;
  search_type: SearchType;
  /** City / municipality filter, when exactly one is selected. */
  city?: string | null;
}

/**
 * Everything about a search except the result count, which is only known once
 * the store has loaded. (`Pick`, not `Omit`: `Omit` on an index-signature type
 * collapses to the index signature and loses the named keys.)
 */
export type SearchContext = Pick<
  SearchParams,
  'search_term' | 'search_category' | 'search_type' | 'city'
>;

export type ViewItemParams = ItemParams;

/** The listing identity every business-action event carries. */
export type ItemRef = Pick<ItemParams, 'item_id' | 'item_category' | 'city'>;

export interface SelectItemParams extends ItemParams {
  /** 1-based position inside `list_name`. */
  position: number;
  list_name: ListName;
}

export interface WishlistParams extends GaParams {
  item_id: string;
  item_name?: string | null;
  item_category: ItemCategory;
  city?: string | null;
}

export interface MapOpenParams extends GaParams {
  map_type: MapType;
  page_type: PageType;
}

export interface MapMarkerClickParams extends GaParams {
  item_id: string;
  item_category: ItemCategory;
  city?: string | null;
}

export interface GetDirectionsParams extends GaParams {
  item_id: string;
  item_category: ItemCategory;
  city?: string | null;
  /** Navigation app chosen, when the UI offers a choice. */
  provider?: DirectionsProvider | null;
}

export interface OutboundClickParams extends GaParams {
  destination_type: DestinationType;
  item_id: string;
  item_category: ItemCategory;
  city?: string | null;
}

export interface ClickToCallParams extends GaParams {
  item_id: string;
  item_category: ItemCategory;
  city?: string | null;
}

/** Booking has no PII by design: only which listing, never who. */
export interface BookingParams extends GaParams {
  item_id: string;
  item_category: ItemCategory;
  city?: string | null;
}

export interface ViewBlogParams extends GaParams {
  /** Post slug. */
  content_id: string;
  /** Slugified post category. */
  content_category?: string | null;
  content_type: ContentType;
}

export interface ScrollDepthParams extends GaParams {
  content_id: string;
  content_type: ContentType;
  percent_scrolled: ScrollDepth;
}

export interface BlogCtaClickParams extends GaParams {
  content_id: string;
  cta_type: CtaType;
  destination_category?: ItemCategory | null;
  destination_city?: string | null;
}

export interface ShareParams extends GaParams {
  content_type: ContentType;
  item_id: string;
  method: ShareMethod;
}

export interface AuthParams extends GaParams {
  method: AuthMethod;
}

/**
 * Event name -> parameter shape.
 *
 * GA4 recommended events: page_view, search, view_item, select_item,
 * add_to_wishlist, remove_from_wishlist, share, sign_up, login.
 * Custom (Gde sa psom specific): map_open, map_marker_click, get_directions,
 * outbound_click, click_to_call, booking_start, booking_success, view_blog,
 * scroll_depth, blog_cta_click.
 */
export interface AnalyticsEventMap {
  page_view: PageViewParams;
  search: SearchParams;
  view_item: ViewItemParams;
  select_item: SelectItemParams;
  add_to_wishlist: WishlistParams;
  remove_from_wishlist: WishlistParams;
  map_open: MapOpenParams;
  map_marker_click: MapMarkerClickParams;
  get_directions: GetDirectionsParams;
  outbound_click: OutboundClickParams;
  click_to_call: ClickToCallParams;
  booking_start: BookingParams;
  booking_success: BookingParams;
  view_blog: ViewBlogParams;
  scroll_depth: ScrollDepthParams;
  blog_cta_click: BlogCtaClickParams;
  share: ShareParams;
  sign_up: AuthParams;
  login: AuthParams;
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

/**
 * Future pet-shop ecommerce (not emitted today - there is no cart or checkout).
 *
 * When the shop ships, add `add_to_cart`, `view_cart`, `begin_checkout` and
 * `purchase` to `AnalyticsEventMap` with `{ currency: 'RSD', value: number,
 * items: GaEcommerceItem[] }` payloads, following the GA4 ecommerce reference.
 * `item_category` must stay on the shared `ItemCategory` taxonomy
 * (`pet_shop`), and nothing about the buyer may be attached.
 */
export interface GaEcommerceItem {
  item_id: string;
  item_name: string;
  item_category?: ItemCategory;
  item_brand?: string;
  price?: number;
  quantity?: number;
  index?: number;
  item_list_name?: ListName;
}
