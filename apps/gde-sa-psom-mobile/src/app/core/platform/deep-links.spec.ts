import { webUrlToAppRoute } from './deep-links';

describe('webUrlToAppRoute', () => {
  it.each([
    ['https://www.gdesapsom.com/spots/41', '/tabs/places/spots/41'],
    ['https://gdesapsom.com/spots/new', '/tabs/more/suggest-spot'],
    ['https://www.gdesapsom.com/parks/new', '/tabs/more/suggest-park'],
    ['https://www.gdesapsom.com/all-spots', '/tabs/places?segment=venues'],
    ['https://www.gdesapsom.com/pet-parks', '/tabs/places?segment=parks'],
    ['https://www.gdesapsom.com/vet-clinics', '/tabs/vets'],
    ['https://www.gdesapsom.com/dog-food', '/tabs/catalog?segment=food'],
    ['https://www.gdesapsom.com/dog-food/pseca-kasika-buster-100g', '/tabs/catalog/food/pseca-kasika-buster-100g'],
    ['https://www.gdesapsom.com/pet-shops', '/tabs/catalog?segment=shops'],
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

  describe('pet-friendly hub pages', () => {
    it.each([
      ['https://www.gdesapsom.com/kafici', '/tabs/places?segment=venues&category=kafici'],
      ['https://www.gdesapsom.com/restorani', '/tabs/places?segment=venues&category=restorani'],
      ['https://www.gdesapsom.com/barovi', '/tabs/places?segment=venues&category=barovi'],
      ['https://www.gdesapsom.com/smestaj', '/tabs/places?segment=venues&category=smestaj'],
      ['https://www.gdesapsom.com/beograd', '/tabs/places?segment=venues&city=beograd'],
      ['https://gdesapsom.com/novi-sad', '/tabs/places?segment=venues&city=novi-sad'],
      ['https://www.gdesapsom.com/novi-sad/kafici', '/tabs/places?segment=venues&city=novi-sad&category=kafici'],
      ['https://www.gdesapsom.com/beograd/smestaj', '/tabs/places?segment=venues&city=beograd&category=smestaj'],
    ])('%s -> %s', (url, route) => {
      expect(webUrlToAppRoute(url)).toBe(route);
    });

    it('opens the whole city for a category the website does not have', () => {
      expect(webUrlToAppRoute('https://www.gdesapsom.com/novi-sad/teretane')).toBe(
        '/tabs/places?segment=venues&city=novi-sad',
      );
    });
  });

  describe('query strings', () => {
    it('keeps the search and venue type of the venue list', () => {
      expect(webUrlToAppRoute('https://www.gdesapsom.com/all-spots?word=Witch%20Bar&spotType=Kafi%C4%87&page=2')).toBe(
        '/tabs/places?segment=venues&word=Witch%20Bar&spotType=Kafi%C4%87',
      );
    });

    it("keeps the website's dog-food filters", () => {
      expect(webUrlToAppRoute('https://www.gdesapsom.com/dog-food?type=dry')).toBe(
        '/tabs/catalog?segment=food&type=dry',
      );
      expect(
        webUrlToAppRoute(
          'https://www.gdesapsom.com/dog-food?q=adult&type=dry&stage=adult&size=small&brand=royal-canin,acana' +
            '&grainFree=1&minPrice=500&maxPrice=3000&sort=price&utm_source=x',
        ),
      ).toBe(
        '/tabs/catalog?segment=food&q=adult&type=dry&stage=adult&size=small&brand=royal-canin,acana' +
          '&grainFree=1&minPrice=500&maxPrice=3000&sort=price',
      );
    });

    it("keeps the website's pet-shop filters", () => {
      expect(webUrlToAppRoute('https://www.gdesapsom.com/pet-shops?township=3,5')).toBe(
        '/tabs/catalog?segment=shops&township=3,5',
      );
      expect(webUrlToAppRoute('https://www.gdesapsom.com/pet-shops?q=%C5%A1apa&township=3,7&delivery=1')).toBe(
        '/tabs/catalog?segment=shops&q=%C5%A1apa&township=3,7&delivery=1',
      );
    });

    it('leaves the query of a product or shop page behind', () => {
      expect(webUrlToAppRoute('https://www.gdesapsom.com/dog-food/acana-adult?type=dry')).toBe(
        '/tabs/catalog/food/acana-adult',
      );
    });

    it('drops empty values', () => {
      expect(webUrlToAppRoute('https://www.gdesapsom.com/all-spots?word=')).toBe('/tabs/places?segment=venues');
    });
  });
});
