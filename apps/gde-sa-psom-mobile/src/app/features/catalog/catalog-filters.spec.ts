import {
  CatalogLookups,
  EMPTY_DOG_FOOD_FILTERS,
  EMPTY_PET_SHOP_FILTERS,
  Township,
} from '@gde/shared/data-access';
import {
  catalogEntry,
  catalogParamsKey,
  foodFilterChips,
  foodFilterKeys,
  parsePrice,
  shopFilterChips,
  shopFilterKeys,
  townshipSummary,
  withOrderedPrices,
  withoutFoodChip,
  withoutShopChip,
} from './catalog-filters';

/** Echoes the key and its params, so the tests read without translations. */
const t = (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key);

const params = (query: string) => new URLSearchParams(query);

const lookups = {
  brands: [{ id: 1, name: 'Acana', slug: 'acana', logoUrl: null, websiteUrl: null }],
  foodTypes: [{ id: 1, code: 'dry', nameSr: 'Suva hrana', nameEn: 'Dry food' }],
  lifeStages: [{ id: 1, code: 'puppy', nameSr: 'Štene', nameEn: 'Puppy' }],
  breedSizes: [],
  priceRange: { minPrice: null, maxPrice: null },
} as CatalogLookups;

const townships: Township[] = [
  { id: 4, ime: 'Vračar' },
  { id: 7, ime: 'Savski venac' },
  { id: 9, ime: 'Zvezdara' },
];

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

describe('parsePrice', () => {
  it('reads numbers and numeric text', () => {
    expect(parsePrice('1500')).toBe(1500);
    expect(parsePrice(' 990 ')).toBe(990);
    expect(parsePrice(0)).toBe(0);
  });

  it('treats empty, negative and non-numeric input as no bound', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice(undefined)).toBeNull();
    expect(parsePrice('-5')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
  });
});

describe('withOrderedPrices', () => {
  it('swaps bounds given the wrong way round', () => {
    const f = withOrderedPrices({ ...EMPTY_DOG_FOOD_FILTERS, minPrice: 5000, maxPrice: 1000 });
    expect([f.minPrice, f.maxPrice]).toEqual([1000, 5000]);
  });

  it('leaves a valid or open range alone', () => {
    const open = { ...EMPTY_DOG_FOOD_FILTERS, minPrice: 5000 };
    expect(withOrderedPrices(open)).toBe(open);
  });
});

describe('foodFilterChips', () => {
  it('shows nothing without filters', () => {
    expect(foodFilterChips(EMPTY_DOG_FOOD_FILTERS, lookups, 'rs', t)).toEqual([]);
  });

  it('names lookups in the active language and falls back to the code', () => {
    const chips = foodFilterChips(
      { ...EMPTY_DOG_FOOD_FILTERS, foodType: 'dry', lifeStage: 'puppy', breedSize: 'giant', brands: ['acana', 'x'] },
      lookups,
      'en',
      t,
    );
    expect(chips).toEqual([
      { id: 'foodType', label: 'Dry food' },
      { id: 'lifeStage', label: 'Puppy' },
      { id: 'breedSize', label: 'giant' },
      { id: 'brand:acana', label: 'Acana' },
      { id: 'brand:x', label: 'x' },
    ]);
  });

  it('labels grain-free and the price range', () => {
    const both = foodFilterChips({ ...EMPTY_DOG_FOOD_FILTERS, grainFree: true, minPrice: 1000, maxPrice: 5000 }, null, 'rs', t);
    expect(both).toEqual([
      { id: 'grainFree', label: 'grain_free' },
      { id: 'price', label: '1.000 – 5.000 RSD' },
    ]);
    const from = foodFilterChips({ ...EMPTY_DOG_FOOD_FILTERS, minPrice: 1000 }, null, 'rs', t);
    expect(from[0].label).toBe('price_from {"price":"1.000 RSD"}');
    const upTo = foodFilterChips({ ...EMPTY_DOG_FOOD_FILTERS, maxPrice: 900 }, null, 'rs', t);
    expect(upTo[0].label).toBe('price_up_to {"price":"900 RSD"}');
  });
});

describe('withoutFoodChip', () => {
  const f = {
    ...EMPTY_DOG_FOOD_FILTERS,
    word: 'royal',
    foodType: 'dry',
    brands: ['acana', 'orijen'],
    grainFree: true,
    minPrice: 1000,
    maxPrice: 5000,
  };

  it('drops only the chip it is given', () => {
    expect(withoutFoodChip(f, 'foodType')).toEqual({ ...f, foodType: null });
    expect(withoutFoodChip(f, 'brand:acana').brands).toEqual(['orijen']);
    expect(withoutFoodChip(f, 'grainFree').grainFree).toBeNull();
    expect(withoutFoodChip(f, 'price')).toEqual({ ...f, minPrice: null, maxPrice: null });
  });

  it('ignores unknown ids', () => {
    expect(withoutFoodChip(f, 'nope')).toBe(f);
  });
});

describe('shopFilterChips and withoutShopChip', () => {
  const f = {
    ...EMPTY_PET_SHOP_FILTERS,
    townshipIds: [4, 99],
    hasDelivery: true,
    near: { lat: 44.8, lon: 20.4, radius: 2000 },
  };

  it('shows one chip per municipality, delivery and the near-me radius', () => {
    expect(shopFilterChips(f, townships, t)).toEqual([
      { id: 'township:4', label: 'Vračar' },
      { id: 'township:99', label: 'filter_township' },
      { id: 'delivery', label: 'filter_has_delivery' },
      { id: 'near', label: 'mobile_near_me · 2 km' },
    ]);
  });

  it('drops only the chip it is given', () => {
    expect(withoutShopChip(f, 'township:4').townshipIds).toEqual([99]);
    expect(withoutShopChip(f, 'delivery').hasDelivery).toBe(false);
    expect(withoutShopChip(f, 'near').near).toBeNull();
    expect(withoutShopChip(f, 'nope')).toBe(f);
  });
});

describe('townshipSummary', () => {
  it('is null without a selection', () => {
    expect(townshipSummary([], townships, 'rs', t)).toBeNull();
  });

  it('names one or two municipalities', () => {
    expect(townshipSummary([4, 7], townships, 'rs', t)).toBe('Vračar, Savski venac');
  });

  it('counts three or more, or names it cannot resolve', () => {
    expect(townshipSummary([4, 7, 9], townships, 'rs', t)).toBe('filter_townships_count_few {"count":3}');
    expect(townshipSummary([99], townships, 'en', t)).toBe('filter_townships_count_one {"count":1}');
  });
});

describe('catalogEntry', () => {
  it('reads nothing from a bare catalog link', () => {
    expect(catalogEntry(params(''))).toEqual({ segment: null, food: null, shops: null });
  });

  it('only switches the segment for ?segment=', () => {
    expect(catalogEntry(params('segment=shops'))).toEqual({ segment: 'shops', food: null, shops: null });
  });

  it('reads the website /dog-food params', () => {
    const entry = catalogEntry(
      params('q=royal&type=dry&stage=puppy&size=small&brand=acana,%20orijen&grainFree=1&minPrice=5000&maxPrice=1000&sort=price'),
    );
    expect(entry.segment).toBe('food');
    expect(entry.shops).toBeNull();
    expect(entry.food).toEqual({
      word: 'royal',
      foodType: 'dry',
      lifeStage: 'puppy',
      breedSize: 'small',
      brands: ['acana', 'orijen'],
      grainFree: true,
      minPrice: 1000,
      maxPrice: 5000,
      sort: 'price',
    });
  });

  it('falls back to the default sort and drops bad prices', () => {
    const entry = catalogEntry(params('segment=food&sort=cheapest&minPrice=abc'));
    expect(entry.food).toEqual({ ...EMPTY_DOG_FOOD_FILTERS, sort: 'name' });
  });

  it('reads the website /pet-shops params', () => {
    const entry = catalogEntry(params('segment=shops&q=kasika&township=4,x,-2,7&delivery=1'));
    expect(entry).toEqual({
      segment: 'shops',
      food: null,
      shops: { ...EMPTY_PET_SHOP_FILTERS, word: 'kasika', townshipIds: [4, 7], hasDelivery: true },
    });
  });

  it('takes shop-only params as the shops segment', () => {
    expect(catalogEntry(params('township=4')).segment).toBe('shops');
  });

  it('gives q to the segment the link names', () => {
    expect(catalogEntry(params('q=kasika')).food?.word).toBe('kasika');
    expect(catalogEntry(params('segment=shops&q=kasika')).food).toBeNull();
  });
});

describe('catalogParamsKey', () => {
  it('ignores params the catalog does not read', () => {
    expect(catalogParamsKey(params('segment=food&utm_source=x'))).toBe(catalogParamsKey(params('segment=food')));
    expect(catalogParamsKey(params('segment=food'))).not.toBe(catalogParamsKey(params('segment=shops')));
  });
});
