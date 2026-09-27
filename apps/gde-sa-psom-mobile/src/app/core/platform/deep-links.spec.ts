import { webUrlToAppRoute } from './deep-links';

describe('webUrlToAppRoute', () => {
  it.each([
    ['https://www.gdesapsom.com/spots/41', '/tabs/places/spots/41'],
    ['https://gdesapsom.com/spots/new', '/tabs/more/suggest-spot'],
    ['https://www.gdesapsom.com/parks/new', '/tabs/more/suggest-park'],
    ['https://www.gdesapsom.com/all-spots?word=bar', '/tabs/places'],
    ['https://www.gdesapsom.com/pet-parks', '/tabs/places?segment=parks'],
    ['https://www.gdesapsom.com/vet-clinics', '/tabs/vets'],
    ['https://www.gdesapsom.com/dog-food', '/tabs/catalog?segment=food'],
    ['https://www.gdesapsom.com/dog-food/pseca-kasika-buster-100g', '/tabs/catalog/food/pseca-kasika-buster-100g'],
    ['https://www.gdesapsom.com/pet-shops/pseca-kasika', '/tabs/catalog/shops/pseca-kasika'],
    ['https://www.gdesapsom.com/blog/gde-sa-psom-u-nisu', '/tabs/more/blog/gde-sa-psom-u-nisu'],
    ['https://www.gdesapsom.com/about-us', '/tabs/more/about'],
    ['https://www.gdesapsom.com/for-business', '/tabs/more/business'],
    ['https://www.gdesapsom.com/', '/tabs/home'],
    ['https://www.gdesapsom.com/admin/pending-spots', '/tabs/home'],
    ['not a url', '/tabs/home'],
  ])('%s -> %s', (url, route) => {
    expect(webUrlToAppRoute(url)).toBe(route);
  });

  it('re-encodes path segments', () => {
    expect(webUrlToAppRoute('https://www.gdesapsom.com/blog/%C5%A1uma')).toBe('/tabs/more/blog/%C5%A1uma');
  });
});
