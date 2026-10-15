import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { PetFriendlyListingsService } from './pet-friendly-listings.service';

describe('PetFriendlyListingsService', () => {
  let service: PetFriendlyListingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PetFriendlyListingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('finds venue type ids by name, ignoring case and diacritics', async () => {
    const ids = firstValueFrom(service.typeIds(['Kafić', 'Kafeterija']));
    httpMock.expectOne('pet-friendly-spots-types/list').flush({
      spotTypes: [
        { id: 1, ime: 'Kafic' },
        { id: 2, ime: 'Restoran' },
        { id: 7, ime: 'KAFETERIJA' },
      ],
    });

    expect(await ids).toEqual([1, 7]);
  });

  it('collects the townships of a city by grd_id or by city name', async () => {
    const area = firstValueFrom(service.cityArea(['Novi Sad']));
    httpMock.expectOne('countryandcities').flush({
      city: [
        { grd_id: 1, grd_ime: 'Beograd' },
        { grd_id: 2, grd_ime: 'Novi Sad' },
      ],
    });
    httpMock.expectOne('township').flush({
      township: [
        { id: 1, ime: 'Vračar', grd_id: 1, city_name: 'Beograd' },
        { id: 10, ime: 'Novi Sad', grd_id: 2 },
        { id: 11, ime: 'Petrovaradin', city_name: 'Novi Sad' },
      ],
    });

    expect(await area).toEqual({ cityIds: [2], townshipIds: [10, 11] });
  });

  it('still finds the townships when the city list fails', async () => {
    const area = firstValueFrom(service.cityArea(['Novi Sad']));
    httpMock.expectOne('countryandcities').flush('x', { status: 500, statusText: 'Server Error' });
    httpMock.expectOne('township').flush({ township: [{ id: 11, ime: 'Petrovaradin', city_name: 'Novi Sad' }] });

    expect(await area).toEqual({ cityIds: [], townshipIds: [11] });
  });

  it('searches by townships and type, and reads the 404 for "no results" as an empty page', async () => {
    const page = firstValueFrom(service.searchSpots({ townshipIds: [10, 11], typeId: 1, offset: 0, limit: 6 }));
    const req = httpMock.expectOne('pet-friendly-spots/search-query');
    expect(req.request.body).toEqual(
      expect.objectContaining({ ops_id: '10,11', ugo_id: 1, offset: 0, limit: 6, word: null }),
    );
    req.flush({ message: 'nema' }, { status: 404, statusText: 'Not Found' });

    expect(await page).toEqual({ spots: [], total: 0 });
  });

  it('passes the total the API reports', async () => {
    const page = firstValueFrom(service.searchSpots({ townshipIds: null, typeId: null, offset: 0, limit: 12 }));
    const req = httpMock.expectOne('pet-friendly-spots/search-query');
    expect(req.request.body.ops_id).toBeNull();
    req.flush({ spotsList: [{ iuo_id: 5 }], totalResults: '14' });

    expect((await page).total).toBe(14);
  });

  it('never searches the whole country for a city it could not find', async () => {
    const page = await firstValueFrom(service.searchSpots({ townshipIds: [], typeId: null, offset: 0, limit: 12 }));

    expect(page).toEqual({ spots: [], total: 0 });
    httpMock.expectNone('pet-friendly-spots/search-query');
  });

  it('treats a failing vet list as empty', async () => {
    const vets = firstValueFrom(service.vetsIn(2, 6));
    const req = httpMock.expectOne('veterinary-clinics/list');
    expect(req.request.body).toEqual(expect.objectContaining({ grd_id: 2, limit: 6 }));
    req.flush('x', { status: 500, statusText: 'Server Error' });

    expect(await vets).toEqual({ clinics: [], total: 0 });
  });

  it('keeps only the parks of the city', async () => {
    const parks = firstValueFrom(service.parksIn(['Novi Sad']));
    httpMock.expectOne('pet-friendly-parks/list').flush({
      petFriendlyParks: [
        { par_id: 1, grd_ime: 'Novi Sad' },
        { par_id: 2, grd_ime: 'Beograd' },
      ],
    });

    expect((await parks).map((park) => park.par_id)).toEqual([1]);
  });
});
