import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PetShopsApi, type Spot } from '@gde/shared/data-access';
import { of } from 'rxjs';
import { required, sampleGazetteer } from '../domain/assistant-domain.fixtures';
import type { PlacesQuery } from '../domain/query.models';
import { AssistantSearch } from './assistant-search.service';
import { admitsDog, dogRuleOf } from './place-results';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const gazetteer = sampleGazetteer();
const BEOGRAD = required(gazetteer.city('Beograd'));
const VRACAR = required(gazetteer.lookup('Vračar'));

const DOG_RULES = {
  small: 'Mali pas',
  puppies: 'Mali pas i štenci većih rasa do 5 meseci starosti',
  all: 'Svi psi',
};

function spot(id: number, overrides: Partial<Spot> = {}): Spot {
  return {
    iuo_id: id,
    iuo_ime: `Kafić ${id}`,
    iuo_adressa: `Ulica ${id}`,
    iuo_link_web: null,
    iuo_slika_base64: null,
    iuo_slika_base64_unutra: null,
    iuo_telefon: '011 123',
    latitude: '44.8',
    longitude: '20.46',
    ops_ime: 'Vračar',
    grd_ime: 'Beograd',
    ugo_ime: 'Kafić',
    sta_ime: DOG_RULES.all,
    bas_naziv: 'sa baštom',
    ...overrides,
  };
}

function query(overrides: Partial<PlacesQuery> = {}): PlacesQuery {
  return { categories: ['cafe'], place: BEOGRAD, nearMe: false, radius: null, dogSize: null, garden: false, name: null, ...overrides };
}

describe('dog rules', () => {
  it('reads the rule from its name and admits only dogs it covers', () => {
    expect(dogRuleOf({ sta_ime: DOG_RULES.small })).toBe('small');
    expect(dogRuleOf({ sta_ime: DOG_RULES.puppies })).toBe('small-puppies');
    expect(dogRuleOf({ sta_ime: DOG_RULES.all })).toBe('all');
    expect(admitsDog('small', 'small')).toBe(true);
    expect(admitsDog('small', 'puppy')).toBe(false);
    expect(admitsDog('small-puppies', 'puppy')).toBe(true);
    expect(admitsDog('small-puppies', 'large')).toBe(false);
    expect(admitsDog('all', 'large')).toBe(true);
    expect(admitsDog(null, 'small')).toBe(false);
  });
});

describe('AssistantSearch', () => {
  let search: AssistantSearch;
  let http: HttpTestingController;
  const shopSearch = jest.fn();

  beforeEach(() => {
    shopSearch.mockReset();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: PetShopsApi, useValue: { search: shopSearch } }],
    });
    search = TestBed.inject(AssistantSearch);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function flushTypes(): Promise<void> {
    await settle();
    http.expectOne('pet-friendly-spots-types/list').flush({
      spotTypes: [
        { id: 1, ime: 'Kafić' },
        { id: 2, ime: 'Restoran' },
        { id: 7, ime: 'Kafeterija' },
      ],
    });
    await settle();
  }

  it('asks once per venue type of the category, in the place, and keeps only what fits the dog and the garden', async () => {
    const result = search.search(query({ dogSize: 'large', garden: true }), { near: null, nearPlace: null });
    await flushTypes();

    const requests = http.match('pet-friendly-spots/search-query');
    expect(requests.map((request) => request.request.body.ugo_id)).toEqual([1, 7]);
    expect(requests[0].request.body).toMatchObject({ ops_id: BEOGRAD.townshipIds.join(','), sta_id: null, lat: null, offset: 0, limit: 5 });
    requests[0].flush({
      spotsList: [
        spot(1),
        spot(2, { sta_ime: DOG_RULES.small }),
        spot(3, { bas_naziv: 'bez bašte' }),
      ],
      totalResults: 3,
    });
    requests[1].flush({ message: 'nema' }, { status: 404, statusText: 'Not Found' });

    const [group] = await result;
    expect(group.items.map((item) => item.key)).toEqual(['spot-1']);
    expect(group.items[0]).toMatchObject({ dogs: 'all', garden: true, typeKey: 'cafe', link: ['/spots', '1'], area: 'Vračar, Beograd' });
    expect(group.cursor).toBeNull();
    expect(group.link).toEqual({ path: '/beograd/kafici' });
  });

  it('admits a puppy where puppies of larger breeds are allowed, not where only small dogs are', async () => {
    const result = search.search(query({ dogSize: 'puppy' }), { near: null, nearPlace: null });
    await flushTypes();
    const [cafes, cafeterias] = http.match('pet-friendly-spots/search-query');
    cafes.flush({ spotsList: [spot(1, { sta_ime: DOG_RULES.small }), spot(2, { sta_ime: DOG_RULES.puppies }), spot(3)], totalResults: 3 });
    cafeterias.flush({ spotsList: [], totalResults: 0 });

    expect((await result)[0].items.map((item) => item.key)).toEqual(['spot-2', 'spot-3']);
  });

  it('pages on from where the last batch stopped', async () => {
    const first = search.search(query(), { near: null, nearPlace: null });
    await flushTypes();
    const [cafes, cafeterias] = http.match('pet-friendly-spots/search-query');
    cafes.flush({ spotsList: [spot(1), spot(2), spot(3)], totalResults: 5 });
    cafeterias.flush({ spotsList: [spot(10)], totalResults: 1 });
    const [group] = await first;
    expect(group.items).toHaveLength(4);
    expect(group.cursor).not.toBeNull();

    const more = search.more(group, query(), { near: null, nearPlace: null });
    await settle();
    const next = http.expectOne('pet-friendly-spots/search-query');
    expect(next.request.body).toMatchObject({ ugo_id: 1, offset: 3 });
    next.flush({ spotsList: [spot(4), spot(5)], totalResults: 5 });
    const after = await more;
    expect(after.items.map((item) => item.key)).toEqual(['spot-1', 'spot-2', 'spot-3', 'spot-10', 'spot-4', 'spot-5']);
    expect(after.cursor).toBeNull();
  });

  it('searches around the visitor, nearest first', async () => {
    const result = search.search(query({ categories: [], place: null, nearMe: true, radius: 5000 }), {
      near: { lat: 44.81, lon: 20.46 },
      nearPlace: null,
    });
    await settle();
    const request = http.expectOne('pet-friendly-spots/search-query');
    expect(request.request.body).toMatchObject({ ops_id: null, ugo_id: null, lat: 44.81, lon: 20.46, radius: 5000 });
    request.flush({ spotsList: [spot(1, { distance_m: 900 }), spot(2, { distance_m: 300 })], totalResults: 2 });

    const [group] = await result;
    expect(group.scope).toEqual({ kind: 'near', radius: 5000 });
    expect(group.items.map((item) => item.distanceM)).toEqual([300, 900]);
  });

  it('lists the dog parks of a township', async () => {
    const result = search.search(query({ categories: ['park'], place: VRACAR }), { near: null, nearPlace: null });
    await settle();
    http.expectOne('pet-friendly-parks/list').flush({
      petFriendlyParks: [
        { par_id: 1, par_ime: 'Park A', par_lokacija: 'Krunska', ops_id: 1, ops_ime: 'Vračar', grd_ime: 'Beograd' },
        { par_id: 2, par_ime: 'Park B', par_lokacija: 'Ušće', ops_id: 3, ops_ime: 'Novi Beograd', grd_ime: 'Beograd' },
      ],
    });
    const [group] = await result;
    expect(group.items.map((item) => item.name)).toEqual(['Park A']);
    expect(group.items[0].mapsUrl).toContain('google.com/maps/search');
    expect(group.link).toEqual({ path: '/pet-parks' });
  });

  it('shows the vets of the city when the township has none of its own', async () => {
    const result = search.search(query({ categories: ['vet'], place: VRACAR }), { near: null, nearPlace: null });
    await settle();
    const byTownship = http.expectOne('veterinary-clinics/list');
    expect(byTownship.request.body).toMatchObject({ grd_id: null, ops_id: '1' });
    byTownship.flush({ message: 'nema' }, { status: 404, statusText: 'Not Found' });
    await settle();
    const byCity = http.expectOne('veterinary-clinics/list');
    expect(byCity.request.body).toMatchObject({ grd_id: 1, ops_id: null, offset: 0 });
    byCity.flush({ vetClinics: [{ vetc_id: 9, vetc_naziv: 'Ambulanta Lesi', vetc_telefon: '011 555', vetc_adresa: 'Bulevar 1', grd_id: 1, grd_ime: 'Beograd', ops_id: null, ops_ime: null }], totalResults: 1 });

    const [group] = await result;
    expect(group.widened).toBe(true);
    expect(group.items[0]).toMatchObject({ name: 'Ambulanta Lesi', phone: '011 555', kind: 'vet' });
  });

  it('does not search parks or vets "near me" without knowing the place', async () => {
    const [group] = await search.search(query({ categories: ['vet'], place: null, nearMe: true }), { near: { lat: 1, lon: 2 }, nearPlace: null });
    expect(group.items).toEqual([]);
    expect(group.cursor).toBeNull();
  });

  it('finds pet shops around the visitor through the catalog API', async () => {
    shopSearch.mockReturnValue(
      of({
        data: [{ id: 3, name: 'Pet Shop Žika', slug: 'pet-shop-zika', address: 'Glavna 1', phone: null, websiteUrl: null, latitude: 44.8, longitude: 20.4, woltUrl: null, glovoUrl: null, townshipId: 1, townshipName: 'Vračar', cityId: 1, cityName: 'Beograd', offerCount: 4, distanceM: 420 }],
        total: 1,
        cursor: null,
      }),
    );
    const [group] = await search.search(query({ categories: ['petshop'], place: null, nearMe: true }), { near: { lat: 44.8, lon: 20.4 }, nearPlace: null });
    expect(shopSearch).toHaveBeenCalledWith(
      { word: null, townshipIds: [], hasDelivery: false, near: { lat: 44.8, lon: 20.4, radius: 10_000 } },
      null,
      6,
    );
    expect(group.items[0]).toMatchObject({ name: 'Pet Shop Žika', link: ['/pet-shops', 'pet-shop-zika'], distanceM: 420 });
  });
});
