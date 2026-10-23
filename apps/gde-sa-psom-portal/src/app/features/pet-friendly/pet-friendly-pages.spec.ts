import { appRoutes } from '../../app.routes';
import { missingCopy, pageCopy } from './pet-friendly-copy';
import {
  categoryForSpotType,
  cityForName,
  findPetFriendlyPage,
  hubLinksForSpot,
  PET_FRIENDLY_CATEGORIES,
  PET_FRIENDLY_PAGE_DATA,
  PET_FRIENDLY_PAGES,
  relatedHubLinksForSpot,
  STAYS_HUB_PATH,
} from './pet-friendly-pages';
import taxonomy from './pet-friendly-taxonomy.json';

describe('pet-friendly hub pages', () => {
  it('has a national hub per category, a hub per city and every city × category', () => {
    const cities = taxonomy.cities.length;
    const categories = taxonomy.categories.length;
    expect(PET_FRIENDLY_PAGES).toHaveLength(categories + cities + cities * categories);
  });

  it('includes the pages for "pet friendly smeštaj srbija" and "pet friendly novi sad"', () => {
    expect(findPetFriendlyPage('/smestaj')?.title).toBe(
      'Pet Friendly Smeštaj u Srbiji – Hoteli i Apartmani za Pse | Gde sa psom',
    );
    expect(findPetFriendlyPage('/novi-sad')?.title).toBe(
      'Pet Friendly Novi Sad – Kafići, Restorani i Smeštaj sa Psom | Gde sa psom',
    );
    expect(findPetFriendlyPage('/novi-sad/kafici')?.title).toBe(
      'Pet Friendly Kafići Novi Sad – Kafići u Koje Možete sa Psom | Gde sa psom',
    );
    expect(STAYS_HUB_PATH).toBe('/smestaj');
  });

  it('gives every page its own title and a description Google will not cut', () => {
    const titles = PET_FRIENDLY_PAGES.map((page) => page.title);
    expect(new Set(titles).size).toBe(titles.length);

    for (const page of PET_FRIENDLY_PAGES) {
      expect(page.description.length).toBeGreaterThan(80);
      expect(page.description.length).toBeLessThanOrEqual(160);
      expect(page.path).toMatch(/^\/[a-z-]+(\/[a-z-]+)?$/);
    }
  });

  it('only indexes a city × category page with enough listings', () => {
    expect(findPetFriendlyPage('/smestaj')?.minListingsToIndex).toBe(taxonomy.minListingsToIndex.category);
    expect(findPetFriendlyPage('/beograd')?.minListingsToIndex).toBe(taxonomy.minListingsToIndex.city);
    expect(findPetFriendlyPage('/beograd/barovi')?.minListingsToIndex).toBe(
      taxonomy.minListingsToIndex.cityCategory,
    );
  });

  it('registers a route for every page, before the not-found route', () => {
    const paths = appRoutes.map((route) => route.path);
    const notFound = paths.indexOf('**');

    for (const page of PET_FRIENDLY_PAGES) {
      const index = paths.indexOf(page.path.slice(1));
      expect(index).toBeGreaterThan(-1);
      expect(index).toBeLessThan(notFound);

      const route = appRoutes[index];
      expect(route.title).toBe(page.title);
      expect(route.data?.['description']).toBe(page.description);
      expect(route.data?.[PET_FRIENDLY_PAGE_DATA]).toBe(page.path);
    }
  });

  it('does not take over a path another route already uses', () => {
    const paths = appRoutes.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('has copy in both languages for every category and page', () => {
    expect(missingCopy(PET_FRIENDLY_CATEGORIES)).toEqual([]);

    for (const page of PET_FRIENDLY_PAGES) {
      for (const lang of ['sr', 'en'] as const) {
        const copy = pageCopy(page, lang, PET_FRIENDLY_CATEGORIES);
        expect(copy.h1).toBeTruthy();
        expect(copy.intro.length).toBeGreaterThan(0);
        expect(copy.faq({ total: null, examples: [] }).length).toBeGreaterThan(1);
      }
    }
  });
});

describe('matching venues to hubs', () => {
  it('finds the city by its database name, ignoring case and diacritics', () => {
    expect(cityForName('Novi Sad')?.slug).toBe('novi-sad');
    expect(cityForName('novi  sad')?.slug).toBe('novi-sad');
    expect(cityForName('Beograd')?.slug).toBe('beograd');
    expect(cityForName('Niš')?.slug).toBe('nis');
    expect(cityForName('Nis')?.slug).toBe('nis');
    expect(cityForName('Divčibare')).toBeNull();
  });

  it('maps venue types to categories', () => {
    expect(categoryForSpotType('Kafić')?.slug).toBe('kafici');
    expect(categoryForSpotType('Kafeterija')?.slug).toBe('kafici');
    expect(categoryForSpotType('Splav')?.slug).toBe('restorani');
    expect(categoryForSpotType('Pab')?.slug).toBe('barovi');
    expect(categoryForSpotType('Apartman')?.slug).toBe('smestaj');
    expect(categoryForSpotType('Teretana')).toBeNull();
  });

  it('builds the breadcrumb trail of a venue through its hubs', () => {
    expect(hubLinksForSpot({ grd_ime: 'Novi Sad', ugo_ime: 'Kafić' }).map((link) => link.path)).toEqual([
      '/novi-sad',
      '/novi-sad/kafici',
    ]);
    // A city without a hub falls back to the national category.
    expect(hubLinksForSpot({ grd_ime: 'Divčibare', ugo_ime: 'Apartman' }).map((link) => link.path)).toEqual([
      '/smestaj',
    ]);
    expect(hubLinksForSpot({ grd_ime: 'Ruma', ugo_ime: 'Teretana' })).toEqual([]);
  });

  it('lists the related hubs of a venue, most specific first', () => {
    const links = relatedHubLinksForSpot({ grd_ime: 'Beograd', ugo_ime: 'Hotel' });
    expect(links.map((link) => link.path)).toEqual(['/beograd/smestaj', '/beograd', '/smestaj']);
    expect(links[0].label.nameSr).toBe('Pet friendly smeštaj u Beogradu');
  });
});

describe('hub copy', () => {
  const novisadKafici = findPetFriendlyPage('/novi-sad/kafici');
  if (!novisadKafici) throw new Error('missing /novi-sad/kafici');

  it('uses the locative of the city', () => {
    const copy = pageCopy(novisadKafici, 'sr', PET_FRIENDLY_CATEGORIES);
    expect(copy.h1).toBe('Pet friendly kafići u Novom Sadu');
    expect(copy.listHeading).toBe('Kafići u Novom Sadu koji primaju pse');
  });

  it.each([
    [1, 'Na Gde sa psom je trenutno 1 pet friendly kafić u Novom Sadu.'],
    [3, 'Na Gde sa psom su trenutno 3 pet friendly kafića u Novom Sadu.'],
    [12, 'Na Gde sa psom je trenutno 12 pet friendly kafića u Novom Sadu.'],
    [21, 'Na Gde sa psom je trenutno 21 pet friendly kafić u Novom Sadu.'],
  ])('counts %i listings in grammatical Serbian', (total, line) => {
    expect(pageCopy(novisadKafici, 'sr', PET_FRIENDLY_CATEGORIES).countLine(total)).toBe(line);
  });

  it('answers with real listing names and counts once they are known', () => {
    const faq = pageCopy(novisadKafici, 'sr', PET_FRIENDLY_CATEGORIES).faq({
      total: 3,
      examples: ['Kafić A', 'Kafić B', 'Kafić C'],
    });
    const answers = faq.map((item) => item.answer).join(' ');
    expect(answers).toContain('Na primer Kafić A, Kafić B i Kafić C.');
    expect(answers).toContain('Na Gde sa psom su trenutno 3 pet friendly kafića u Novom Sadu.');
  });

  it('leaves out data questions while nothing is loaded', () => {
    const faq = pageCopy(novisadKafici, 'sr', PET_FRIENDLY_CATEGORIES).faq({ total: null, examples: [] });
    expect(faq.some((item) => item.question.startsWith('Koliko'))).toBe(false);
    expect(faq.some((item) => item.question.startsWith('Koji kafići'))).toBe(false);
  });

  it('links the accommodation hub to the EU travel guide', () => {
    const smestaj = findPetFriendlyPage('/smestaj');
    if (!smestaj) throw new Error('missing /smestaj');
    const faq = pageCopy(smestaj, 'sr', PET_FRIENDLY_CATEGORIES).faq({ total: null, examples: [] });
    expect(faq.some((item) => item.link?.path === '/blog/nova-eu-pravila-putovanje-pas-april-2026')).toBe(true);
  });
});
