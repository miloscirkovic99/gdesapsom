import { activeSpotFilterCount, NO_SPOT_FILTERS, spotFilterKeys, toSpotSearchParams } from './spot-filters';

describe('toSpotSearchParams', () => {
  it('sends no filters for the empty state', () => {
    expect(toSpotSearchParams(NO_SPOT_FILTERS, true)).toEqual({
      ops_id: null,
      ugo_id: null,
      sta_id: null,
      word: null,
      latitude: null,
      longitude: null,
      radius: null,
      resetOffset: true,
    });
  });

  it('joins townships, maps the 0 = any sentinels and sends the radius only with a location', () => {
    const params = toSpotSearchParams(
      {
        word: 'bar',
        townshipIds: [3, 7],
        spotTypeId: 2,
        petSizeId: 0,
        near: { latitude: 44.8, longitude: 20.4 },
        radius: 2000,
      },
      false,
    );

    expect(params).toEqual({
      ops_id: '3,7',
      ugo_id: 2,
      sta_id: null,
      word: 'bar',
      latitude: 44.8,
      longitude: 20.4,
      radius: 2000,
      resetOffset: false,
    });
  });

  it('drops the radius without a location', () => {
    expect(toSpotSearchParams({ ...NO_SPOT_FILTERS, radius: 10000 }, true).radius).toBeNull();
  });
});

describe('activeSpotFilterCount', () => {
  it('counts filters but not the search word', () => {
    expect(activeSpotFilterCount({ ...NO_SPOT_FILTERS, word: 'x' })).toBe(0);
    expect(
      activeSpotFilterCount({
        ...NO_SPOT_FILTERS,
        townshipIds: [1],
        spotTypeId: 1,
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
        spotTypeId: 3,
        petSizeId: 4,
        near: { latitude: 44.8, longitude: 20.4 },
      }),
    ).toEqual(['sta_id', 'ugo_id', 'ops_id', 'location']);
  });
});
