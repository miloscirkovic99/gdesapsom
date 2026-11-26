import { inject, Injectable } from '@angular/core';
import { PetShopsApi, type Spot } from '@gde/shared/data-access';
import { foldPlaceName } from '@gde/shared/util';
import { firstValueFrom } from 'rxjs';
import { PetFriendlyListingsService } from '../../pet-friendly/pet-friendly-listings.service';
import {
  categoryPath,
  cityForName,
  cityPath,
  PET_FRIENDLY_CATEGORIES,
} from '../../pet-friendly/pet-friendly-pages';
import { type CategoryId, isSpotCategory, type PlaceRef, type PlacesQuery, SPOT_CATEGORY_SLUGS } from '../domain/query.models';
import {
  admitsDog,
  dogRuleOf,
  fromPark,
  fromShop,
  fromSpot,
  fromVet,
  gardenOf,
  type GroupCursor,
  type ResultGroup,
  type SearchScope,
  type SiteLink,
} from './place-results';

/**
 * Places shown per batch, and the rows fetched for it when filters are on.
 * Venue rows carry two base64 photos (~190 KB), so a filtered search stops
 * after two rounds and shows what matched, with "more" for the rest.
 */
export const BATCH_SIZE = 6;
const FILTERED_FETCH = 10;
const MAX_ROUNDS = 2;
/** Default "near me" radius. */
export const NEAR_RADIUS_M = 10_000;

/** The visitor's position, for venues and shops (which have coordinates). */
export interface GeoPoint {
  lat: number;
  lon: number;
}

/** Everything a search needs besides the query: where the visitor is, and the place that is for parks and vets. */
export interface SearchArea {
  near: GeoPoint | null;
  /** The city (or township) around `near`: parks and vets have no coordinates. */
  nearPlace: PlaceRef | null;
}

type SpotSource = { typeId: number | null; offset: number; total: number };

/**
 * Runs the assistant's searches through the endpoints the rest of the site
 * uses, so every result is a row from our database:
 *
 * - venues: `pet-friendly-spots/search-query`, one request per venue type of
 *   the category (the API filters by one type), like the hub pages;
 * - parks: `pet-friendly-parks/list` (all accepted parks, cached), by city;
 * - vets: `veterinary-clinics/list`; pet shops: `pet-shops/search-query`.
 *
 * The dog and garden filters are applied here, on the rows, from the rule
 * each row carries (`sta_ime`, `bas_naziv`): the API's own `sta_id` filter
 * was written for other ids (db/09: 1 small dog, 2 small dog and puppies,
 * 3 all dogs) and has no garden filter.
 */
@Injectable({ providedIn: 'root' })
export class AssistantSearch {
  readonly #listings = inject(PetFriendlyListingsService);
  readonly #shops = inject(PetShopsApi);

  /** One group per category, in the order asked; every venue type when the query names none. */
  async search(query: PlacesQuery, area: SearchArea): Promise<ResultGroup[]> {
    const categories: (CategoryId | null)[] = query.categories.length ? query.categories : [null];
    return Promise.all(categories.map((category) => this.#first(category, query, area)));
  }

  /** The next batch of a group, appended to it. */
  async more(group: ResultGroup, query: PlacesQuery, area: SearchArea): Promise<ResultGroup> {
    if (!group.cursor) return group;
    const next = await this.#batch(query, area, group.cursor);
    const seen = new Set(group.items.map((item) => item.key));
    return { ...group, items: [...group.items, ...next.items.filter((item) => !seen.has(item.key))], cursor: next.cursor };
  }

  async #first(category: CategoryId | null, query: PlacesQuery, area: SearchArea): Promise<ResultGroup> {
    const scope = this.#scope(category, query, area);
    const link = this.#siteLink(category, scope);
    // Parks and vets are only ever searched in a place; "near me" without one has nothing to show.
    if ((category === 'park' || category === 'vet') && scope.kind !== 'place') {
      return { category, scope, items: [], widened: false, cursor: null, link };
    }
    let cursor: GroupCursor;
    if (category === null || isSpotCategory(category)) {
      cursor = { kind: 'spots', sources: (await this.#typeIds(category)).map((typeId) => ({ typeId, offset: 0, total: Infinity })) };
    } else if (category === 'park') {
      cursor = { kind: 'parks', offset: 0 };
    } else if (category === 'vet') {
      const place = scope.kind === 'place' ? scope.place : null;
      cursor = {
        kind: 'vets',
        offset: 0,
        total: Infinity,
        cityId: place && place.kind === 'city' ? (place.cityIds[0] ?? null) : null,
        townshipIds: place && place.kind === 'township' ? place.townshipIds : null,
      };
    } else {
      cursor = { kind: 'shops', cursor: { offset: 0 } };
    }

    let batch = await this.#batch(query, area, cursor);
    let widened = false;
    // A township without vets of its own (the clinic's township is optional): the vets of its city.
    if (category === 'vet' && !batch.items.length && scope.kind === 'place' && scope.place.kind === 'township' && scope.place.cityIds.length === 1) {
      batch = await this.#batch(query, area, { kind: 'vets', offset: 0, total: Infinity, cityId: scope.place.cityIds[0], townshipIds: null });
      widened = true;
    }
    return { category, scope, items: batch.items, widened, cursor: batch.cursor, link };
  }

  #batch(query: PlacesQuery, area: SearchArea, cursor: GroupCursor): Promise<Pick<ResultGroup, 'items' | 'cursor'>> {
    switch (cursor.kind) {
      case 'spots':
        return this.#spots(query, area, cursor.sources);
      case 'parks':
        return this.#parks(query, area, cursor.offset);
      case 'vets':
        return this.#vets(cursor);
      case 'shops':
        return this.#petShops(query, area, cursor);
    }
  }

  async #spots(query: PlacesQuery, area: SearchArea, start: SpotSource[]): Promise<Pick<ResultGroup, 'items' | 'cursor'>> {
    const filtered = query.dogSize !== null || query.garden;
    const townshipIds = query.nearMe ? null : (query.place?.townshipIds ?? null);
    const near = query.nearMe && area.near ? { ...area.near, radius: query.radius ?? NEAR_RADIUS_M } : null;
    let sources = start;
    const rows: Spot[] = [];

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const open = sources.filter((source) => source.offset < source.total);
      if (!open.length) break;
      const limit = Math.max(2, Math.ceil((filtered ? FILTERED_FETCH : BATCH_SIZE) / open.length));
      const pages = await Promise.all(
        open.map((source) =>
          firstValueFrom(this.#listings.searchSpots({ townshipIds, typeId: source.typeId, offset: source.offset, limit, near })).then(
            (page) => ({ source, page }),
          ),
        ),
      );
      sources = sources.map((source) => {
        const hit = pages.find((entry) => entry.source === source);
        if (!hit) return source;
        const received = hit.page.spots.length;
        // An empty page means the data changed under us: stop asking.
        return { ...source, offset: received ? source.offset + received : hit.page.total, total: hit.page.total };
      });
      rows.push(...pages.flatMap((entry) => entry.page.spots));

      const matches = rows.filter((spot) => this.#matches(spot, query));
      // Unfiltered, one round fills the batch; filtered, a few more until something matches.
      if (!filtered || matches.length >= BATCH_SIZE / 2) break;
    }

    const seen = new Set<number>();
    let items = rows
      .filter((spot) => this.#matches(spot, query))
      .filter((spot) => (seen.has(spot.iuo_id) ? false : (seen.add(spot.iuo_id), true)))
      .map(fromSpot);
    if (near) items = items.sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
    const more = sources.some((source) => source.offset < source.total);
    return { items, cursor: more ? { kind: 'spots', sources } : null };
  }

  #matches(spot: Spot, query: PlacesQuery): boolean {
    if (query.dogSize && !admitsDog(dogRuleOf(spot), query.dogSize)) return false;
    if (query.garden && gardenOf(spot) !== true) return false;
    if (query.name && !foldPlaceName(spot.iuo_ime).includes(foldPlaceName(query.name))) return false;
    return true;
  }

  async #parks(query: PlacesQuery, area: SearchArea, offset: number): Promise<Pick<ResultGroup, 'items' | 'cursor'>> {
    const place = query.nearMe ? area.nearPlace : query.place;
    if (!place) return { items: [], cursor: null };
    const parks = (await firstValueFrom(this.#listings.parksIn(place.cityNames))).filter(
      (park) => place.kind === 'city' || place.townshipIds.includes(Number(park.ops_id)),
    );
    const page = parks.slice(offset, offset + BATCH_SIZE).map(fromPark);
    const next = offset + BATCH_SIZE;
    return { items: page, cursor: next < parks.length ? { kind: 'parks', offset: next } : null };
  }

  async #vets(cursor: Extract<GroupCursor, { kind: 'vets' }>): Promise<Pick<ResultGroup, 'items' | 'cursor'>> {
    const { clinics, total } = await firstValueFrom(
      this.#listings.searchVets({ cityId: cursor.cityId, townshipIds: cursor.townshipIds, offset: cursor.offset, limit: BATCH_SIZE }),
    );
    const next = cursor.offset + clinics.length;
    return { items: clinics.map(fromVet), cursor: clinics.length && next < total ? { ...cursor, offset: next, total } : null };
  }

  async #petShops(
    query: PlacesQuery,
    area: SearchArea,
    cursor: Extract<GroupCursor, { kind: 'shops' }>,
  ): Promise<Pick<ResultGroup, 'items' | 'cursor'>> {
    const near = query.nearMe && area.near ? { ...area.near, radius: query.radius ?? NEAR_RADIUS_M } : null;
    const townshipIds = near ? [] : (query.place?.townshipIds ?? []);
    // A place without townships has no shops; an empty list would mean all of Serbia.
    if (!near && query.place && !townshipIds.length) return { items: [], cursor: null };
    // The first page goes without a cursor; the handler picks its paging from the cursor's shape.
    const start = 'offset' in cursor.cursor && cursor.cursor.offset === 0 ? null : cursor.cursor;
    const page = await firstValueFrom(
      this.#shops.search({ word: query.name, townshipIds, hasDelivery: false, near }, start, BATCH_SIZE),
    );
    return { items: page.data.map(fromShop), cursor: page.cursor ? { kind: 'shops', cursor: page.cursor } : null };
  }

  async #typeIds(category: CategoryId | null): Promise<(number | null)[]> {
    if (category === null) return [null];
    const slug = SPOT_CATEGORY_SLUGS[category];
    const types = PET_FRIENDLY_CATEGORIES.find((entry) => entry.slug === slug)?.spotTypes ?? [];
    return firstValueFrom(this.#listings.typeIds(types));
  }

  #scope(category: CategoryId | null, query: PlacesQuery, area: SearchArea): SearchScope {
    const coordinates = category === null || isSpotCategory(category) || category === 'petshop';
    if (query.nearMe && coordinates) return { kind: 'near', radius: query.radius ?? NEAR_RADIUS_M };
    const place = query.nearMe ? area.nearPlace : query.place;
    return place ? { kind: 'place', place } : { kind: 'serbia' };
  }

  /** The site's own list: the hub of a hub city, the national hub, or the list page. */
  #siteLink(category: CategoryId | null, scope: SearchScope): SiteLink | null {
    if (category === 'park') return { path: '/pet-parks' };
    if (category === 'vet') return { path: '/vet-clinics' };
    if (category === 'petshop') return { path: '/pet-shops' };

    const hubCity = scope.kind === 'place' ? scope.place.cityNames.map((name) => cityForName(name)).find(Boolean) ?? null : null;
    const hubCategory = category ? PET_FRIENDLY_CATEGORIES.find((entry) => entry.slug === SPOT_CATEGORY_SLUGS[category]) : null;
    if (category === null) return hubCity ? { path: cityPath(hubCity) } : { path: '/all-spots' };
    if (!hubCategory) return null;
    if (hubCity) return { path: categoryPath(hubCategory, hubCity) };
    return scope.kind === 'serbia' ? { path: categoryPath(hubCategory) } : null;
  }
}
