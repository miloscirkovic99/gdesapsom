import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../../shared/data-access/config/app-config';
import { SessionStore } from '../../shared/data-access/platform/session-store';
import { ApiPrefixInterceptor } from './api-prefix.interceptor';

describe('ApiPrefixInterceptor', () => {
  let sid: string | null;
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sid = null;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: ApiPrefixInterceptor, multi: true },
        { provide: APP_CONFIG, useValue: { apiUrl: 'https://api.test/', production: false, useCatalogMocks: false } },
        { provide: SessionStore, useValue: { getSid: () => sid, setSid: jest.fn(), clear: jest.fn() } },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('prefixes a bare path with the API base and sends the session id', () => {
    sid = 'abc123';
    http.get('township').subscribe();

    const req = httpMock.expectOne((r) => r.url === 'https://api.test/api/v2/township');
    expect(req.request.params.get('sid')).toBe('abc123');
    req.flush({});
  });

  it('keeps sending the sid parameter when there is no session', () => {
    http.get('township').subscribe();

    const req = httpMock.expectOne((r) => r.url === 'https://api.test/api/v2/township');
    expect(req.request.params.has('sid')).toBe(true);
    expect(req.request.urlWithParams).toBe('https://api.test/api/v2/township?sid=null');
    req.flush({});
  });

  it('replaces caller params, so query strings belong in the URL', () => {
    sid = 's';
    http.get('dog-food/all?fields=admin', { params: { dropped: '1' } }).subscribe();

    const req = httpMock.expectOne((r) => r.url === 'https://api.test/api/v2/dog-food/all?fields=admin');
    expect(req.request.params.keys()).toEqual(['sid']);
    req.flush({});
  });

  it('leaves asset requests alone', () => {
    sid = 's';
    http.get('/assets/i18n/rs.json').subscribe();

    const req = httpMock.expectOne('/assets/i18n/rs.json');
    expect(req.request.params.has('sid')).toBe(false);
    req.flush({});
  });
});
