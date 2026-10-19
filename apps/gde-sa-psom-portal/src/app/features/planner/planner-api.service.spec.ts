import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DdosProtectionInterceptor, REQUEST_PROTECTION } from '@gde/shared/data-access/core';
import { PlannerApiService, PlannerFailure } from './planner-api.service';
import type { DanParams } from './planner.models';

const params: DanParams = { mode: 'dan', grad: 'beograd', datum: '2026-11-21', velicina: 'srednji', energija: 'srednja', osetljiv_na_vrucinu: false, tip_dana: 'mesovit' };

describe('PlannerApiService', () => {
  let api: PlannerApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: DdosProtectionInterceptor, multi: true },
      ],
    });
    api = TestBed.inject(PlannerApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends the parameters and the Turnstile token, with credentials, never repeated', () => {
    api.create(params, 'token-1').subscribe();
    const request = http.expectOne('planner');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ ...params, turnstile_token: 'token-1' });
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.context.get(REQUEST_PROTECTION)).toEqual({ retry: false, timeoutMs: 45000, rateLimitIsFailure: false });
    request.flush({ plan_id: 'a1' });
  });

  it('turns a 429 into the limit with its reason and date', () => {
    let failure: PlannerFailure | null = null;
    api.create(params, 't').subscribe({ error: (error) => (failure = error) });
    http.expectOne('planner').flush({ reason: 'network', next_at: '2026-11-28T10:00:00Z' }, { status: 429, statusText: 'Too Many Requests' });

    expect(failure).toEqual({ kind: 'limit', limit: { reason: 'network', next_at: '2026-11-28T10:00:00Z', retry_after: undefined } });
  });

  it('maps the other failures', () => {
    const failures: PlannerFailure[] = [];
    for (const status of [403, 400, 404]) {
      api.get('x').subscribe({ error: (error) => failures.push(error) });
      http.expectOne('planner/plan/x').flush({}, { status, statusText: 'x' });
    }
    // No answer at all (offline, blocked): status 0.
    api.get('x').subscribe({ error: (error) => failures.push(error) });
    http.expectOne('planner/plan/x').error(new ProgressEvent('error'));

    expect(failures.map((f) => f.kind)).toEqual(['captcha', 'invalid', 'not_found', 'unavailable']);
  });

  it('asks for the weekly count with credentials', () => {
    let quota: unknown;
    api.quota().subscribe((value) => (quota = value));
    const request = http.expectOne('planner/quota');
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ remaining: 2, next_at: null });
    expect(quota).toEqual({ remaining: 2, next_at: null });
  });

  it('swaps with the target and the places already swapped away', () => {
    api.swap('a1', { section: 'stanice', index: 2, exclude: [11] }).subscribe();
    const request = http.expectOne('planner/swap');
    expect(request.request.body).toEqual({ plan_id: 'a1', section: 'stanice', index: 2, exclude: [11] });
    request.flush({ plan_id: 'a2' });
  });
});
