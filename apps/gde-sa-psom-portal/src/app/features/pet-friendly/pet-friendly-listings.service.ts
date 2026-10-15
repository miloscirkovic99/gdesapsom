import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { City, Park, Spot, SpotType, Township, VetClinic } from '@gde/shared/data-access';
import { foldPlaceName } from '@gde/shared/util';
import { catchError, forkJoin, map, Observable, of, shareReplay, throwError } from 'rxjs';

export interface SpotPage {
  spots: Spot[];
  /** Matches for the whole query, not just this page. */
  total: number;
}

export interface SpotQuery {
  /** Township (`opstina`) ids; null searches the whole country. An empty list matches nothing. */
  townshipIds: readonly number[] | null;
  /** One venue type (`ugo_objekat`) id; null for every type. */
  typeId: number | null;
  offset: number;
  limit: number;
}

export interface CityArea {
  /** `grad.grd_id` of the city. */
  cityIds: number[];
  /** Its townships: the location filter spot search understands. */
  townshipIds: number[];
}

/** The API answers an empty search with 404; for a hub page that is just an empty list. */
const isNotFound = (error: unknown): boolean => error instanceof HttpErrorResponse && error.status === 404;

/**
 * Data for the hub pages, read through the endpoints the rest of the site
 * already uses, so the pages work with the API as it is deployed.
 *
 * It deliberately stays out of SpotsStore: that store holds the /all-spots
 * list and its filters, and reports an empty search as an error snackbar.
 * Lookups (types, cities, townships, parks) are cached for the session.
 */
@Injectable({ providedIn: 'root' })
export class PetFriendlyListingsService {
  readonly #http = inject(HttpClient);

  readonly #spotTypes$ = this.#http
    .get<{ spotTypes?: SpotType[] }>('pet-friendly-spots-types/list')
    .pipe(map((response) => response.spotTypes ?? []), shareReplay(1));

  readonly #cities$ = this.#http
    .get<{ city?: City[] }>('countryandcities')
    .pipe(map((response) => response.city ?? []), shareReplay(1));

  readonly #townships$ = this.#http
    .get<{ township?: Township[] }>('township')
    .pipe(map((response) => response.township ?? []), shareReplay(1));

  readonly #parks$ = this.#http
    .post<{ petFriendlyParks?: Park[] }>('pet-friendly-parks/list', { par_accepted: 1 })
    .pipe(map((response) => response.petFriendlyParks ?? []), shareReplay(1));

  /** Ids of the venue types named `names` (`ugo_ime`), compared without case or diacritics. */
  typeIds(names: readonly string[]): Observable<number[]> {
    const wanted = new Set(names.map(foldPlaceName));
    return this.#spotTypes$.pipe(
      map((types) => types.filter((type) => wanted.has(foldPlaceName(type.ime))).map((type) => Number(type.id))),
    );
  }

  /**
   * The city named `names` and its townships. A township belongs to the city
   * by `grd_id`, or by the `city_name` the township list also carries, so one
   * of the two lookups failing still finds it.
   */
  cityArea(names: readonly string[]): Observable<CityArea> {
    const wanted = new Set(names.map(foldPlaceName));
    return forkJoin([this.#cities$.pipe(catchError(() => of<City[]>([]))), this.#townships$]).pipe(
      map(([cities, townships]) => {
        const cityIds = new Set(
          cities.filter((city) => wanted.has(foldPlaceName(city.grd_ime))).map((city) => Number(city.grd_id)),
        );
        const townshipIds = townships
          .filter(
            (township) =>
              (township.grd_id != null && cityIds.has(Number(township.grd_id))) ||
              wanted.has(foldPlaceName(township.city_name)),
          )
          .map((township) => Number(township.id));

        return { cityIds: [...cityIds], townshipIds: [...new Set(townshipIds)] };
      }),
    );
  }

  /** One page of venues from `pet-friendly-spots/search-query`. */
  searchSpots(query: SpotQuery): Observable<SpotPage> {
    // An unknown city must not turn into "no location filter", i.e. all of Serbia.
    if (query.townshipIds && query.townshipIds.length === 0) return of({ spots: [], total: 0 });

    return this.#http
      .post<{ spotsList?: Spot[]; totalResults?: number | string }>('pet-friendly-spots/search-query', {
        ops_id: query.townshipIds ? query.townshipIds.join(',') : null,
        ugo_id: query.typeId,
        sta_id: null,
        word: null,
        lat: null,
        lon: null,
        radius: null,
        offset: query.offset,
        limit: query.limit,
      })
      .pipe(
        map((response) => ({ spots: response.spotsList ?? [], total: Number(response.totalResults) || 0 })),
        catchError((error) => (isNotFound(error) ? of({ spots: [], total: 0 }) : throwError(() => error))),
      );
  }

  /** Accepted dog parks in the city. Secondary content: a failure is an empty list. */
  parksIn(names: readonly string[]): Observable<Park[]> {
    const wanted = new Set(names.map(foldPlaceName));
    return this.#parks$.pipe(
      map((parks) => parks.filter((park) => wanted.has(foldPlaceName(park.grd_ime)))),
      catchError(() => of<Park[]>([])),
    );
  }

  /** The first `limit` vet clinics of the city, by name. A failure is an empty list. */
  vetsIn(cityId: number | null, limit: number): Observable<{ clinics: VetClinic[]; total: number }> {
    if (cityId == null) return of({ clinics: [], total: 0 });

    return this.#http
      .post<{ vetClinics?: VetClinic[]; totalResults?: number | string }>('veterinary-clinics/list', {
        grd_id: cityId,
        ops_id: null,
        word: null,
        offset: 0,
        limit,
      })
      .pipe(
        map((response) => ({ clinics: response.vetClinics ?? [], total: Number(response.totalResults) || 0 })),
        catchError(() => of({ clinics: [] as VetClinic[], total: 0 })),
      );
  }
}
