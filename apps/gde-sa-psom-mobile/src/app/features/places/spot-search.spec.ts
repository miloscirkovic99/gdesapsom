import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Spot } from '@gde/shared/data-access';
import { NO_SPOT_FILTERS } from './spot-filters';
import { advanceSources, appendBatch, perSourceLimit, SpotSearch, withoutRepeats } from './spot-search';

const URL = 'pet-friendly-spots/search-query';

const spot = (iuo_id: number, distance_m?: number): Spot => ({ iuo_id, distance_m }) as Spot;

describe('paging helpers', () => {
  it('splits a batch of 12 across the venue types', () => {
    expect(perSourceLimit(1)).toBe(12);
    expect(perSourceLimit(2)).toBe(6);
    expect(perSourceLimit(3)).toBe(4);
    expect(perSourceLimit(0)).toBe(12);
  });

  it('drops venues that come back twice', () => {
    expect(withoutRepeats([spot(1), spot(2), spot(1)]).map((s) => s.iuo_id)).toEqual([1, 2]);
  });

  it('appends a batch type by type, or nearest first after a location search, without moving what is shown', () => {
    const shown = [spot(1, 50)];
    const pages = [
      { typeId: 1, spots: [spot(2, 900), spot(3, 300)], total: 9 },
      { typeId: 9, spots: [spot(4, 100), spot(1, 50)], total: 2 },
    ];
    expect(appendBatch(shown, pages, false).map((s) => s.iuo_id)).toEqual([1, 2, 3, 4]);
    expect(appendBatch(shown, pages, true).map((s) => s.iuo_id)).toEqual([1, 4, 3, 2]);
  });

  it('moves each source past what it returned, and stops one that returned nothing', () => {
    const sources = [
      { typeId: 1, offset: 6, total: 20 },
      { typeId: 9, offset: 6, total: 8 },
      { typeId: 3, offset: 2, total: 2 },
    ];
    expect(
      advanceSources(sources, [
        { typeId: 1, spots: [spot(1), spot(2)], total: 20 },
        { typeId: 9, spots: [], total: 0 },
      ]),
    ).toEqual([
      { typeId: 1, offset: 8, total: 20 },
      { typeId: 9, offset: 8, total: 8 },
      { typeId: 3, offset: 2, total: 2 },
    ]);
  });
});

describe('SpotSearch', () => {
  let search: SpotSearch;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SpotSearch, provideHttpClient(), provideHttpClientTesting()],
    });
    search = TestBed.inject(SpotSearch);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('searches every type in one request when no type is chosen', () => {
    search.search({ ...NO_SPOT_FILTERS, word: 'bar' });
    expect(search.status()).toBe('loading');

    const req = http.expectOne(URL);
    expect(req.request.body).toEqual(expect.objectContaining({ ugo_id: null, word: 'bar', offset: 0, limit: 12 }));
    req.flush({ spotsList: [spot(1), spot(2)], totalResults: '2' });

    expect(search.status()).toBe('loaded');
    expect(search.spots().map((s) => s.iuo_id)).toEqual([1, 2]);
    expect(search.total()).toBe(2);
    expect(search.hasMore()).toBe(false);
  });

  it('pages several types side by side and adds up their totals', () => {
    search.search({ ...NO_SPOT_FILTERS, spotTypeIds: [1, 9] });

    const [cafes, cafeterias] = http.match(URL);
    expect(cafes.request.body).toEqual(expect.objectContaining({ ugo_id: 1, offset: 0, limit: 6 }));
    expect(cafeterias.request.body).toEqual(expect.objectContaining({ ugo_id: 9, offset: 0, limit: 6 }));
    cafes.flush({ spotsList: [spot(1), spot(2)], totalResults: 8 });
    cafeterias.flush({ spotsList: [spot(3)], totalResults: 1 });

    expect(search.spots().map((s) => s.iuo_id)).toEqual([1, 2, 3]);
    expect(search.total()).toBe(9);
    expect(search.hasMore()).toBe(true);

    // Only the type with more left is asked again, from where it stopped.
    search.loadMore();
    expect(search.loadingMore()).toBe(true);
    const next = http.expectOne(URL);
    expect(next.request.body).toEqual(expect.objectContaining({ ugo_id: 1, offset: 2, limit: 6 }));
    next.flush({ spotsList: [spot(4)], totalResults: 8 });

    expect(search.loadingMore()).toBe(false);
    expect(search.spots().map((s) => s.iuo_id)).toEqual([1, 2, 3, 4]);
  });

  it('takes "nothing found" (404) as an empty list', () => {
    search.search({ ...NO_SPOT_FILTERS, spotTypeIds: [1, 9] });
    const [cafes, cafeterias] = http.match(URL);
    cafes.flush({ message: 'nema' }, { status: 404, statusText: 'Not Found' });
    cafeterias.flush({ spotsList: [spot(3)], totalResults: 1 });

    expect(search.status()).toBe('loaded');
    expect(search.spots().map((s) => s.iuo_id)).toEqual([3]);
    expect(search.total()).toBe(1);
  });

  it('reports other failures, and retries the same search', () => {
    search.search({ ...NO_SPOT_FILTERS, word: 'x' });
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });
    expect(search.status()).toBe('error');

    search.retry();
    const again = http.expectOne(URL);
    expect(again.request.body).toEqual(expect.objectContaining({ word: 'x' }));
    again.flush({ spotsList: [spot(1)], totalResults: 1 });
    expect(search.status()).toBe('loaded');
  });

  it('keeps the list when a further page fails', () => {
    search.search(NO_SPOT_FILTERS);
    http.expectOne(URL).flush({ spotsList: [spot(1)], totalResults: 30 });

    search.loadMore();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });

    expect(search.loadMoreFailed()).toBe(true);
    expect(search.loadingMore()).toBe(false);
    expect(search.spots()).toHaveLength(1);
  });

  it('drops the answer of a search that was replaced', () => {
    search.search({ ...NO_SPOT_FILTERS, word: 'old' });
    const old = http.expectOne(URL);
    search.search({ ...NO_SPOT_FILTERS, word: 'new' });
    expect(old.cancelled).toBe(true);

    http.expectOne(URL).flush({ spotsList: [spot(2)], totalResults: 1 });
    expect(search.spots().map((s) => s.iuo_id)).toEqual([2]);
  });
});
