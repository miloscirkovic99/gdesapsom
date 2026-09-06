import {
  Brand,
  CatalogLookups,
  DogFoodDetail,
  DogFoodImage,
  DogFoodListItem,
  DogFoodOffer,
  DogFoodRelated,
  LookupItem,
  LookupRef,
  PetShopDetail,
  PetShopListItem,
  PetShopNearby,
  PetShopOffer,
} from './catalog.models';

/**
 * Normalises the flat camelCase rows from apps/api/v2/dog-food/* and
 * apps/api/v2/pet-shops/* into the nested domain models.
 *
 * MySQL DECIMAL columns arrive as strings and TINYINT(1) flags as 0/1 or
 * booleans depending on the driver, so every scalar goes through a coercer.
 */
export type RawRow = Record<string, unknown>;

// The coercers are exported for catalog-admin.api.ts, which maps the admin
// envelopes with the same rules.
export const str = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

export const strOrNull = (value: unknown): string | null => {
  const text = str(value).trim();
  return text ? text : null;
};

export const num = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const numOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const bool = (value: unknown): boolean =>
  value === true || value === 1 || value === '1' || value === 'true';

export const lookupRef = (row: RawRow, prefix: string): LookupRef => ({
  code: str(row[`${prefix}Code`]),
  nameSr: str(row[`${prefix}NameSr`]),
  nameEn: str(row[`${prefix}NameEn`]),
});

const lookupItem = (row: RawRow): LookupItem => ({
  id: num(row['id']),
  code: str(row['code']),
  nameSr: str(row['name_sr'] ?? row['nameSr']),
  nameEn: str(row['name_en'] ?? row['nameEn']),
});

const brand = (row: RawRow): Brand => ({
  id: num(row['id']),
  name: str(row['name']),
  slug: str(row['slug']),
  logoUrl: strOrNull(row['logo_url'] ?? row['logoUrl']),
  websiteUrl: strOrNull(row['website_url'] ?? row['websiteUrl']),
});

export const rows = (value: unknown): RawRow[] => (Array.isArray(value) ? (value as RawRow[]) : []);

export function toLookups(raw: RawRow): CatalogLookups {
  const priceRange = (raw['priceRange'] ?? {}) as RawRow;
  return {
    brands: rows(raw['brands']).map(brand),
    foodTypes: rows(raw['foodTypes']).map(lookupItem),
    lifeStages: rows(raw['lifeStages']).map(lookupItem),
    breedSizes: rows(raw['breedSizes']).map(lookupItem),
    priceRange: {
      minPrice: numOrNull(priceRange['minPrice'] ?? priceRange['min_price']),
      maxPrice: numOrNull(priceRange['maxPrice'] ?? priceRange['max_price']),
    },
  };
}

export function toDogFoodListItem(row: RawRow): DogFoodListItem {
  return {
    id: num(row['id']),
    name: str(row['name']),
    slug: str(row['slug']),
    minPrice: numOrNull(row['minPrice']),
    packageWeightG: numOrNull(row['packageWeightG']),
    isGrainFree: bool(row['isGrainFree']),
    createdAt: strOrNull(row['createdAt']),
    brand: {
      id: numOrNull(row['brandId']),
      name: str(row['brandName']),
      slug: str(row['brandSlug']),
      logoUrl: strOrNull(row['brandLogoUrl']),
    },
    foodType: lookupRef(row, 'foodType'),
    lifeStage: lookupRef(row, 'lifeStage'),
    breedSize: lookupRef(row, 'breedSize'),
    thumbnail: strOrNull(row['thumbnail']),
    offerCount: num(row['offerCount']),
  };
}

const toImage = (row: RawRow): DogFoodImage => ({
  id: num(row['id']),
  sortOrder: num(row['sortOrder']),
  isPrimary: bool(row['isPrimary']),
  altText: strOrNull(row['altText']),
  image: str(row['image']),
  thumbnail: strOrNull(row['thumbnail']),
});

const toOffer = (row: RawRow): DogFoodOffer => ({
  id: num(row['id']),
  price: numOrNull(row['price']),
  isInStock: bool(row['isInStock']),
  woltUrl: strOrNull(row['woltUrl']),
  glovoUrl: strOrNull(row['glovoUrl']),
  updatedAt: strOrNull(row['updatedAt']),
  shop: {
    id: num(row['petShopId']),
    name: str(row['petShopName']),
    slug: str(row['petShopSlug']),
    address: str(row['petShopAddress']),
    phone: strOrNull(row['petShopPhone']),
    latitude: numOrNull(row['latitude']),
    longitude: numOrNull(row['longitude']),
    townshipName: strOrNull(row['townshipName']),
    cityName: strOrNull(row['cityName']),
  },
});

const toRelated = (row: RawRow): DogFoodRelated => ({
  id: num(row['id']),
  name: str(row['name']),
  slug: str(row['slug']),
  minPrice: numOrNull(row['minPrice']),
  brandName: str(row['brandName']),
  thumbnail: strOrNull(row['thumbnail']),
});

export function toDogFoodDetail(row: RawRow): DogFoodDetail {
  const base = toDogFoodListItem(row);
  const aggregate = (row['aggregate'] ?? {}) as RawRow;
  return {
    id: base.id,
    name: base.name,
    slug: base.slug,
    minPrice: base.minPrice,
    packageWeightG: base.packageWeightG,
    isGrainFree: base.isGrainFree,
    createdAt: base.createdAt,
    updatedAt: strOrNull(row['updatedAt']),
    description: strOrNull(row['description']),
    ingredients: strOrNull(row['ingredients']),
    brand: { ...base.brand, websiteUrl: strOrNull(row['brandWebsiteUrl']) },
    foodType: base.foodType,
    lifeStage: base.lifeStage,
    breedSize: base.breedSize,
    images: rows(row['images']).map(toImage),
    offers: rows(row['offers']).map(toOffer),
    aggregate: {
      lowPrice: numOrNull(aggregate['lowPrice']),
      highPrice: numOrNull(aggregate['highPrice']),
      offerCount: num(aggregate['offerCount']),
    },
    related: rows(row['related']).map(toRelated),
  };
}

export function toPetShopListItem(row: RawRow): PetShopListItem {
  return {
    id: num(row['id']),
    name: str(row['name']),
    slug: str(row['slug']),
    address: str(row['address']),
    phone: strOrNull(row['phone']),
    websiteUrl: strOrNull(row['websiteUrl']),
    latitude: numOrNull(row['latitude']),
    longitude: numOrNull(row['longitude']),
    woltUrl: strOrNull(row['woltUrl']),
    glovoUrl: strOrNull(row['glovoUrl']),
    townshipId: numOrNull(row['townshipId']),
    townshipName: strOrNull(row['townshipName']),
    cityId: numOrNull(row['cityId']),
    cityName: strOrNull(row['cityName']),
    offerCount: num(row['offerCount']),
    distanceM: numOrNull(row['distanceM']),
  };
}

const toShopOffer = (row: RawRow): PetShopOffer => ({
  offerId: num(row['offerId']),
  price: numOrNull(row['price']),
  isInStock: bool(row['isInStock']),
  woltUrl: strOrNull(row['woltUrl']),
  glovoUrl: strOrNull(row['glovoUrl']),
  updatedAt: strOrNull(row['updatedAt']),
  food: {
    id: num(row['dogFoodId']),
    name: str(row['dogFoodName']),
    slug: str(row['dogFoodSlug']),
    packageWeightG: numOrNull(row['packageWeightG']),
    isGrainFree: bool(row['isGrainFree']),
    brandName: str(row['brandName']),
    brandSlug: strOrNull(row['brandSlug']),
    foodType: lookupRef(row, 'foodType'),
    lifeStage: lookupRef(row, 'lifeStage'),
    thumbnail: strOrNull(row['thumbnail']),
  },
});

const toNearby = (row: RawRow): PetShopNearby => ({
  id: num(row['id']),
  name: str(row['name']),
  slug: str(row['slug']),
  address: str(row['address']),
});

export function toPetShopDetail(row: RawRow): PetShopDetail {
  const base = toPetShopListItem(row);
  const summary = (row['summary'] ?? {}) as RawRow;
  return {
    id: base.id,
    name: base.name,
    slug: base.slug,
    address: base.address,
    phone: base.phone,
    websiteUrl: base.websiteUrl,
    latitude: base.latitude,
    longitude: base.longitude,
    woltUrl: base.woltUrl,
    glovoUrl: base.glovoUrl,
    townshipId: base.townshipId,
    townshipName: base.townshipName,
    cityId: base.cityId,
    cityName: base.cityName,
    description: strOrNull(row['description']),
    logo: strOrNull(row['logo']),
    createdAt: strOrNull(row['createdAt']),
    updatedAt: strOrNull(row['updatedAt']),
    offers: rows(row['offers']).map(toShopOffer),
    summary: {
      offerCount: num(summary['offerCount']),
      brandCount: num(summary['brandCount']),
      lowPrice: numOrNull(summary['lowPrice']),
      highPrice: numOrNull(summary['highPrice']),
    },
    nearby: rows(row['nearby']).map(toNearby),
  };
}
