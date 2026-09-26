import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  AdminBrand,
  AdminBrandPayload,
  AdminDogFood,
  AdminDogFoodDetail,
  AdminDogFoodPayload,
  AdminImage,
  AdminImagePayload,
  AdminOfferPatch,
  AdminOfferPayload,
  AdminOfferRow,
  AdminPetShop,
  AdminPetShopDetail,
  AdminPetShopPayload,
  OfferMode,
  SavedRef,
} from './catalog-admin.models';
import { bool, lookupRef, num, numOrNull, RawRow, rows, str, strOrNull } from './catalog.mappers';

interface ListEnvelope {
  data: RawRow[];
  total?: number | null;
}

interface ItemEnvelope {
  data: RawRow;
  message?: string;
}

/** Mars handlers read flags as '1' / 1 / true; numbers are the safest across JSON and form bodies. */
const flag = (value: boolean | null | undefined): 0 | 1 => (value ? 1 : 0);

const trimmedOrNull = (value: string | null | undefined): string | null => {
  const text = (value ?? '').trim();
  return text ? text : null;
};

// ── Row mappers ───────────────────────────────────────────────────────────

function toAdminPetShop(row: RawRow): AdminPetShop {
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
    isActive: bool(row['isActive']),
    hasLogo: bool(row['hasLogo']),
    offerCount: num(row['offerCount']),
    createdAt: strOrNull(row['createdAt']),
    updatedAt: strOrNull(row['updatedAt']),
  };
}

function toAdminPetShopDetail(row: RawRow): AdminPetShopDetail {
  return {
    ...toAdminPetShop(row),
    description: strOrNull(row['description']),
    logo: strOrNull(row['logo']),
  };
}

function toAdminDogFood(row: RawRow): AdminDogFood {
  return {
    id: num(row['id']),
    name: str(row['name']),
    slug: str(row['slug']),
    isActive: bool(row['isActive']),
    minPrice: numOrNull(row['minPrice']),
    packageWeightG: numOrNull(row['packageWeightG']),
    isGrainFree: bool(row['isGrainFree']),
    createdAt: strOrNull(row['createdAt']),
    updatedAt: strOrNull(row['updatedAt']),
    brandId: num(row['brandId']),
    brandName: str(row['brandName']),
    brandSlug: str(row['brandSlug']),
    foodTypeId: num(row['foodTypeId']),
    foodType: lookupRef(row, 'foodType'),
    lifeStageId: num(row['lifeStageId']),
    lifeStage: lookupRef(row, 'lifeStage'),
    breedSizeId: num(row['breedSizeId']),
    breedSize: lookupRef(row, 'breedSize'),
    offerCount: num(row['offerCount']),
    imageCount: num(row['imageCount']),
  };
}

function toAdminDogFoodDetail(row: RawRow): AdminDogFoodDetail {
  return {
    ...toAdminDogFood(row),
    description: strOrNull(row['description']),
    ingredients: strOrNull(row['ingredients']),
  };
}

function toAdminBrand(row: RawRow): AdminBrand {
  return {
    id: num(row['id']),
    name: str(row['name']),
    slug: str(row['slug']),
    logoUrl: strOrNull(row['logoUrl']),
    websiteUrl: strOrNull(row['websiteUrl']),
    isActive: row['isActive'] === undefined ? true : bool(row['isActive']),
    productCount: num(row['productCount']),
  };
}

function toAdminImage(row: RawRow): AdminImage {
  return {
    id: num(row['id']),
    sortOrder: num(row['sortOrder']),
    isPrimary: bool(row['isPrimary']),
    altText: strOrNull(row['altText']),
    thumbnail: strOrNull(row['thumbnail']),
    createdAt: strOrNull(row['createdAt']),
  };
}

function toSavedRef(row: RawRow): SavedRef {
  return { id: num(row['id']), slug: str(row['slug']) };
}

function toOfferRow(row: RawRow, mode: OfferMode): AdminOfferRow {
  const base = {
    id: num(row['id']),
    price: numOrNull(row['price']),
    isInStock: bool(row['isInStock']),
    woltUrl: strOrNull(row['offerWoltUrl']),
    glovoUrl: strOrNull(row['offerGlovoUrl']),
    effectiveWoltUrl: strOrNull(row['woltUrl']),
    effectiveGlovoUrl: strOrNull(row['glovoUrl']),
    updatedAt: strOrNull(row['updatedAt']),
  };

  if (mode === 'food') {
    // Editing a product: the partner is the shop.
    const place = [strOrNull(row['townshipName']), strOrNull(row['cityName'])].filter(Boolean).join(', ');
    return {
      ...base,
      partnerId: num(row['petShopId']),
      partnerName: str(row['petShopName']),
      partnerDetail: [str(row['petShopAddress']), place].filter(Boolean).join(' · '),
      thumbnail: null,
    };
  }

  // Editing a shop: the partner is the product.
  const weight = numOrNull(row['packageWeightG']);
  return {
    ...base,
    partnerId: num(row['dogFoodId']),
    partnerName: [str(row['brandName']), str(row['dogFoodName'])].filter(Boolean).join(' '),
    partnerDetail: [str(row['foodTypeNameSr']), weight ? `${weight} g` : ''].filter(Boolean).join(' · '),
    thumbnail: strOrNull(row['thumbnail']),
  };
}

// ── Request bodies ────────────────────────────────────────────────────────

function shopBody(payload: AdminPetShopPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: payload.name.trim(),
    address: payload.address.trim(),
    townshipId: payload.townshipId,
    phone: trimmedOrNull(payload.phone),
    websiteUrl: trimmedOrNull(payload.websiteUrl),
    description: trimmedOrNull(payload.description),
    latitude: payload.latitude,
    longitude: payload.longitude,
    woltUrl: trimmedOrNull(payload.woltUrl),
    glovoUrl: trimmedOrNull(payload.glovoUrl),
    isActive: flag(payload.isActive),
  };
  if (payload.logoBase64) body['logoBase64'] = payload.logoBase64;
  if (payload.clearLogo) body['clearLogo'] = 1;
  if (trimmedOrNull(payload.slug)) body['slug'] = trimmedOrNull(payload.slug);
  return body;
}

function productBody(payload: AdminDogFoodPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: payload.name.trim(),
    brandId: payload.brandId,
    foodTypeId: payload.foodTypeId,
    lifeStageId: payload.lifeStageId,
    breedSizeId: payload.breedSizeId,
    description: trimmedOrNull(payload.description),
    ingredients: trimmedOrNull(payload.ingredients),
    packageWeightG: payload.packageWeightG,
    isGrainFree: flag(payload.isGrainFree),
    isActive: flag(payload.isActive),
  };
  if (trimmedOrNull(payload.slug)) body['slug'] = trimmedOrNull(payload.slug);
  if (payload.imageBase64 && payload.thumbnailBase64) {
    body['imageBase64'] = payload.imageBase64;
    body['thumbnailBase64'] = payload.thumbnailBase64;
  }
  return body;
}

/**
 * Admin read/write access for the catalog (pet shops, dog food, brands,
 * images, offers). Plain HTTP with no mock: the admin panel only makes sense
 * against a real Mars instance.
 *
 * Query strings are written into the URL on purpose: ApiPrefixInterceptor
 * replaces `params` with the session id, so anything passed as HttpParams
 * would be dropped.
 */
@Injectable({ providedIn: 'root' })
export class CatalogAdminApi {
  readonly #http = inject(HttpClient);

  // ── Pet shops ───────────────────────────────────────────────────────────

  listPetShops(): Observable<AdminPetShop[]> {
    return this.#http
      .get<ListEnvelope>('pet-shops/shops?fields=admin')
      .pipe(map((response) => rows(response.data).map(toAdminPetShop)));
  }

  getPetShop(id: number): Observable<AdminPetShopDetail> {
    return this.#http
      .get<ItemEnvelope>(`pet-shops/shops?fields=admin&id=${id}`)
      .pipe(map((response) => toAdminPetShopDetail(response.data)));
  }

  createPetShop(payload: AdminPetShopPayload): Observable<SavedRef> {
    return this.#http
      .post<ItemEnvelope>('pet-shops/shops', shopBody(payload))
      .pipe(map((response) => toSavedRef(response.data)));
  }

  /** Full replace (PUT): every optional field not sent becomes NULL. */
  updatePetShop(id: number, payload: AdminPetShopPayload): Observable<SavedRef> {
    return this.#http
      .put<ItemEnvelope>('pet-shops/shops', { id, ...shopBody(payload) })
      .pipe(map((response) => toSavedRef(response.data)));
  }

  setPetShopActive(id: number, isActive: boolean): Observable<void> {
    return this.#http
      .patch<ItemEnvelope>('pet-shops/shops', { id, isActive: flag(isActive) })
      .pipe(map(() => undefined));
  }

  /** Soft delete by default; `hard` removes the row and its offers for good. */
  deletePetShop(id: number, hard = false): Observable<void> {
    return this.#http
      .post<ItemEnvelope>('pet-shops/shops', { id, hard: flag(hard) })
      .pipe(map(() => undefined));
  }

  // ── Dog food ────────────────────────────────────────────────────────────

  listDogFood(): Observable<AdminDogFood[]> {
    return this.#http
      .get<ListEnvelope>('dog-food/all?fields=admin')
      .pipe(map((response) => rows(response.data).map(toAdminDogFood)));
  }

  getDogFood(id: number): Observable<AdminDogFoodDetail> {
    return this.#http
      .get<ItemEnvelope>(`dog-food/all?fields=admin&id=${id}`)
      .pipe(map((response) => toAdminDogFoodDetail(response.data)));
  }

  createDogFood(payload: AdminDogFoodPayload): Observable<SavedRef> {
    return this.#http
      .post<ItemEnvelope>('dog-food/food', productBody(payload))
      .pipe(map((response) => toSavedRef(response.data)));
  }

  /** Full replace (PUT): every optional field not sent becomes NULL. */
  updateDogFood(id: number, payload: AdminDogFoodPayload): Observable<SavedRef> {
    return this.#http
      .put<ItemEnvelope>('dog-food/food', { id, ...productBody(payload) })
      .pipe(map((response) => toSavedRef(response.data)));
  }

  setDogFoodActive(id: number, isActive: boolean): Observable<void> {
    return this.#http
      .patch<ItemEnvelope>('dog-food/food', { id, isActive: flag(isActive) })
      .pipe(map(() => undefined));
  }

  deleteDogFood(id: number, hard = false): Observable<void> {
    return this.#http
      .post<ItemEnvelope>('dog-food/food', { id, hard: flag(hard) })
      .pipe(map(() => undefined));
  }

  // ── Brands ──────────────────────────────────────────────────────────────

  /** All active brands, including those without products (unlike `dog-food/lookups`). */
  listBrands(): Observable<AdminBrand[]> {
    return this.#http
      .get<ListEnvelope>('dog-food/brands')
      .pipe(map((response) => rows(response.data).map(toAdminBrand)));
  }

  createBrand(payload: AdminBrandPayload): Observable<AdminBrand> {
    return this.#http
      .post<ItemEnvelope>('dog-food/brands', {
        name: payload.name.trim(),
        websiteUrl: trimmedOrNull(payload.websiteUrl),
        logoUrl: trimmedOrNull(payload.logoUrl),
      })
      .pipe(map((response) => toAdminBrand({ ...response.data, isActive: 1, productCount: 0 })));
  }

  // ── Images ──────────────────────────────────────────────────────────────

  listImages(dogFoodId: number): Observable<AdminImage[]> {
    return this.#http
      .get<ListEnvelope>(`dog-food/images?dogFoodId=${dogFoodId}`)
      .pipe(map((response) => rows(response.data).map(toAdminImage)));
  }

  addImage(payload: AdminImagePayload): Observable<number> {
    return this.#http
      .post<ItemEnvelope>('dog-food/images', {
        dogFoodId: payload.dogFoodId,
        imageBase64: payload.imageBase64,
        thumbnailBase64: payload.thumbnailBase64,
        altText: trimmedOrNull(payload.altText),
        isPrimary: flag(payload.isPrimary),
      })
      .pipe(map((response) => num(response.data['id'])));
  }

  setPrimaryImage(id: number): Observable<void> {
    return this.#http
      .patch<ItemEnvelope>('dog-food/images', { id, isPrimary: 1 })
      .pipe(map(() => undefined));
  }

  /** New gallery order; the handler makes the first id the primary image. */
  reorderImages(dogFoodId: number, orderedIds: number[]): Observable<void> {
    return this.#http
      .patch<ItemEnvelope>('dog-food/images', { dogFoodId, order: orderedIds.join(',') })
      .pipe(map(() => undefined));
  }

  deleteImage(id: number): Observable<void> {
    return this.#http.delete<ItemEnvelope>(`dog-food/images?id=${id}`).pipe(map(() => undefined));
  }

  // ── Offers ──────────────────────────────────────────────────────────────

  /** Offers of one product (`food`) or the assortment of one shop (`shop`). */
  listOffers(mode: OfferMode, id: number): Observable<AdminOfferRow[]> {
    const url = mode === 'food' ? `dog-food/offers?dogFoodId=${id}` : `dog-food/offers?petShopId=${id}`;
    return this.#http
      .get<ListEnvelope>(url)
      .pipe(map((response) => rows(response.data).map((row) => toOfferRow(row, mode))));
  }

  /** Upsert on the (product, shop) pair; the handler recomputes `min_price`. */
  upsertOffer(payload: AdminOfferPayload): Observable<void> {
    return this.#http
      .post<ItemEnvelope>('dog-food/offers', {
        dogFoodId: payload.dogFoodId,
        petShopId: payload.petShopId,
        price: payload.price,
        isInStock: flag(payload.isInStock),
        woltUrl: trimmedOrNull(payload.woltUrl),
        glovoUrl: trimmedOrNull(payload.glovoUrl),
      })
      .pipe(map(() => undefined));
  }

  patchOffer(patch: AdminOfferPatch): Observable<void> {
    const body: Record<string, unknown> = { id: patch.id };
    if ('price' in patch) body['price'] = patch.price ?? '';
    if ('isInStock' in patch) body['isInStock'] = flag(patch.isInStock);
    if ('woltUrl' in patch) body['woltUrl'] = trimmedOrNull(patch.woltUrl) ?? '';
    if ('glovoUrl' in patch) body['glovoUrl'] = trimmedOrNull(patch.glovoUrl) ?? '';
    return this.#http.patch<ItemEnvelope>('dog-food/offers', body).pipe(map(() => undefined));
  }

  deleteOffer(id: number): Observable<void> {
    return this.#http.delete<ItemEnvelope>(`dog-food/offers?id=${id}`).pipe(map(() => undefined));
  }
}
