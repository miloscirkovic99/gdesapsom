import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DdosProtectionInterceptor } from './ddos-protection.interceptor';

const SEARCH = 'pet-friendly-spots/search-query';

describe('DdosProtectionInterceptor circuit breaker', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: DdosProtectionInterceptor, multi: true },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    httpMock.verify();
    jest.restoreAllMocks();
  });

  /** Sends one search and answers it with `answer`; resolves to the error, if any. */
  function search(answer: (req: ReturnType<HttpTestingController['expectOne']>) => void): unknown {
    let failure: unknown = null;
    http.post(SEARCH, {}).subscribe({ error: (error) => (failure = error) });
    answer(httpMock.expectOne(SEARCH));
    return failure;
  }

  it('keeps searching after many "no results" answers (404)', () => {
    for (let i = 0; i < 6; i++) {
      search((req) => req.flush({ message: 'nema' }, { status: 404, statusText: 'Not Found' }));
    }

    // The request still reaches the server instead of failing locally.
    search((req) => req.flush({ spotsList: [], totalResults: 0 }));
  });

  it('opens the circuit after repeated network failures', () => {
    for (let i = 0; i < 5; i++) {
      search((req) => req.error(new ProgressEvent('error')));
    }

    let failure: unknown = null;
    http.post(SEARCH, {}).subscribe({ error: (error) => (failure = error) });

    httpMock.expectNone(SEARCH);
    expect(String(failure)).toContain('circuit breaker open');
  });
});
