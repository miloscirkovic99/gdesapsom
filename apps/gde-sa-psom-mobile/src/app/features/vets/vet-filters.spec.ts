import { NO_VET_FILTERS, toVetSearchParams, vetFilterKeys } from './vet-filters';

describe('toVetSearchParams', () => {
  it('sends nulls for "every city" and no townships', () => {
    expect(toVetSearchParams(NO_VET_FILTERS, true)).toEqual({
      word: null,
      grd_id: null,
      ops_id: null,
      resetOffset: true,
    });
  });

  it('sends the city and comma-separated townships', () => {
    expect(toVetSearchParams({ word: 'vet', cityId: 1, townshipIds: [4, 9] }, false)).toEqual({
      word: 'vet',
      grd_id: 1,
      ops_id: '4,9',
      resetOffset: false,
    });
  });
});

describe('vetFilterKeys', () => {
  it('reports townships and city like the website', () => {
    expect(vetFilterKeys(NO_VET_FILTERS)).toEqual([]);
    expect(vetFilterKeys({ word: 'vet', cityId: 1, townshipIds: [5] })).toEqual(['ops_id', 'grd_id']);
  });
});
