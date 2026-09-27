import { EMPTY_DOG_FOOD_FILTERS, EMPTY_PET_SHOP_FILTERS } from '@gde/shared/data-access';
import { foodFilterKeys, shopFilterKeys } from './catalog-filters';

describe('foodFilterKeys', () => {
  it('reports nothing for the empty state, whatever the sort order', () => {
    expect(foodFilterKeys({ ...EMPTY_DOG_FOOD_FILTERS, sort: 'price', word: 'royal' })).toEqual([]);
  });

  it('names every active filter once, with either price bound counting as price', () => {
    expect(
      foodFilterKeys({
        ...EMPTY_DOG_FOOD_FILTERS,
        foodType: 'dry',
        lifeStage: 'puppy',
        breedSize: 'large',
        brands: ['acana', 'orijen'],
        grainFree: false,
        maxPrice: 5000,
      }),
    ).toEqual(['food_type', 'life_stage', 'breed_size', 'brand', 'grain_free', 'price']);
  });
});

describe('shopFilterKeys', () => {
  it('reports nothing for the empty state', () => {
    expect(shopFilterKeys(EMPTY_PET_SHOP_FILTERS)).toEqual([]);
  });

  it('names townships, delivery and location', () => {
    expect(
      shopFilterKeys({
        ...EMPTY_PET_SHOP_FILTERS,
        townshipIds: [4],
        hasDelivery: true,
        near: { lat: 44.8, lon: 20.4, radius: 5000 },
      }),
    ).toEqual(['ops_id', 'delivery', 'location']);
  });
});
