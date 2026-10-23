import { FetchBackend, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { photosOmitted, PrerenderBackend, PrerenderInterceptor, transferToBrowser } from './page-data';

const API = 'https://gdesapsom.com/api/v2/';
const get = (path: string) => new HttpRequest('GET', API + path);
const post = (path: string) => new HttpRequest('POST', API + path, {});

describe('transferToBrowser', () => {
  it('hands lookups and the page’s own detail to the browser', () => {
    expect(transferToBrowser(get('township'))).toBe(true);
    expect(transferToBrowser(get('dog-food/all/pseca-kasika-kolagenski-bujon'))).toBe(true);
    expect(transferToBrowser(get('blog/getAll/gde-sa-psom-u-nisu'))).toBe(true);
    expect(transferToBrowser(post('pet-friendly-spots/all/16'))).toBe(true);
  });

  it('leaves lists and the random picks to the browser', () => {
    expect(transferToBrowser(post('pet-friendly-spots/search-query'))).toBe(false);
    expect(transferToBrowser(post('veterinary-clinics/list'))).toBe(false);
    expect(transferToBrowser(get('pet-friendly-spots/random'))).toBe(false);
  });
});

describe('PrerenderInterceptor', () => {
  it('answers the random picks itself, without asking the API', async () => {
    const next: HttpHandler = { handle: jest.fn() };

    const event = await firstValueFrom(new PrerenderInterceptor().intercept(get('pet-friendly-spots/random'), next));

    expect((event as HttpResponse<unknown>).body).toEqual({ randomSpots: [] });
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('passes everything else on', () => {
    const answer = of(new HttpResponse({ body: { township: [] } }));
    const next: HttpHandler = { handle: jest.fn(() => answer) };

    expect(new PrerenderInterceptor().intercept(get('township'), next)).toBe(answer);
  });
});

describe('PrerenderBackend', () => {
  afterEach(() => jest.restoreAllMocks());

  const backendAnswering = (body: unknown) => {
    jest.spyOn(FetchBackend.prototype, 'handle').mockReturnValue(of(new HttpResponse({ body })));
    TestBed.configureTestingModule({ providers: [PrerenderBackend] });
    return TestBed.inject(PrerenderBackend);
  };

  it('takes the photos out of a spot and marks it', async () => {
    const backend = backendAnswering({
      spotsListSingle: [{ iuo_id: 16, iuo_ime: 'Witch Bar', iuo_slika_base64: 'data:image/jpeg;base64,AA==', iuo_slika_base64_unutra: 'data:x' }],
    });

    const event = (await firstValueFrom(backend.handle(post('pet-friendly-spots/all/16')))) as HttpResponse<any>;
    const spot = event.body.spotsListSingle[0];

    expect(spot).toMatchObject({ iuo_id: 16, iuo_ime: 'Witch Bar', iuo_slika_base64: null, iuo_slika_base64_unutra: null });
    expect(photosOmitted(spot)).toBe(true);
  });

  it('leaves other answers as they are', async () => {
    const body = { township: [{ id: 1 }] };
    const event = (await firstValueFrom(backendAnswering(body).handle(get('township')))) as HttpResponse<unknown>;

    expect(event.body).toBe(body);
  });
});

describe('photosOmitted', () => {
  it('is false for a spot from the API', () => {
    expect(photosOmitted({ iuo_id: 16 })).toBe(false);
    expect(photosOmitted(null)).toBe(false);
  });
});
