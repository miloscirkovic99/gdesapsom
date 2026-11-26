import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DEVICE_ID_KEY, deviceId, PetTripInsightsApi } from './insights.api';
import { goodOutput, sampleInsightsRequest } from './insights.fixtures';
import type { InsightsResult } from './insights.models';
import { validateInsights } from './insights-validate';

describe('PetTripInsightsApi', () => {
  let api: PetTripInsightsApi;
  let http: HttpTestingController;
  const request = sampleInsightsRequest();

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(PetTripInsightsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const explain = (): Promise<InsightsResult> => firstValueFrom(api.explain(request));

  it('posts the facts as one JSON string and shows only checked text', async () => {
    const pending = explain();
    const call = http.expectOne('pet-trip/insights');
    expect(call.request.method).toBe('POST');
    expect(JSON.parse(call.request.body.payload)).toEqual(request);
    call.flush({ status: 'ok', insights: goodOutput(request), remaining: 4, limit: 5 });
    const result = await pending;
    expect(result).toMatchObject({ status: 'ok', remaining: 4, limit: 5, reason: null });
    expect(result.insights).toEqual(validateInsights(goodOutput(request), request));
  });

  it('sends one random device id per browser, made on the first request and kept', async () => {
    localStorage.removeItem(DEVICE_ID_KEY);
    const first = explain();
    const call = http.expectOne('pet-trip/insights');
    const sent = call.request.body.device as string;
    expect(sent).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
    expect(localStorage.getItem(DEVICE_ID_KEY)).toBe(sent);
    call.flush({ status: 'busy' });
    await first;

    const second = explain();
    const again = http.expectOne('pet-trip/insights');
    expect(again.request.body.device).toBe(sent);
    again.flush({ status: 'busy' });
    await second;
    expect(deviceId()).toBe(sent);
  });

  it('passes the limit the server hit through', async () => {
    const pending = explain();
    http.expectOne('pet-trip/insights').flush({ status: 'quota', reason: 'device', remaining: 0, limit: 5 });
    expect(await pending).toEqual({ status: 'quota', insights: null, remaining: 0, limit: 5, reason: 'device' });
  });

  it('answers the same facts again from memory', async () => {
    const first = explain();
    http.expectOne('pet-trip/insights').flush({ status: 'cached', insights: goodOutput(request) });
    await first;
    expect((await explain()).status).toBe('cached');
    http.expectNone('pet-trip/insights');
  });

  it('treats a reply that fails the browser check as invalid', async () => {
    const pending = explain();
    http.expectOne('pet-trip/insights').flush({ status: 'ok', insights: { ...goodOutput(request), summary: 'Plati 999 evra.' } });
    expect(await pending).toMatchObject({ status: 'invalid', insights: null });
  });

  it('passes the server statuses through', async () => {
    const pending = explain();
    http.expectOne('pet-trip/insights').flush({ status: 'busy' });
    expect(await pending).toEqual({ status: 'busy', insights: null, remaining: null, limit: null, reason: null });
  });

  it('is unavailable when the handler is not deployed and the site answers with HTML', async () => {
    const pending = explain();
    http.expectOne('pet-trip/insights').flush('<!doctype html><html></html>', { status: 200, statusText: 'OK' });
    expect((await pending).status).toBe('unavailable');
  });

  it('is unavailable on a network error', async () => {
    const pending = explain();
    http.expectOne('pet-trip/insights').error(new ProgressEvent('error'));
    expect(await pending).toEqual({ status: 'unavailable', insights: null, remaining: null, limit: null, reason: null });
  });
});
