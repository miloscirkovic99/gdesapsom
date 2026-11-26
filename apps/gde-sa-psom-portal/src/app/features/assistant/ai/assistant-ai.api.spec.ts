import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DEVICE_ID_KEY } from '../../../shared/utils/device-id';
import { sampleGazetteer, TODAY } from '../domain/assistant-domain.fixtures';
import { ASSISTANT_AI_ENABLED, AssistantAiApi } from './assistant-ai.api';
import type { AiIntent } from './assistant-ai.models';
import { aiIntentToParsed, validateAiIntent } from './assistant-ai.validate';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const INTENT: AiIntent = {
  intent: 'places',
  categories: ['cafe'],
  city: 'Beograd',
  township: 'Stari grad',
  nearMe: false,
  dogSize: 'large',
  garden: true,
  venueName: null,
  trip: null,
};

describe('validateAiIntent', () => {
  it('keeps a checked intent as it is', () => {
    expect(validateAiIntent(INTENT, TODAY)).toEqual(INTENT);
  });

  it('drops unknown values, links and past dates', () => {
    expect(
      validateAiIntent(
        {
          ...INTENT,
          categories: ['cafe', 'casino'],
          city: 'www.example.com',
          dogSize: 'huge',
          extra: 'x',
        },
        TODAY,
      ),
    ).toEqual({ ...INTENT, city: null, dogSize: null });
    const trip = validateAiIntent({ ...INTENT, intent: 'trip', trip: { destination: 'RS', transport: 'car', departureDate: '2020-01-01', returnDate: null, nights: 7, dogs: 2 } }, TODAY);
    expect(trip?.trip).toEqual({ destination: null, transport: 'car', departureDate: null, returnDate: null, nights: 7, dogs: 2 });
    expect(validateAiIntent({ intent: 'chat' }, TODAY)).toBeNull();
  });
});

describe('aiIntentToParsed', () => {
  const gazetteer = sampleGazetteer();

  it('looks the township up in our own list, within the city', () => {
    const parsed = aiIntentToParsed(INTENT, gazetteer);
    expect(parsed).toMatchObject({ kind: 'places', categories: ['cafe'], dogSize: 'large', garden: true, unknownPlace: null });
    expect(parsed.place?.townshipIds).toEqual([2]);
  });

  it('keeps a place we do not have as unknown instead of searching elsewhere', () => {
    const parsed = aiIntentToParsed({ ...INTENT, city: 'Atlantida', township: null }, gazetteer);
    expect(parsed.place).toBeNull();
    expect(parsed.unknownPlace).toBe('Atlantida');
  });

  it('reads a place without a category as every venue type', () => {
    expect(aiIntentToParsed({ ...INTENT, categories: [], township: null }, gazetteer).anyCategory).toBe(true);
  });
});

describe('AssistantAiApi', () => {
  let api: AssistantAiApi;
  let http: HttpTestingController;

  function setUp(enabled = true) {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ASSISTANT_AI_ENABLED, useValue: enabled }],
    });
    api = TestBed.inject(AssistantAiApi);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => http?.verify());

  it('sends only the message, language and date, with this browser’s random id', async () => {
    setUp();
    localStorage.removeItem(DEVICE_ID_KEY);
    const result = api.parse('kafić na Dorćolu', 'sr', TODAY);
    await settle();
    const request = http.expectOne('assistant/parse');
    expect(JSON.parse(request.request.body.payload)).toEqual({ v: 1, lang: 'sr', today: TODAY, message: 'kafić na Dorćolu' });
    expect(request.request.body.device).toBe(localStorage.getItem(DEVICE_ID_KEY));
    request.flush({ status: 'ok', intent: INTENT, remaining: 19, limit: 20 });
    expect(await result).toEqual({ status: 'ok', intent: INTENT, remaining: 19, reason: null });
  });

  it('answers the same message from memory', async () => {
    setUp();
    const first = api.parse('kafić na Dorćolu', 'sr', TODAY);
    await settle();
    http.expectOne('assistant/parse').flush({ status: 'ok', intent: INTENT });
    await first;
    expect((await api.parse('kafić na Dorćolu', 'sr', TODAY)).intent).toEqual(INTENT);
    http.expectNone('assistant/parse');
  });

  it('turns an answer that does not pass the checks into "invalid"', async () => {
    setUp();
    const result = api.parse('nešto', 'sr', TODAY);
    await settle();
    http.expectOne('assistant/parse').flush({ status: 'ok', intent: { intent: 'chat', text: 'Evo mesta...' } });
    expect((await result).status).toBe('invalid');
  });

  it('reads a missing handler (the SPA answers with HTML) as unavailable', async () => {
    setUp();
    const result = api.parse('nešto', 'sr', TODAY);
    await settle();
    http.expectOne('assistant/parse').flush('<!doctype html>', { status: 404, statusText: 'Not Found' });
    expect((await result).status).toBe('unavailable');
    expect(api.available).toBe(true);
  });

  it('stops asking for the visit once the device limit is used up', async () => {
    setUp();
    const result = api.parse('nešto', 'sr', TODAY);
    await settle();
    http.expectOne('assistant/parse').flush({ status: 'quota', reason: 'device', remaining: 0, limit: 20 });
    expect(await result).toMatchObject({ status: 'quota', reason: 'device' });
    expect(api.available).toBe(false);
    expect((await api.parse('drugo', 'sr', TODAY)).status).toBe('disabled');
    http.expectNone('assistant/parse');
  });

  it('never calls the server when the site has the AI off', async () => {
    setUp(false);
    expect(api.available).toBe(false);
    expect((await api.parse('nešto', 'sr', TODAY)).status).toBe('disabled');
    http.expectNone('assistant/parse');
  });
});
