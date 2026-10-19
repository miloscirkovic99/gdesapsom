import { HTTP_INTERCEPTORS, HttpClient, HttpContext, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { DdosProtectionInterceptor, REQUEST_PROTECTION } from './ddos-protection.interceptor';

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

  describe('per-request protection', () => {
    const PLANNER = 'planner';
    const plannerContext = () =>
      new HttpContext().set(REQUEST_PROTECTION, { retry: false, timeoutMs: 45000, rateLimitIsFailure: false });

    it('does not repeat a request that must run once', fakeAsync(() => {
      let failure: unknown = null;
      http.post(PLANNER, {}, { context: plannerContext() }).subscribe({ error: (error) => (failure = error) });
      httpMock.expectOne(PLANNER).flush({}, { status: 503, statusText: 'Unavailable' });
      tick(10000);

      httpMock.expectNone(PLANNER);
      expect(failure).toBeTruthy();
    }));

    it('still repeats ordinary requests after a 5xx', fakeAsync(() => {
      http.post(SEARCH, {}).subscribe({ error: () => undefined });
      httpMock.expectOne(SEARCH).flush({}, { status: 503, statusText: 'Unavailable' });
      tick(2000);
      httpMock.expectOne(SEARCH).flush({ spotsList: [] });
    }));

    it('waits longer than 30 s when asked to', fakeAsync(() => {
      let done = false;
      http.post(PLANNER, {}, { context: plannerContext() }).subscribe({ next: () => (done = true) });
      tick(40000);
      httpMock.expectOne(PLANNER).flush({ plan_id: 1 });
      expect(done).toBe(true);
    }));

    it('keeps answering after many quota refusals (429)', () => {
      for (let i = 0; i < 6; i++) {
        http.post(PLANNER, {}, { context: plannerContext() }).subscribe({ error: () => undefined });
        httpMock.expectOne(PLANNER).flush({ reason: 'device' }, { status: 429, statusText: 'Too Many Requests' });
      }
      http.post(PLANNER, {}, { context: plannerContext() }).subscribe();
      httpMock.expectOne(PLANNER).flush({ plan_id: 2 });
    });
  });
});
