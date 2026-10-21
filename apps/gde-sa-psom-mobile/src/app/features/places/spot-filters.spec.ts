import type { SpotType, Township } from '@gde/shared/data-access';
import {
  activeSpotFilterCount,
  NO_SPOT_FILTERS,
  orderSpotTypes,
  placeLabels,
  SpotFilterLookups,
  spotFilterChips,
  spotFilterKeys,
  spotTypeLabels,
  summarizeSpotTypes,
  toSearchBody,
  withoutChip,
} from './spot-filters';

/** The API's venue types (pet-friendly-spots-types/list), out of category order. */
const TYPES: SpotType[] = [
  { id: 1, ime: 'Kafić' },
  { id: 2, ime: 'Restoran' },
  { id: 3, ime: 'Splav' },
  { id: 4, ime: 'Hotel' },
  { id: 5, ime: 'Pab' },
  { id: 6, ime: 'Motel' },
  { id: 7, ime: 'Teretana' },
  { id: 8, ime: 'Apartman' },
  { id: 9, ime: 'Kafeterija' },
  { id: 10, ime: 'Bar' },
];

const TOWNSHIPS: Township[] = [
  { id: 1, grd_id: 1, ime: 'Vračar, Beograd', city_name: 'Beograd' },
  { id: 2, grd_id: 1, ime: 'Voždovac, Beograd', city_name: 'Beograd' },
  { id: 3, grd_id: 1, ime: 'Zemun, Beograd', city_name: 'Beograd' },
  { id: 20, grd_id: 3, ime: 'Novi Sad, Novi Sad', city_name: 'Novi Sad' },
  { id: 21, grd_id: 3, ime: 'Futog, Novi Sad', city_name: 'Novi Sad' },
  { id: 30, grd_id: 9, ime: 'Subotica, Subotica', city_name: 'Subotica' },
];

const LOOKUPS: SpotFilterLookups = {
  spotTypes: TYPES,
  townships: TOWNSHIPS,
  petSizes: [
    { id: 1, ime: 'Mali pas' },
    { id: 9, ime: 'Nepoznata veličina' },
  ],
};

describe('toSearchBody', () => {
  it('sends no filters for the empty state', () => {
    expect(toSearchBody(NO_SPOT_FILTERS, null, 0, 12)).toEqual({
      ops_id: null,
      ugo_id: null,
      sta_id: null,
      word: null,
      lat: null,
      lon: null,
      radius: null,
      offset: 0,
      limit: 12,
    });
  });

  it('joins townships, asks for one venue type and sends the radius only with a location', () => {
    const body = toSearchBody(
      {
        word: 'bar',
        townshipIds: [3, 7],
        spotTypeIds: [1, 9],
        petSizeId: 0,
        near: { latitude: 44.8, longitude: 20.4 },
        radius: 7500,
      },
      9,
      12,
      6,
    );

    expect(body).toEqual({
      ops_id: '3,7',
      ugo_id: 9,
      sta_id: null,
      word: 'bar',
      lat: 44.8,
      lon: 20.4,
      radius: 7500,
      offset: 12,
      limit: 6,
    });
  });

  it('drops the radius without a location', () => {
    expect(toSearchBody({ ...NO_SPOT_FILTERS, radius: 10000 }, null, 0, 12).radius).toBeNull();
  });
});

describe('activeSpotFilterCount', () => {
  it('counts filters but not the search word, and a category once', () => {
    expect(activeSpotFilterCount({ ...NO_SPOT_FILTERS, word: 'x' })).toBe(0);
    expect(
      activeSpotFilterCount({
        ...NO_SPOT_FILTERS,
        townshipIds: [1],
        spotTypeIds: [1, 9],
        near: { latitude: 1, longitude: 1 },
      }),
    ).toBe(3);
  });
});

describe('spotFilterKeys', () => {
  it('ignores the search word and the radius on their own', () => {
    expect(spotFilterKeys({ ...NO_SPOT_FILTERS, word: 'bar', radius: 1000 })).toEqual([]);
  });

  it("uses the website's keys and order", () => {
    expect(
      spotFilterKeys({
        ...NO_SPOT_FILTERS,
        townshipIds: [1, 2],
        spotTypeIds: [3, 4],
        petSizeId: 4,
        near: { latitude: 44.8, longitude: 20.4 },
      }),
    ).toEqual(['sta_id', 'ugo_id', 'ops_id', 'location']);
  });
});

describe('orderSpotTypes', () => {
  it("puts each category's types together, in the website's order, then the rest", () => {
    expect(orderSpotTypes(TYPES).map((t) => t.ime)).toEqual([
      'Restoran',
      'Splav',
      'Kafić',
      'Kafeterija',
      'Bar',
      'Pab',
      'Hotel',
      'Motel',
      'Apartman',
      'Teretana',
    ]);
  });
});

describe('summarizeSpotTypes', () => {
  it('names a whole category and lists the other types', () => {
    const { categories, rest } = summarizeSpotTypes([9, 1, 2, 7], TYPES);
    expect(categories.map((c) => c.slug)).toEqual(['kafici']);
    expect(rest.map((t) => t.ime)).toEqual(['Restoran', 'Teretana']);
  });
});

describe('labels', () => {
  it('labels a category by its key and other types by theirs, or by the API name', () => {
    expect(spotTypeLabels([4, 6, 8, 7], TYPES)).toEqual([
      { id: 'cat:smestaj', key: 'mobile_cat_stays' },
      { id: 'type:7', key: expect.any(String) },
    ]);
    expect(spotTypeLabels([99], [{ id: 99, ime: 'Novi tip' }])).toEqual([{ id: 'type:99', text: 'Novi tip' }]);
  });

  it('names whole cities and short township names', () => {
    expect(placeLabels([1, 2, 3, 21, 30], TOWNSHIPS, 'rs', false)).toEqual([
      { id: 'city:1', text: 'Beograd' },
      { id: 'city:9', text: 'Subotica' },
      { id: 'township:21', text: 'Futog' },
    ]);
  });

  it('counts the loose townships past two when collapsing', () => {
    expect(placeLabels([1, 2, 21], TOWNSHIPS, 'rs', true)).toEqual([
      { id: 'townships', key: 'filter_townships_count_few', params: { count: 3 } },
    ]);
    expect(placeLabels([1, 2, 21], TOWNSHIPS, 'rs', false)).toHaveLength(3);
  });
});

describe('spotFilterChips', () => {
  it('lists types, dog size, places and the radius, in the order of the sheet', () => {
    const chips = spotFilterChips(
      {
        ...NO_SPOT_FILTERS,
        word: 'ignored',
        spotTypeIds: [1, 9],
        petSizeId: 9,
        townshipIds: [20, 21],
        near: { latitude: 44.8, longitude: 20.4 },
        radius: 7500,
      },
      LOOKUPS,
      'rs',
    );

    expect(chips).toEqual([
      { id: 'cat:kafici', key: 'mobile_cat_cafes' },
      { id: 'size', text: 'Nepoznata veličina' },
      { id: 'city:3', text: 'Novi Sad' },
      { id: 'near', key: 'mobile_near_me_radius', params: { distance: '7,5 km' } },
    ]);
  });

  it('has no chips without filters', () => {
    expect(spotFilterChips({ ...NO_SPOT_FILTERS, word: 'bar' }, LOOKUPS, 'en')).toEqual([]);
  });
});

describe('withoutChip', () => {
  const filters = {
    ...NO_SPOT_FILTERS,
    spotTypeIds: [1, 9, 7],
    petSizeId: 1,
    townshipIds: [1, 2, 3, 20, 30],
    near: { latitude: 44.8, longitude: 20.4 },
  };

  it('drops a whole category', () => {
    expect(withoutChip(filters, 'cat:kafici', LOOKUPS).spotTypeIds).toEqual([7]);
  });

  it('drops one type', () => {
    expect(withoutChip(filters, 'type:7', LOOKUPS).spotTypeIds).toEqual([1, 9]);
  });

  it('drops a whole city', () => {
    expect(withoutChip(filters, 'city:1', LOOKUPS).townshipIds).toEqual([20, 30]);
  });

  it('drops one township, or every township outside whole cities', () => {
    expect(withoutChip(filters, 'township:20', LOOKUPS).townshipIds).toEqual([1, 2, 3, 30]);
    expect(withoutChip(filters, 'townships', LOOKUPS).townshipIds).toEqual([1, 2, 3, 30]);
  });

  it('drops the dog size and the location', () => {
    expect(withoutChip(filters, 'size', LOOKUPS).petSizeId).toBe(0);
    expect(withoutChip(filters, 'near', LOOKUPS).near).toBeNull();
  });

  it('leaves the filters alone for an unknown chip', () => {
    expect(withoutChip(filters, 'nope', LOOKUPS)).toBe(filters);
  });
});
