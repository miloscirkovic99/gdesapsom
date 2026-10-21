import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import { Subject } from 'rxjs';
import { DRAFT_MAX_AGE_MS, DRAFT_RESUME_MS, FormDraftService, parseDraft } from './form-draft.service';

jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
}));

const prefs = Preferences as jest.Mocked<typeof Preferences>;
const NOW = new Date('2026-10-21T12:00:00Z').getTime();

describe('parseDraft', () => {
  const stored = (savedAt: number, extra: object = {}) =>
    JSON.stringify({ values: { iuo_ime: 'Kafić Lajka' }, step: 2, savedAt, ...extra });

  it('reads a fresh draft', () => {
    expect(parseDraft(stored(NOW - 1000), NOW)).toEqual({ values: { iuo_ime: 'Kafić Lajka' }, step: 2, savedAt: NOW - 1000 });
  });

  it('drops drafts that are too old, broken or missing', () => {
    expect(parseDraft(stored(NOW - DRAFT_MAX_AGE_MS - 1), NOW)).toBeNull();
    expect(parseDraft('{not json', NOW)).toBeNull();
    expect(parseDraft(JSON.stringify({ step: 1, savedAt: NOW }), NOW)).toBeNull();
    expect(parseDraft(null, NOW)).toBeNull();
  });

  it('falls back to the first step when the saved one is unusable', () => {
    expect(parseDraft(stored(NOW, { step: -1 }), NOW)?.step).toBe(0);
    expect(parseDraft(stored(NOW, { step: 'two' }), NOW)?.step).toBe(0);
  });
});

describe('FormDraftService', () => {
  let router: { url: string; navigated: boolean; events: Subject<unknown>; navigateByUrl: jest.Mock };
  let store: Record<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    store = {};
    prefs.get.mockImplementation(async ({ key }) => ({ value: store[key] ?? null }));
    prefs.set.mockImplementation(async ({ key, value }) => void (store[key] = value));
    prefs.remove.mockImplementation(async ({ key }) => void delete store[key]);
    router = { url: '/tabs/home', navigated: true, events: new Subject(), navigateByUrl: jest.fn().mockResolvedValue(true) };
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }] });
  });

  afterEach(() => jest.restoreAllMocks());

  it('saves and loads values with the step', async () => {
    const drafts = TestBed.inject(FormDraftService);
    drafts.save('suggest-spot', { iuo_ime: 'Lajka' }, 2);
    await Promise.resolve();

    expect(await drafts.load('suggest-spot')).toEqual({ values: { iuo_ime: 'Lajka' }, step: 2, savedAt: NOW });
  });

  it('keeps photos under their own keys and clears them with the draft', async () => {
    const drafts = TestBed.inject(FormDraftService);
    drafts.save('suggest-spot', { iuo_ime: 'Lajka' }, 3);
    drafts.savePhoto('suggest-spot', 'outside', 'data:image/jpeg;base64,AAAA');
    await Promise.resolve();
    expect(await drafts.loadPhoto('suggest-spot', 'outside')).toBe('data:image/jpeg;base64,AAAA');

    drafts.clear('suggest-spot');
    await Promise.resolve();
    expect(store).toEqual({});
  });

  it('ignores a stored photo that is not an image data URL', async () => {
    store['draft:suggest-spot:photo:inside'] = 'https://example.com/x.jpg';
    expect(await TestBed.inject(FormDraftService).loadPhoto('suggest-spot', 'inside')).toBeNull();
  });

  it('reopens the latest recent form at launch', async () => {
    store['draft:suggest-park'] = JSON.stringify({ values: { par_ime: 'Ada' }, step: 0, savedAt: NOW - 60_000 });
    store['draft:suggest-spot'] = JSON.stringify({ values: { iuo_ime: 'Lajka' }, step: 1, savedAt: NOW - 1000 });

    await TestBed.inject(FormDraftService).resume();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/more/suggest-spot');
  });

  it('waits for the first navigation, so a link the app opened with is not overridden', async () => {
    store['draft:suggest-spot'] = JSON.stringify({ values: { iuo_ime: 'Lajka' }, step: 1, savedAt: NOW });
    router.url = '/';
    router.navigated = false;

    const resumed = TestBed.inject(FormDraftService).resume();
    router.url = '/tabs/places/spots/41';
    router.navigated = true;
    router.events.next(new NavigationEnd(1, '/tabs/places/spots/41', '/tabs/places/spots/41'));
    await resumed;

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not reopen an old draft or override a link the app was opened with', async () => {
    store['draft:suggest-spot'] = JSON.stringify({ values: { iuo_ime: 'Lajka' }, step: 1, savedAt: NOW - DRAFT_RESUME_MS - 1 });
    await TestBed.inject(FormDraftService).resume();
    expect(router.navigateByUrl).not.toHaveBeenCalled();

    store['draft:suggest-spot'] = JSON.stringify({ values: { iuo_ime: 'Lajka' }, step: 1, savedAt: NOW });
    router.url = '/tabs/places/spots/41';
    await TestBed.inject(FormDraftService).resume();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
