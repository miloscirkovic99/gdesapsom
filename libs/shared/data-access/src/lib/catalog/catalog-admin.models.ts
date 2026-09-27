import { LookupRef } from './catalog.models';

/**
 * Admin-side models for the pet shop / dog food catalog.
 *
 * Served by the `fields=admin` mode of `pet-shops/all` and `dog-food/all`,
 * plus `dog-food/images`, `dog-food/offers` and `dog-food/brands`. Unlike the
 * public models these include inactive (soft-deleted) rows and the raw
 * per-offer delivery links.
 */

// ── Pet shops ─────────────────────────────────────────────────────────────

export interface AdminPetShop {
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
  isActive: boolean;
  hasLogo: boolean;
  /** All offers of the shop, in or out of stock. */
  offerCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminPetShopDetail extends AdminPetShop {
  description: string | null;
  /** Logo as a data URI; only the single-item response carries it. */
  logo: string | null;
}

/** Body of `pet-shops/create` (POST) and `pet-shops/update` (PUT, full replace). */
export interface AdminPetShopPayload {
  name: string;
  address: string;
  townshipId: number;
  phone: string | null;
  websiteUrl: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  woltUrl: string | null;
  glovoUrl: string | null;
  isActive: boolean;
  /** Omit to keep the stored logo. */
  logoBase64?: string | null;
  /** PUT only: remove the stored logo. */
  clearLogo?: boolean;
  /** PUT only: change the public URL. Omit / null keeps the current slug. */
  slug?: string | null;
}

// ── Dog food ──────────────────────────────────────────────────────────────

export interface AdminDogFood {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  minPrice: number | null;
  packageWeightG: number | null;
  isGrainFree: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  brandId: number;
  brandName: string;
  brandSlug: string;
  foodTypeId: number;
  foodType: LookupRef;
  lifeStageId: number;
  lifeStage: LookupRef;
  breedSizeId: number;
  breedSize: LookupRef;
  /** All offers of the product, in or out of stock. */
  offerCount: number;
  imageCount: number;
}

export interface AdminDogFoodDetail extends AdminDogFood {
  description: string | null;
  ingredients: string | null;
}

/** Body of `dog-food/create` (POST) and `dog-food/update` (PUT, full replace). */
export interface AdminDogFoodPayload {
  name: string;
  brandId: number;
  foodTypeId: number;
  lifeStageId: number;
  breedSizeId: number;
  description: string | null;
  ingredients: string | null;
  packageWeightG: number | null;
  isGrainFree: boolean;
  isActive: boolean;
  /** PUT only: change the public URL. Omit / null keeps the current slug. */
  slug?: string | null;
  /** POST only: first (primary) gallery image. */
  imageBase64?: string | null;
  thumbnailBase64?: string | null;
}

export interface AdminBrand {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  isActive: boolean;
  productCount: number;
}

export interface AdminBrandPayload {
  name: string;
  websiteUrl: string | null;
  logoUrl: string | null;
}

// ── Images ────────────────────────────────────────────────────────────────

export interface AdminImage {
  id: number;
  sortOrder: number;
  isPrimary: boolean;
  altText: string | null;
  thumbnail: string | null;
  createdAt: string | null;
}

export interface AdminImagePayload {
  dogFoodId: number;
  imageBase64: string;
  thumbnailBase64: string;
  altText?: string | null;
  isPrimary?: boolean;
}

// ── Offers ────────────────────────────────────────────────────────────────

/** Which side of the product x shop relation the dialog is editing from. */
export type OfferMode = 'food' | 'shop';

/**
 * One offer row normalised for the admin dialog: the "partner" is the shop
 * when editing a product's offers, and the product when editing a shop's
 * assortment. `woltUrl` / `glovoUrl` are the offer's own links (may be null);
 * the effective ones fall back to the shop's links, as the public pages show.
 */
export interface AdminOfferRow {
  id: number;
  price: number | null;
  isInStock: boolean;
  woltUrl: string | null;
  glovoUrl: string | null;
  effectiveWoltUrl: string | null;
  effectiveGlovoUrl: string | null;
  updatedAt: string | null;
  partnerId: number;
  partnerName: string;
  partnerDetail: string;
  thumbnail: string | null;
}

/** Body of `dog-food/offers` POST (upsert on the product x shop pair). */
export interface AdminOfferPayload {
  dogFoodId: number;
  petShopId: number;
  price: number | null;
  isInStock: boolean;
  woltUrl: string | null;
  glovoUrl: string | null;
}

/** Body of `dog-food/offers` PATCH; only the sent fields change. */
export interface AdminOfferPatch {
  id: number;
  price?: number | null;
  isInStock?: boolean;
  woltUrl?: string | null;
  glovoUrl?: string | null;
}

export interface SavedRef {
  id: number;
  slug: string;
}
