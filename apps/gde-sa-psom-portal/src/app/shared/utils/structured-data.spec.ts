import { Post } from '@gde/shared/data-access';
import {
  blogPostingStructuredData,
  breadcrumbListStructuredData,
  homeCollectionStructuredData,
  SpotSchemaSource,
  spotStructuredData,
} from './structured-data';

const SPOT_PAGE = { url: 'https://www.gdesapsom.com/spots/56', description: 'Opis lokala' };

/** Shaped like `pet-friendly-spots/all/56`. */
const CAFE: SpotSchemaSource = {
  iuo_ime: 'Aleksandar klub',
  ugo_ime: 'Kafić',
  iuo_adressa: 'Ski staza Košutnjak',
  grd_ime: 'Beograd',
  ops_ime: 'Čukarica',
  sta_ime: 'Svi psi',
  iuo_telefon: null,
  iuo_link_web: 'https://instagram.com/ski_staza?utm_medium=copy_link',
  latitude: 44.778981,
  longitude: 20.427416,
};

describe('spotStructuredData', () => {
  it('describes a café with its address, coordinates and profile link', () => {
    expect(spotStructuredData(CAFE, SPOT_PAGE)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'CafeOrCoffeeShop',
      name: 'Aleksandar klub',
      description: 'Opis lokala',
      url: 'https://www.gdesapsom.com/spots/56',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Ski staza Košutnjak',
        addressLocality: 'Beograd',
        addressCountry: 'RS',
      },
      amenityFeature: {
        '@type': 'LocationFeatureSpecification',
        name: 'Dozvoljeni psi: Svi psi',
        value: true,
      },
      sameAs: ['https://instagram.com/ski_staza?utm_medium=copy_link'],
      geo: { '@type': 'GeoCoordinates', latitude: 44.778981, longitude: 20.427416 },
    });
  });

  it('leaves out what a chain with several venues does not have', () => {
    // Shaped like `pet-friendly-spots/all/20`.
    const data = spotStructuredData(
      {
        ...CAFE,
        iuo_ime: 'Coffe Dream',
        ugo_ime: 'Ostalo',
        iuo_adressa: 'Više lokacija',
        ops_ime: 'Vračar',
        iuo_telefon: 'null',
        latitude: null,
        longitude: null,
      },
      SPOT_PAGE,
    );

    expect(data?.['@type']).toBe('LocalBusiness');
    expect(data?.['address']).toEqual({ '@type': 'PostalAddress', addressLocality: 'Beograd', addressCountry: 'RS' });
    expect(data).not.toHaveProperty('telephone');
    expect(data).not.toHaveProperty('geo');
  });

  it.each([
    ['Restoran', 'Restaurant'],
    ['Kafeterija', 'CafeOrCoffeeShop'],
    ['Pab', 'BarOrPub'],
    ['Teretana', 'ExerciseGym'],
    ['Tip koji ne postoji', 'LocalBusiness'],
    [null, 'LocalBusiness'],
  ])('maps the spot type %p to %s', (ugoIme, schemaType) => {
    expect(spotStructuredData({ ...CAFE, ugo_ime: ugoIme }, SPOT_PAGE)?.['@type']).toBe(schemaType);
  });

  it.each(['Hotel', 'Motel', 'Apartman'])('marks a %s as allowing pets', (ugoIme) => {
    expect(spotStructuredData({ ...CAFE, ugo_ime: ugoIme }, SPOT_PAGE)?.['petsAllowed']).toBe(true);
  });

  it('does not use petsAllowed where schema.org does not define it', () => {
    expect(spotStructuredData(CAFE, SPOT_PAGE)).not.toHaveProperty('petsAllowed');
  });

  it('adds the phone number when there is one', () => {
    expect(spotStructuredData({ ...CAFE, iuo_telefon: ' 011 123 456 ' }, SPOT_PAGE)?.['telephone']).toBe('011 123 456');
  });

  it('completes a link saved without a scheme', () => {
    expect(spotStructuredData({ ...CAFE, iuo_link_web: 'www.kafic.rs' }, SPOT_PAGE)?.['sameAs']).toEqual([
      'https://www.kafic.rs/',
    ]);
  });

  it.each(['javascript:alert(1)', 'null', ''])('drops the unusable link %p', (link) => {
    expect(spotStructuredData({ ...CAFE, iuo_link_web: link }, SPOT_PAGE)).not.toHaveProperty('sameAs');
  });

  it('accepts coordinates sent as strings', () => {
    expect(spotStructuredData({ ...CAFE, latitude: '44.8', longitude: '20.4' }, SPOT_PAGE)?.['geo']).toEqual({
      '@type': 'GeoCoordinates',
      latitude: 44.8,
      longitude: 20.4,
    });
  });

  it('returns null without a name', () => {
    expect(spotStructuredData({ ...CAFE, iuo_ime: ' ' }, SPOT_PAGE)).toBeNull();
  });
});

describe('blogPostingStructuredData', () => {
  /** Shaped like an item of `blog/getAll`. */
  const post = (overrides: Partial<Post> = {}): Post => ({
    post_id: 5,
    naslov: 'Sterilizacija i kastracija psa',
    slug: 'sterilizacija-kastracija-psa',
    sadrzaj: '<p>Tekst</p>',
    slika_naslovna: '',
    status: 'objavljen',
    objavljen_u: '2026-04-29 00:10:44',
    kor_id: 1,
    autor: 'Admin',
    autor_email: '',
    kategorija: 'Zdravlje',
    tagovi: 'sterilizacija, veterinar, zdravlje',
    broj_komentara: 0,
    ...overrides,
  });

  const page = {
    url: 'https://www.gdesapsom.com/blog/sterilizacija-kastracija-psa',
    image: null,
    tags: ['sterilizacija', 'veterinar', 'zdravlje'],
  };

  const site = {
    '@type': 'Organization',
    name: 'Gde sa psom',
    url: 'https://www.gdesapsom.com',
    logo: 'https://www.gdesapsom.com/assets/logo-big.png',
  };

  it('describes a post from the admin account as published by the site', () => {
    expect(blogPostingStructuredData(post(), page)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: 'Sterilizacija i kastracija psa',
      url: page.url,
      mainEntityOfPage: page.url,
      datePublished: '2026-04-29T00:10:44',
      author: site,
      publisher: site,
      articleSection: 'Zdravlje',
      keywords: 'sterilizacija, veterinar, zdravlje',
    });
  });

  it('credits a named author as a person', () => {
    expect(blogPostingStructuredData(post({ autor: 'Jelena Petrović' }), page)?.['author']).toEqual({
      '@type': 'Person',
      name: 'Jelena Petrović',
    });
  });

  it('adds the cover image when there is one', () => {
    const image = 'https://www.gdesapsom.com/assets/slike/naslovna.jpg';
    expect(blogPostingStructuredData(post(), { ...page, image })?.['image']).toEqual([image]);
  });

  it('omits a publication date it cannot read', () => {
    expect(blogPostingStructuredData(post({ objavljen_u: 'uskoro' }), page)?.['datePublished']).toBeUndefined();
  });

  it('returns null without a title', () => {
    expect(blogPostingStructuredData(post({ naslov: '' }), page)).toBeNull();
  });
});

describe('breadcrumbListStructuredData', () => {
  it('numbers the steps and leaves the current page without a URL', () => {
    expect(
      breadcrumbListStructuredData([
        { name: 'Početna', url: 'https://www.gdesapsom.com/' },
        { name: 'Pet-friendly objekti', url: 'https://www.gdesapsom.com/all-spots' },
        { name: 'Witch Bar', url: 'https://www.gdesapsom.com/spots/21' },
      ]),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Početna', item: 'https://www.gdesapsom.com/' },
        { '@type': 'ListItem', position: 2, name: 'Pet-friendly objekti', item: 'https://www.gdesapsom.com/all-spots' },
        { '@type': 'ListItem', position: 3, name: 'Witch Bar' },
      ],
    });
  });

  it('skips blank names, so a spot that has not loaded yet does not add an empty step', () => {
    const data = breadcrumbListStructuredData([
      { name: 'Početna', url: 'https://www.gdesapsom.com/' },
      { name: '  ' },
      { name: 'Blog', url: 'https://www.gdesapsom.com/blog' },
    ]);

    expect(data?.['itemListElement']).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Početna', item: 'https://www.gdesapsom.com/' },
      { '@type': 'ListItem', position: 2, name: 'Blog' },
    ]);
  });

  it('is null for a single step, which is not a trail', () => {
    expect(breadcrumbListStructuredData([{ name: 'Početna', url: 'https://www.gdesapsom.com/' }])).toBeNull();
  });
});

describe('homeCollectionStructuredData', () => {
  it('lists the section pages as absolute URLs under the site WebSite node', () => {
    expect(
      homeCollectionStructuredData([
        { name: 'Pet-friendly objekti', path: 'all-spots' },
        { name: 'Parkovi za pse', path: '/pet-parks' },
      ]),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': 'https://www.gdesapsom.com/#page',
      url: 'https://www.gdesapsom.com/',
      name: 'Gde sa psom - pet friendly mesta u Srbiji',
      inLanguage: 'sr-Latn',
      isPartOf: { '@id': 'https://www.gdesapsom.com/#website' },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Pet-friendly objekti', url: 'https://www.gdesapsom.com/all-spots' },
          { '@type': 'ListItem', position: 2, name: 'Parkovi za pse', url: 'https://www.gdesapsom.com/pet-parks' },
        ],
      },
    });
  });
});
