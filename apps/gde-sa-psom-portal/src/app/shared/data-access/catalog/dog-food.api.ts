import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { delay, map, Observable, of, switchMap, throwError, timer } from 'rxjs';
import { USE_CATALOG_MOCKS } from './catalog.config';
import { RawRow, toDogFoodDetail, toDogFoodListItem, toLookups } from './catalog.mappers';
import { mockDogFoodDetail, mockDogFoodList, mockLookups } from './catalog.mock-data';
import {
  CatalogLookups,
  DogFoodCursor,
  DogFoodDetail,
  DogFoodFilters,
  DogFoodListItem,
  PagedResult,
} from './catalog.models';

/**
 * Data access for the dog food catalog.
 *
 * The abstract class is the injection token; `useFactory` picks the HTTP
 * implementation or the in-memory mock based on `USE_CATALOG_MOCKS`
 * (see catalog.config.ts), so stores and components never know which one
 * they talk to.
 */
@Injectable({
  providedIn: 'root',
  useFactory: (): DogFoodApi =>
    USE_CATALOG_MOCKS ? new DogFoodMockApi() : new DogFoodHttpApi(inject(HttpClient)),
})
export abstract class DogFoodApi {
  abstract lookups(): Observable<CatalogLookups>;
  abstract search(
    filters: DogFoodFilters,
    cursor: DogFoodCursor | null,
    limit: number,
  ): Observable<PagedResult<DogFoodListItem, DogFoodCursor>>;
  abstract bySlug(slug: string): Observable<DogFoodDetail>;
}

interface SearchEnvelope {
  data: RawRow[];
  total: number | null;
  cursor: DogFoodCursor | null;
}

/** Talks to apps/api/v2/dog-food/*; the ApiPrefixInterceptor adds the host and `sid`. */
export class DogFoodHttpApi extends DogFoodApi {
  constructor(private readonly http: HttpClient) {
    super();
  }

  lookups(): Observable<CatalogLookups> {
    return this.http.get<RawRow>('dog-food/lookups').pipe(map(toLookups));
  }

  search(
    filters: DogFoodFilters,
    cursor: DogFoodCursor | null,
    limit: number,
  ): Observable<PagedResult<DogFoodListItem, DogFoodCursor>> {
    const body = {
      foodType: filters.foodType,
      lifeStage: filters.lifeStage,
      breedSize: filters.breedSize,
      brand: filters.brands.length ? filters.brands.join(',') : null,
      grainFree: filters.grainFree === null ? null : filters.grainFree ? '1' : '0',
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      word: filters.word,
      sort: filters.sort,
      limit,
      lastId: cursor?.lastId ?? null,
      lastValue: cursor?.lastValue ?? null,
    };

    return this.http.post<SearchEnvelope>('dog-food/search-query', body).pipe(
      map((response) => ({
        data: (response.data ?? []).map(toDogFoodListItem),
        total: response.total ?? null,
        cursor: response.cursor ?? null,
      })),
    );
  }

  bySlug(slug: string): Observable<DogFoodDetail> {
    // The handler cannot attach collections to a DB row (a Mars `IRow` rejects
    // new columns), so they arrive next to `data`; fold them back into one row.
    return this.http
      .get<DetailEnvelope>(`dog-food/all/${encodeURIComponent(slug)}`)
      .pipe(
        map((response) =>
          toDogFoodDetail({
            ...response.data,
            images: response.images ?? [],
            offers: response.offers ?? [],
            aggregate: response.aggregate ?? {},
            related: response.related ?? [],
          }),
        ),
      );
  }
}

interface DetailEnvelope {
  data: RawRow;
  images?: RawRow[];
  offers?: RawRow[];
  aggregate?: RawRow;
  related?: RawRow[];
}

const MOCK_LATENCY_MS = 350;

/** Same normalisation the API applies to `search_text`: lowercase, no diacritics, đ -> dj. */
export function normalizeSearchText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'dj');
}

/** Filters, sorts and pages the in-memory catalog with the same semantics as the API. */
export class DogFoodMockApi extends DogFoodApi {
  lookups(): Observable<CatalogLookups> {
    return of(mockLookups()).pipe(delay(MOCK_LATENCY_MS));
  }

  search(
    filters: DogFoodFilters,
    cursor: DogFoodCursor | null,
    limit: number,
  ): Observable<PagedResult<DogFoodListItem, DogFoodCursor>> {
    const terms = normalizeSearchText(filters.word).split(/\s+/).filter(Boolean);

    const matches = mockDogFoodList().filter((item) => {
      if (filters.foodType && item.foodType.code !== filters.foodType) return false;
      if (filters.lifeStage && item.lifeStage.code !== filters.lifeStage) return false;
      if (filters.breedSize && item.breedSize.code !== filters.breedSize) return false;
      if (filters.brands.length && !filters.brands.includes(item.brand.slug)) return false;
      if (filters.grainFree !== null && item.isGrainFree !== filters.grainFree) return false;
      if (filters.minPrice !== null && (item.minPrice === null || item.minPrice < filters.minPrice)) return false;
      if (filters.maxPrice !== null && (item.minPrice === null || item.minPrice > filters.maxPrice)) return false;
      if (terms.length) {
        const haystack = normalizeSearchText(`${item.brand.name} ${item.name}`);
        if (!terms.every((term) => haystack.includes(term))) return false;
      }
      return true;
    });

    matches.sort((a, b) => {
      if (filters.sort === 'price') {
        if ((a.minPrice === null) !== (b.minPrice === null)) return a.minPrice === null ? 1 : -1;
        if (a.minPrice !== b.minPrice) return (a.minPrice ?? 0) - (b.minPrice ?? 0);
        return a.id - b.id;
      }
      if (filters.sort === 'new') {
        const byDate = (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
        return byDate !== 0 ? byDate : b.id - a.id;
      }
      const byName = a.name.localeCompare(b.name, 'sr');
      return byName !== 0 ? byName : a.id - b.id;
    });

    const start = cursor ? matches.findIndex((item) => item.id === cursor.lastId) + 1 : 0;
    const page = matches.slice(start, start + limit);
    const last = page[page.length - 1];
    const hasMore = start + limit < matches.length;

    const nextCursor: DogFoodCursor | null =
      hasMore && last
        ? {
            lastId: last.id,
            lastValue:
              filters.sort === 'price' ? last.minPrice : filters.sort === 'new' ? last.createdAt : last.name,
            sort: filters.sort,
          }
        : null;

    return of({
      data: page,
      total: cursor ? null : matches.length,
      cursor: nextCursor,
    }).pipe(delay(MOCK_LATENCY_MS));
  }

  bySlug(slug: string): Observable<DogFoodDetail> {
    const detail = mockDogFoodDetail(slug);
    if (!detail) {
      return timer(MOCK_LATENCY_MS).pipe(
        switchMap(() =>
          throwError(
            () =>
              new HttpErrorResponse({ status: 404, statusText: 'Not Found', url: `dog-food/all/${slug}` }),
          ),
        ),
      );
    }
    return of(detail).pipe(delay(MOCK_LATENCY_MS));
  }
}
