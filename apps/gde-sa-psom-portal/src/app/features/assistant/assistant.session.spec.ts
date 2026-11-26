import { TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@ngneat/transloco';
import { of } from 'rxjs';
import { AnalyticsService } from '../../core/services/analytics.service';
import { PetFriendlyListingsService } from '../pet-friendly/pet-friendly-listings.service';
import { AssistantAiApi } from './ai/assistant-ai.api';
import type { AiParseResult } from './ai/assistant-ai.models';
import { ASSISTANT_COPY, noteText } from './assistant-copy';
import { AssistantSession, type ChatMessage } from './assistant.session';
import { AssistantSearch } from './data/assistant-search.service';
import type { ResultGroup } from './data/place-results';
import { SAMPLE_CITIES, SAMPLE_TOWNSHIPS } from './domain/assistant-domain.fixtures';
import type { PlacesQuery } from './domain/query.models';

const copy = ASSISTANT_COPY.sr;

function group(query: PlacesQuery): ResultGroup {
  return {
    category: query.categories[0] ?? null,
    scope: query.place ? { kind: 'place', place: query.place } : { kind: 'serbia' },
    items: [],
    widened: false,
    cursor: null,
    link: null,
  };
}

describe('AssistantSession', () => {
  let session: AssistantSession;
  let search: { search: jest.Mock; more: jest.Mock };
  let ai: { available: boolean; parse: jest.Mock };
  let events: jest.Mock;

  function setUp(options: { ai?: boolean } = {}) {
    search = { search: jest.fn((query: PlacesQuery) => Promise.resolve([group(query)])), more: jest.fn() };
    ai = { available: options.ai ?? false, parse: jest.fn() };
    events = jest.fn();
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({ langs: { rs: {}, en: {} }, translocoConfig: { availableLangs: ['rs', 'en'], defaultLang: 'rs' } }),
      ],
      providers: [
        AssistantSession,
        { provide: AssistantSearch, useValue: search },
        { provide: AssistantAiApi, useValue: ai },
        { provide: PetFriendlyListingsService, useValue: { places: () => of({ cities: SAMPLE_CITIES, townships: SAMPLE_TOWNSHIPS }) } },
        { provide: AnalyticsService, useValue: { event: events } },
      ],
    });
    session = TestBed.inject(AssistantSession);
  }

  const last = (): ChatMessage => session.messages()[session.messages().length - 1];
  const lastQuery = (): PlacesQuery => search.search.mock.calls[search.search.mock.calls.length - 1][0];

  beforeEach(() => sessionStorage.clear());

  it('opens with a welcome and suggestions', () => {
    setUp();
    session.start();
    expect(session.messages()).toHaveLength(1);
    expect(last()).toMatchObject({ role: 'assistant', kind: 'text', say: { key: 'welcome' }, chips: { set: 'welcome' } });
  });

  it('answers a clear message from its own reading, without the AI', async () => {
    setUp({ ai: true });
    session.start();
    await session.send('hoću da idem u Beograd u kafić');

    expect(ai.parse).not.toHaveBeenCalled();
    expect(lastQuery()).toMatchObject({ categories: ['cafe'], place: { name: 'Beograd' } });
    expect(last()).toMatchObject({ role: 'assistant', kind: 'results', note: null });
    // Analytics get the kind of search, never the words.
    expect(JSON.stringify(events.mock.calls)).not.toContain('hoću');
  });

  it('asks where, then completes the search with the answer', async () => {
    setUp();
    session.start();
    await session.send('kafić sa baštom');
    expect(last()).toMatchObject({ kind: 'text', say: { key: 'askPlace', categories: ['cafe'] }, chips: { set: 'place', nearMe: true } });
    expect(search.search).not.toHaveBeenCalled();

    await session.send('Niš');
    expect(lastQuery()).toMatchObject({ categories: ['cafe'], garden: true, place: { name: 'Niš' } });
  });

  it('asks the AI only when it cannot read the message, and searches with what the AI understood', async () => {
    setUp({ ai: true });
    ai.parse.mockResolvedValue({
      status: 'ok',
      remaining: 19,
      reason: null,
      intent: { intent: 'places', categories: ['restaurant'], city: 'Beograd', township: 'Zemun', nearMe: false, dogSize: null, garden: false, venueName: null, trip: null },
    } satisfies AiParseResult);
    session.start();
    await session.send('gde da klopamo pored kej na reci kod Gardoša');

    expect(ai.parse).toHaveBeenCalledWith('gde da klopamo pored kej na reci kod Gardoša', 'sr', expect.any(String));
    expect(lastQuery()).toMatchObject({ categories: ['restaurant'], place: { name: 'Zemun' } });
    expect(last()).toMatchObject({ kind: 'results', note: { kind: 'ai' } });
  });

  it('falls back to its own reply when the AI is out of quota', async () => {
    setUp({ ai: true });
    ai.parse.mockResolvedValue({ status: 'quota', intent: null, remaining: 0, reason: 'device' } satisfies AiParseResult);
    session.start();
    await session.send('asdf qwer');
    expect(last()).toMatchObject({ kind: 'text', say: { key: 'notUnderstood' }, note: { kind: 'quota', reason: 'device' } });
    expect(noteText({ kind: 'quota', reason: 'device' }, copy)).toBe(copy.aiQuota.device);
  });

  it('checks a trip abroad with the planner’s rules', async () => {
    setUp();
    session.start();
    await session.send('idem kolima u Hrvatsku sa psom');
    const message = last();
    expect(message).toMatchObject({ kind: 'trip' });
    if (message.role === 'assistant' && message.kind === 'trip') {
      expect(message.check.plannerParams).toMatchObject({ destination: 'HR', transport: 'car' });
    }
  });

  it('writes a trip check again in the language the site switches to', async () => {
    setUp();
    session.start();
    await session.send('idem kolima u Hrvatsku sa psom');
    expect(last()).toMatchObject({ kind: 'trip', lang: 'sr' });

    TestBed.inject(TranslocoService).setActiveLang('en');
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const message = last();
    expect(message).toMatchObject({ kind: 'trip', lang: 'en' });
    if (message.role === 'assistant' && message.kind === 'trip') {
      expect(message.check.headline).toContain('Croatia');
      expect(message.check.headline).toContain('by car');
    }
  });

  it('drops a filter in place and searches again', async () => {
    setUp();
    session.start();
    await session.send('kafić sa baštom u Beogradu za velikog psa');
    const id = last().id;
    await session.removeFilter(id, 'garden');

    expect(search.search).toHaveBeenCalledTimes(2);
    expect(lastQuery()).toMatchObject({ garden: false, dogSize: 'large', place: { name: 'Beograd' } });
    expect(last().id).toBe(id);
    // The next follow-up builds on the search without the filter.
    await session.send('a restorani?');
    expect(lastQuery()).toMatchObject({ categories: ['restaurant'], garden: false, dogSize: 'large' });
  });

  it('says so when it may not use the location', async () => {
    setUp();
    const getCurrentPosition = jest.fn((_ok: PositionCallback, fail: PositionErrorCallback) =>
      fail({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError),
    );
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });
    session.start();
    await session.send('park za pse blizu mene');
    // Cities to pick from, without "near me" again.
    expect(last()).toMatchObject({ kind: 'text', say: { key: 'locationDenied' }, chips: { set: 'place', nearMe: false } });
    expect(search.search).not.toHaveBeenCalled();
  });

  it('keeps the conversation for the visit, without photos', async () => {
    setUp();
    search.search.mockResolvedValue([
      {
        category: 'cafe',
        scope: { kind: 'serbia' },
        items: [{ key: 'spot-1', kind: 'spot', name: 'A', typeKey: null, address: null, area: null, image: 'data:image/png;base64,AAAA', dogs: null, garden: null, distanceM: null, link: null, mapsUrl: null, phone: null, slug: 'spot-1' }],
        widened: false,
        cursor: null,
        link: null,
      } satisfies ResultGroup,
    ]);
    session.start();
    await session.send('kafići u Beogradu');
    const saved = sessionStorage.getItem('gsp_assistant_v1') ?? '';
    expect(saved).toContain('kafići u Beogradu');
    expect(saved).not.toContain('data:image');

    TestBed.resetTestingModule();
    setUp();
    session.start();
    expect(session.messages().map((message) => message.role)).toEqual(['assistant', 'user', 'assistant']);
    await session.send('a restorani?');
    expect(lastQuery()).toMatchObject({ categories: ['restaurant'], place: { name: 'Beograd' } });
  });
});
