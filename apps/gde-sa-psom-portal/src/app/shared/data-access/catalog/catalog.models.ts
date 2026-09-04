/**
 * Domain models for the pet shop / dog food catalog.
 *
 * The API (apps/api/v2/dog-food/*, apps/api/v2/pet-shops/*) returns flat
 * camelCase rows aliased in SQL. `catalog.mappers.ts` folds them into the
 * nested shapes below so templates never depend on column aliases.
 */
export type DogFoodSort = 'name' | 'price' | 'new';

export interface LocalizedName {
  nameSr: string;
  nameEn: string;
}

/** Lookup row as served by `dog-food/lookups` (`code` is the stable key). */
export interface LookupItem extends LocalizedName {
  id: number;
  code: string;
}

/** Lookup value embedded in a product / offer row. */
export interface LookupRef extends LocalizedName {
  code: string;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  websiteUrl: string | null;
}

export interface PriceRange {
  minPrice: number | null;
  maxPrice: number | null;
}

export interface CatalogLookups {
  brands: Brand[];
  foodTypes: LookupItem[];
  lifeStages: LookupItem[];
  breedSizes: LookupItem[];
  priceRange: PriceRange;
}

export interface DogFoodBrandRef {
  id: number | null;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface DogFoodListItem {
  id: number;
  name: string;
  slug: string;
  /** Cheapest in-stock offer, or null when no shop lists a price. */
  minPrice: number | null;
  packageWeightG: number | null;
  isGrainFree: boolean;
  createdAt: string | null;
  brand: DogFoodBrandRef;
  foodType: LookupRef;
  lifeStage: LookupRef;
  breedSize: LookupRef;
  /** Primary image thumbnail (base64 data URI) - list endpoints never send the full image. */
  thumbnail: string | null;
  /** Number of shops that currently have the product in stock. */
  offerCount: number;
}

export interface DogFoodImage {
  id: number;
  sortOrder: number;
  isPrimary: boolean;
  altText: string | null;
  image: string;
  thumbnail: string | null;
}

export interface OfferShop {
  id: number;
  name: string;
  slug: string;
  address: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  townshipName: string | null;
  cityName: string | null;
}

/** One shop's listing of one product: the Food -> Offer -> Shop relationship. */
export interface DogFoodOffer {
  id: number;
  price: number | null;
  isInStock: boolean;
  woltUrl: string | null;
  glovoUrl: string | null;
  updatedAt: string | null;
  shop: OfferShop;
}

export interface DogFoodRelated {
  id: number;
  name: string;
  slug: string;
  minPrice: number | null;
  brandName: string;
  thumbnail: string | null;
}

export interface OfferAggregate {
  lowPrice: number | null;
  highPrice: number | null;
  offerCount: number;
}

export interface DogFoodDetail extends Omit<DogFoodListItem, 'thumbnail' | 'offerCount'> {
  description: string | null;
  ingredients: string | null;
  updatedAt: string | null;
  brand: DogFoodBrandRef & { websiteUrl: string | null };
  images: DogFoodImage[];
  offers: DogFoodOffer[];
  aggregate: OfferAggregate;
  related: DogFoodRelated[];
}

export interface DogFoodFilters {
  word: string | null;
  /** food_type.code, e.g. 'dry' */
  foodType: string | null;
  /** life_stage.code, e.g. 'puppy' */
  lifeStage: string | null;
  /** breed_size.code, e.g. 'large' */
  breedSize: string | null;
  /** brand slugs */
  brands: string[];
  grainFree: boolean | null;
  minPrice: number | null;
  maxPrice: number | null;
  sort: DogFoodSort;
}

export const EMPTY_DOG_FOOD_FILTERS: DogFoodFilters = {
  word: null,
  foodType: null,
  lifeStage: null,
  breedSize: null,
  brands: [],
  grainFree: null,
  minPrice: null,
  maxPrice: null,
  sort: 'name',
};

/** Keyset cursor returned by `dog-food/search-query`; sent back verbatim. */
export interface DogFoodCursor {
  lastId: number;
  lastValue: string | number | null;
  sort?: DogFoodSort;
}

export interface PetShopListItem {
  id: number;
  name: string;
  slug: string;
  address: string;
  phone: string | null;
  websiteUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  woltUrl: string | null;
  glovoUrl: string | null;
  townshipId: number | null;
  townshipName: string | null;
  cityId: number | null;
  cityName: string | null;
  /** Products currently in stock at this shop. */
  offerCount: number;
  /** Metres from the searched point; only present for "near me" searches. */
  distanceM: number | null;
}

export interface PetShopOfferFood {
  id: number;
  name: string;
  slug: string;
  packageWeightG: number | null;
  isGrainFree: boolean;
  brandName: string;
  brandSlug: string | null;
  foodType: LookupRef;
  lifeStage: LookupRef;
  thumbnail: string | null;
}

/** One product in a shop's assortment: the Shop -> Offer -> Food direction. */
export interface PetShopOffer {
  offerId: number;
  price: number | null;
  isInStock: boolean;
  woltUrl: string | null;
  glovoUrl: string | null;
  updatedAt: string | null;
  food: PetShopOfferFood;
}

export interface PetShopSummary {
  offerCount: number;
  brandCount: number;
  lowPrice: number | null;
  highPrice: number | null;
}

export interface PetShopNearby {
  id: number;
  name: string;
  slug: string;
  address: string;
}

export interface PetShopDetail extends Omit<PetShopListItem, 'offerCount' | 'distanceM'> {
  description: string | null;
  logo: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  offers: PetShopOffer[];
  summary: PetShopSummary;
  nearby: PetShopNearby[];
}

export interface GeoPoint {
  lat: number;
  lon: number;
  /** metres */
  radius: number;
}

export interface PetShopFilters {
  word: string | null;
  /** opstina.ops_id values */
  townshipIds: number[];
  hasDelivery: boolean;
  near: GeoPoint | null;
}

export const EMPTY_PET_SHOP_FILTERS: PetShopFilters = {
  word: null,
  townshipIds: [],
  hasDelivery: false,
  near: null,
};

/** Name-sorted searches use keyset paging; geo searches use an offset. Sent back verbatim. */
export type PetShopCursor = { lastId: number; lastValue: string } | { offset: number };

export interface PagedResult<T, C> {
  data: T[];
  /** Only the first page carries a total; later pages send null. */
  total: number | null;
  cursor: C | null;
}

export const DOG_FOOD_PAGE_SIZE = 12;
export const PET_SHOP_PAGE_SIZE = 12;
