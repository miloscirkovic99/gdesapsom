import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { delay, map, Observable, of, switchMap, throwError, timer } from 'rxjs';
import { USE_CATALOG_MOCKS } from './catalog.config';
import { RawRow, toPetShopDetail, toPetShopListItem } from './catalog.mappers';
import { mockPetShopDetail, mockPetShopList } from './catalog.mock-data';
import {
  PagedResult,
  PetShopCursor,
  PetShopDetail,
  PetShopFilters,
  PetShopListItem,
} from './catalog.models';
import { normalizeSearchText } from './dog-food.api';

/**
 * Data access for pet shops. Same token/factory arrangement as `DogFoodApi`.
 */
@Injectable({
  providedIn: 'root',
  useFactory: (): PetShopsApi =>
    USE_CATALOG_MOCKS ? new PetShopsMockApi() : new PetShopsHttpApi(inject(HttpClient)),
})
export abstract class PetShopsApi {
  abstract search(
    filters: PetShopFilters,
    cursor: PetShopCursor | null,
    limit: number,
  ): Observable<PagedResult<PetShopListItem, PetShopCursor>>;
  abstract bySlug(slug: string): Observable<PetShopDetail>;
}

interface SearchEnvelope {
  data: RawRow[];
  total: number | null;
  cursor: PetShopCursor | null;
}

/** Talks to apps/api/v2/pet-shops/*. */
export class PetShopsHttpApi extends PetShopsApi {
  constructor(private readonly http: HttpClient) {
    super();
  }

  search(
    filters: PetShopFilters,
    cursor: PetShopCursor | null,
    limit: number,
  ): Observable<PagedResult<PetShopListItem, PetShopCursor>> {
    const body: Record<string, unknown> = {
      townshipId: filters.townshipIds.length ? filters.townshipIds.join(',') : null,
      word: filters.word,
      hasDelivery: filters.hasDelivery ? '1' : null,
      limit,
    };

    // The handler pages by keyset for name-sorted searches and by offset for
    // geo searches; it decides from the cursor shape, so send exactly what it gave us.
    if (cursor && 'offset' in cursor) {
      body['offset'] = cursor.offset;
    } else if (cursor) {
      body['lastId'] = cursor.lastId;
      body['lastValue'] = cursor.lastValue;
    }

    if (filters.near) {
      body['lat'] = filters.near.lat;
      body['lon'] = filters.near.lon;
      body['radius'] = filters.near.radius;
    }

    return this.http.post<SearchEnvelope>('pet-shops/search-query', body).pipe(
      map((response) => ({
        data: (response.data ?? []).map(toPetShopListItem),
        total: response.total ?? null,
        cursor: response.cursor ?? null,
      })),
    );
  }

  bySlug(slug: string): Observable<PetShopDetail> {
    // The handler cannot attach collections to a DB row (a Mars `IRow` rejects
    // new columns), so they arrive next to `data`; fold them back into one row.
    return this.http
      .get<DetailEnvelope>(`pet-shops/all/${encodeURIComponent(slug)}`)
      .pipe(
        map((response) =>
          toPetShopDetail({
            ...response.data,
            offers: response.offers ?? [],
            summary: response.summary ?? {},
            nearby: response.nearby ?? [],
          }),
        ),
      );
  }
}

interface DetailEnvelope {
  data: RawRow;
  offers?: RawRow[];
  summary?: RawRow;
  nearby?: RawRow[];
}

const MOCK_LATENCY_MS = 350;

function distanceMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** In-memory shops with the same filter, sort and paging semantics as the API. */
export class PetShopsMockApi extends PetShopsApi {
  search(
    filters: PetShopFilters,
    cursor: PetShopCursor | null,
    limit: number,
  ): Observable<PagedResult<PetShopListItem, PetShopCursor>> {
    const word = normalizeSearchText(filters.word);

    let matches = mockPetShopList().filter((shop) => {
      if (filters.townshipIds.length && !filters.townshipIds.includes(shop.townshipId ?? -1)) return false;
      if (filters.hasDelivery && !shop.woltUrl && !shop.glovoUrl) return false;
      if (word && !normalizeSearchText(`${shop.name} ${shop.address}`).includes(word)) return false;
      return true;
    });

    const near = filters.near;
    let page: PetShopListItem[];
    let nextCursor: PetShopCursor | null;

    if (near) {
      matches = matches
        .map((shop) => ({
          ...shop,
          distanceM:
            shop.latitude !== null && shop.longitude !== null
              ? Math.round(distanceMetres(near.lat, near.lon, shop.latitude, shop.longitude))
              : null,
        }))
        .filter((shop) => shop.distanceM !== null && shop.distanceM <= near.radius)
        .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0) || a.id - b.id);

      const offset = cursor && 'offset' in cursor ? cursor.offset : 0;
      page = matches.slice(offset, offset + limit);
      nextCursor = offset + limit < matches.length ? { offset: offset + page.length } : null;
    } else {
      matches.sort((a, b) => a.name.localeCompare(b.name, 'sr') || a.id - b.id);
      const start = cursor && 'lastId' in cursor ? matches.findIndex((s) => s.id === cursor.lastId) + 1 : 0;
      page = matches.slice(start, start + limit);
      const last = page[page.length - 1];
      nextCursor = start + limit < matches.length && last ? { lastId: last.id, lastValue: last.name } : null;
    }

    return of({
      data: page,
      total: cursor ? null : matches.length,
      cursor: nextCursor,
    }).pipe(delay(MOCK_LATENCY_MS));
  }

  bySlug(slug: string): Observable<PetShopDetail> {
    const detail = mockPetShopDetail(slug);
    if (!detail) {
      return timer(MOCK_LATENCY_MS).pipe(
        switchMap(() =>
          throwError(
            () =>
              new HttpErrorResponse({ status: 404, statusText: 'Not Found', url: `pet-shops/all/${slug}` }),
          ),
        ),
      );
    }
    return of(detail).pipe(delay(MOCK_LATENCY_MS));
  }
}
