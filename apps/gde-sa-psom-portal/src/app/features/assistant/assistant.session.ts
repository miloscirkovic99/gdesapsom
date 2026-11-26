import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, Injectable, PLATFORM_ID, signal, untracked } from '@angular/core';
import { injectActiveLang } from '@gde/shared/util';
import { firstValueFrom } from 'rxjs';
import { AnalyticsService } from '../../core/services/analytics.service';
import { reverseGeocode } from '../../shared/utils/geocode';
import { PetFriendlyListingsService } from '../pet-friendly/pet-friendly-listings.service';
import { todayIso } from '../pet-trip/domain/dates';
import { type Lang, tripLang } from '../pet-trip/domain/lang';
import { AssistantAiApi } from './ai/assistant-ai.api';
import { aiIntentToParsed } from './ai/assistant-ai.validate';
import { ASSISTANT_COPY, type AssistantCopy, type ChipSet, type Note, type Say } from './assistant-copy';
import { AssistantSearch, type GeoPoint, type SearchArea } from './data/assistant-search.service';
import type { ResultGroup } from './data/place-results';
import { buildGazetteer, EMPTY_GAZETTEER, type Gazetteer, placeFromAddress } from './domain/gazetteer';
import { parseMessage } from './domain/parse-message';
import type { PlaceRef, PlacesQuery, TripQuery } from './domain/query.models';
import { type AssistantContext, EMPTY_CONTEXT, nextContext, resolveStep, type Step } from './domain/resolve-step';
import { MAX_MESSAGE_LENGTH } from './domain/text';
import { SEASIDE_COUNTRIES } from './domain/vocabulary';
import type { TripCheck } from './trip/trip-check';

/**
 * A conversation entry. Replies hold what they say (keys, places, rows), not
 * words: the panel writes them in the site's current language, so switching
 * the language translates the whole conversation. Only the visitor's own
 * messages are text.
 */
export type ChatMessage =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'assistant'; kind: 'text'; say: Say; chips: ChipSet; note: Note | null }
  | {
      id: number;
      role: 'assistant';
      kind: 'results';
      query: PlacesQuery;
      area: SearchArea;
      groups: ResultGroup[];
      note: Note | null;
      /** Index of the group whose next batch is loading. */
      loadingMore: number | null;
    }
  /** The check is text from the planner's rules, so it is worked out again when the language changes. */
  | { id: number; role: 'assistant'; kind: 'trip'; query: TripQuery; lang: Lang; check: TripCheck; note: Note | null }
  | { id: number; role: 'assistant'; kind: 'pending' }
  /** `retry` is the message to send again; empty when there is nothing to repeat. */
  | { id: number; role: 'assistant'; kind: 'error'; retry: string };

type NewMessage = ChatMessage extends infer M ? (M extends ChatMessage ? Omit<M, 'id'> : never) : never;

export type FilterKey = 'garden' | 'dog' | 'near';

const STORAGE_KEY = 'gsp_assistant_v1';
/** Version of the saved shape; conversations saved in another one are dropped. */
const STORAGE_VERSION = 2;
/** Messages kept in a conversation (and in sessionStorage). */
const MAX_MESSAGES = 40;
/** Countries offered when the destination is missing: the most asked first. */
const DESTINATION_CHIPS = [...SEASIDE_COUNTRIES, 'BA', 'HU', 'AT'] as const;

type Located = GeoPoint | 'denied' | 'unavailable';

/**
 * One conversation with the assistant: the messages, what has been settled
 * so far (city, category, dog), and the steps for each message.
 *
 * A message is read on the device first (parseMessage). Only what that
 * cannot read goes to the AI, which returns filters, never places. The
 * search runs over our database, and each reply holds the rows it found.
 * The conversation is kept in sessionStorage, so it survives the visitor
 * opening a result and coming back, but not the end of the visit.
 */
@Injectable()
export class AssistantSession {
  readonly #search = inject(AssistantSearch);
  readonly #ai = inject(AssistantAiApi);
  readonly #listings = inject(PetFriendlyListingsService);
  readonly #analytics = inject(AnalyticsService);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #activeLang = injectActiveLang();

  readonly lang = computed<Lang>(() => tripLang(this.#activeLang()));
  readonly copy = computed<AssistantCopy>(() => ASSISTANT_COPY[this.lang()]);
  readonly messages = signal<ChatMessage[]>([]);
  readonly busy = signal(false);

  #context: AssistantContext = EMPTY_CONTEXT;
  #gazetteer: Promise<Gazetteer> | null = null;
  #position: GeoPoint | null = null;
  #placeAround: PlaceRef | null = null;
  #tripModule: Promise<typeof import('./trip/trip-check')> | null = null;
  #nextId = 1;
  #started = false;

  constructor() {
    // Trip checks are the planner's own sentences: written again in the new language.
    effect(() => {
      const lang = this.lang();
      untracked(() => void this.#retranslateTrips(lang));
    });
  }

  /** Called when the panel first opens: the saved conversation, or a welcome. Starts loading the place names. */
  start(): void {
    if (this.#started || !this.#isBrowser) return;
    this.#started = true;
    void this.#places();
    if (!this.#restore()) this.#welcome();
  }

  reset(): void {
    this.#context = EMPTY_CONTEXT;
    this.messages.set([]);
    this.#welcome();
    this.#save();
  }

  async send(raw: string): Promise<void> {
    const text = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text || this.busy()) return;
    this.busy.set(true);
    this.#append({ role: 'user', text });
    const pending = this.#append({ role: 'assistant', kind: 'pending' });
    try {
      this.#replace(pending, await this.#answer(text));
    } catch {
      this.#replace(pending, { role: 'assistant', kind: 'error', retry: text });
    } finally {
      this.busy.set(false);
      this.#save();
    }
  }

  /** The error reply's "try again": the same message once more, without repeating it in the conversation. */
  async retry(messageId: number): Promise<void> {
    const message = this.messages().find((entry) => entry.id === messageId);
    if (!message || message.role !== 'assistant' || message.kind !== 'error' || this.busy()) return;
    this.busy.set(true);
    this.#replace(messageId, { role: 'assistant', kind: 'pending' });
    try {
      this.#replace(messageId, await this.#answer(message.retry));
    } catch {
      this.#replace(messageId, { role: 'assistant', kind: 'error', retry: message.retry });
    } finally {
      this.busy.set(false);
      this.#save();
    }
  }

  /** The next batch of one group of a reply. */
  async more(messageId: number, groupIndex: number): Promise<void> {
    const message = this.#results(messageId);
    const group = message?.groups[groupIndex];
    if (!message || !group?.cursor || message.loadingMore !== null) return;
    this.#update(messageId, { loadingMore: groupIndex });
    try {
      const next = await this.#search.more(group, message.query, message.area);
      const current = this.#results(messageId);
      if (current) this.#update(messageId, { groups: current.groups.map((entry, index) => (index === groupIndex ? next : entry)), loadingMore: null });
    } catch {
      this.#update(messageId, { loadingMore: null });
    } finally {
      this.#save();
    }
  }

  /** Drops one filter of a reply and searches again in its place. */
  async removeFilter(messageId: number, key: FilterKey): Promise<void> {
    const message = this.#results(messageId);
    if (!message || this.busy()) return;
    const query: PlacesQuery = {
      ...message.query,
      garden: key === 'garden' ? false : message.query.garden,
      dogSize: key === 'dog' ? null : message.query.dogSize,
      nearMe: key === 'near' ? false : message.query.nearMe,
      radius: key === 'near' ? null : message.query.radius,
    };
    const latest = this.#context.places === message.query;
    this.busy.set(true);
    this.#replace(messageId, { role: 'assistant', kind: 'pending' });
    try {
      const step: Step = !query.place && !query.nearMe && !query.categories.every((category) => category === 'stay')
        ? { type: 'ask-place', query, unknownPlace: null }
        : { type: 'search', query };
      if (latest) this.#context = nextContext(this.#context, step);
      this.#replace(messageId, await this.#execute(step, null));
    } catch {
      this.#replace(messageId, { role: 'assistant', kind: 'error', retry: '' });
    } finally {
      this.busy.set(false);
      this.#save();
    }
  }

  async #answer(text: string): Promise<NewMessage> {
    const today = todayIso();
    const gazetteer = await this.#places();
    let step = resolveStep(parseMessage(text, gazetteer, today), this.#context);
    let note: Note | null = null;
    let source: 'local' | 'ai' = 'local';

    const unreadable = step.type === 'not-understood' || (step.type === 'ask-place' && step.unknownPlace !== null);
    if (unreadable && this.#ai.available) {
      const result = await this.#ai.parse(text, this.lang(), today);
      if (result.intent) {
        const aiStep = resolveStep(aiIntentToParsed(result.intent, gazetteer), this.#context);
        if (aiStep.type !== 'not-understood') {
          step = aiStep;
          source = 'ai';
          note = { kind: 'ai' };
        }
      } else if (result.status === 'quota' && result.reason) {
        note = { kind: 'quota', reason: result.reason };
      }
    }

    this.#context = nextContext(this.#context, step);
    this.#track(step, source);
    return this.#execute(step, note);
  }

  async #execute(step: Step, note: Note | null): Promise<NewMessage> {
    switch (step.type) {
      case 'search':
        return this.#runSearch(step.query, note);
      case 'ask-place':
        return this.#text(
          step.unknownPlace ? { key: 'unknownPlace', name: step.unknownPlace } : { key: 'askPlace', categories: step.query.categories },
          { set: 'place', nearMe: true },
          note,
        );
      case 'ask-category':
        return this.#text({ key: 'askCategory' }, { set: 'category' }, note);
      case 'trip':
        return this.#runTrip(step.query, note);
      case 'ask-destination':
        return this.#askDestination(note);
      case 'reply':
        if (step.reply === 'thanks') return this.#text({ key: 'thanks' }, { set: 'none' }, note);
        return this.#text({ key: step.reply === 'help' ? 'help' : 'greeting' }, { set: 'welcome' }, note);
      case 'not-understood':
        return this.#text({ key: 'notUnderstood' }, { set: 'welcome' }, note);
    }
  }

  async #runSearch(query: PlacesQuery, note: Note | null): Promise<NewMessage> {
    const area: SearchArea = { near: null, nearPlace: null };
    if (query.nearMe) {
      const located = await this.#locate();
      if (located === 'denied' || located === 'unavailable') {
        return this.#text({ key: located === 'denied' ? 'locationDenied' : 'locationUnavailable' }, { set: 'place', nearMe: false }, note);
      }
      area.near = located;
      if (query.categories.some((category) => category === 'park' || category === 'vet')) {
        area.nearPlace = await this.#around(located);
        const onlyByPlace = query.categories.every((category) => category === 'park' || category === 'vet');
        if (!area.nearPlace && onlyByPlace) return this.#text({ key: 'nearPlaceUnknown' }, { set: 'place', nearMe: false }, note);
      }
    }
    const groups = await this.#search.search(query, area);
    return { role: 'assistant', kind: 'results', query, area, groups, note, loadingMore: null };
  }

  async #runTrip(query: TripQuery, note: Note | null): Promise<NewMessage> {
    const lang = this.lang();
    const check = (await this.#trip()).checkTrip(query, todayIso(), lang);
    if (!check) return this.#askDestination(note);
    return { role: 'assistant', kind: 'trip', query, lang, check, note };
  }

  /** The trip rules are a chunk of their own, loaded the first time a trip comes up. */
  #trip(): Promise<typeof import('./trip/trip-check')> {
    this.#tripModule ??= import('./trip/trip-check');
    return this.#tripModule;
  }

  /** Trip checks written in another language (before a switch, or saved before a page change), written again. */
  async #retranslateTrips(lang: Lang): Promise<void> {
    if (!this.messages().some((message) => message.role === 'assistant' && message.kind === 'trip' && message.lang !== lang)) return;
    const { checkTrip } = await this.#trip();
    const today = todayIso();
    this.messages.update((messages) =>
      messages.map((message) => {
        if (message.role !== 'assistant' || message.kind !== 'trip' || message.lang === lang) return message;
        const check = checkTrip(message.query, today, lang);
        return check ? { ...message, lang, check } : message;
      }),
    );
    this.#save();
  }

  #askDestination(note: Note | null): NewMessage {
    return this.#text({ key: 'askDestination' }, { set: 'destination', codes: [...DESTINATION_CHIPS] }, note);
  }

  #text(say: Say, chips: ChipSet, note: Note | null): NewMessage {
    return { role: 'assistant', kind: 'text', say, chips, note };
  }

  /** The database's city and township names; loaded once a visit, retried after a failure. */
  #places(): Promise<Gazetteer> {
    if (!this.#gazetteer) {
      this.#gazetteer = firstValueFrom(this.#listings.places()).then(({ cities, townships }) => {
        const gazetteer = buildGazetteer(cities, townships);
        if (gazetteer.empty) this.#gazetteer = null;
        return gazetteer;
      }, () => {
        this.#gazetteer = null;
        return EMPTY_GAZETTEER;
      });
    }
    return this.#gazetteer;
  }

  /** The visitor's position, asked for only when a message wants something nearby; kept for the visit. */
  #locate(): Promise<Located> {
    if (this.#position) return Promise.resolve(this.#position);
    const geolocation = globalThis.navigator?.geolocation;
    if (!geolocation) return Promise.resolve('unavailable');
    return new Promise((resolve) => {
      geolocation.getCurrentPosition(
        ({ coords }) => {
          this.#position = { lat: coords.latitude, lon: coords.longitude };
          resolve(this.#position);
        },
        (error) => resolve(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
      );
    });
  }

  /** The township or city around the visitor, for parks and vets (they have no coordinates). */
  async #around(position: GeoPoint): Promise<PlaceRef | null> {
    if (this.#placeAround) return this.#placeAround;
    try {
      const [hit, gazetteer] = await Promise.all([reverseGeocode(position.lat, position.lon), this.#places()]);
      // Kept for the visit once found; a miss (or a failed lookup) is asked again next time.
      this.#placeAround = hit ? placeFromAddress(hit.names, gazetteer) : null;
    } catch {
      this.#placeAround = null;
    }
    return this.#placeAround;
  }

  /** GA4: what kind of step and search, never the visitor's words. */
  #track(step: Step, source: 'local' | 'ai'): void {
    const query = step.type === 'search' || step.type === 'ask-place' || step.type === 'ask-category' ? step.query : null;
    this.#analytics.event('assistant_message', {
      step: step.type,
      source,
      categories: query?.categories.join(',') || undefined,
      place_kind: query?.place?.kind ?? (query?.nearMe ? 'near' : undefined),
      destination: step.type === 'trip' ? (step.query.destination ?? undefined) : undefined,
    });
  }

  #welcome(): void {
    this.#append(this.#text({ key: 'welcome' }, { set: 'welcome' }, null));
  }

  #append(message: NewMessage): number {
    const id = this.#nextId++;
    this.messages.update((messages) => [...messages, { ...message, id } as ChatMessage].slice(-MAX_MESSAGES));
    return id;
  }

  #replace(id: number, message: NewMessage): void {
    this.messages.update((messages) => messages.map((entry) => (entry.id === id ? ({ ...message, id } as ChatMessage) : entry)));
  }

  #update(id: number, patch: Partial<Extract<ChatMessage, { kind: 'results' }>>): void {
    this.messages.update((messages) =>
      messages.map((entry) => (entry.id === id && entry.role === 'assistant' && entry.kind === 'results' ? { ...entry, ...patch } : entry)),
    );
  }

  #results(id: number): Extract<ChatMessage, { kind: 'results' }> | null {
    const message = this.messages().find((entry) => entry.id === id);
    return message?.role === 'assistant' && message.kind === 'results' ? message : null;
  }

  /**
   * Saved without photos (they are base64 and would fill the storage) and
   * without the half-done ones; a restored reply shows a placeholder image.
   */
  #save(): void {
    if (!this.#isBrowser) return;
    const messages = this.messages()
      .filter((message) => !(message.role === 'assistant' && message.kind === 'pending'))
      .map((message) =>
        message.role === 'assistant' && message.kind === 'results'
          ? {
              ...message,
              loadingMore: null,
              groups: message.groups.map((group) => ({
                ...group,
                items: group.items.map((item) => ({ ...item, image: item.image?.startsWith('data:') ? null : item.image })),
              })),
            }
          : message,
      );
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ v: STORAGE_VERSION, messages, context: this.#context }));
    } catch {
      // Private mode or a full quota: the conversation lasts as long as the page.
    }
  }

  #restore(): boolean {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null');
      if (saved?.v !== STORAGE_VERSION || !Array.isArray(saved.messages) || !saved.messages.length) return false;
      const messages = (saved.messages as ChatMessage[]).filter((message) => typeof message?.id === 'number').slice(-MAX_MESSAGES);
      this.messages.set(messages);
      this.#nextId = Math.max(0, ...messages.map((message) => message.id)) + 1;
      this.#context = { ...EMPTY_CONTEXT, ...(saved.context ?? {}) };
      // The context's query is the same object as the last reply's, so "remove filter" can tell them apart again.
      const last = [...messages].reverse().find((message) => message.role === 'assistant' && message.kind === 'results');
      if (last && last.role === 'assistant' && last.kind === 'results' && JSON.stringify(last.query) === JSON.stringify(this.#context.places)) {
        this.#context = { ...this.#context, places: last.query };
      }
      return true;
    } catch {
      return false;
    }
  }
}
