import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@ngneat/transloco';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ASSISTANT_COPY } from './assistant-copy';
import { AssistantSession, type ChatMessage } from './assistant.session';
import { AssistantWidgetComponent } from './assistant-widget.component';
import type { PlaceResult } from './data/place-results';
import { required, sampleGazetteer } from './domain/assistant-domain.fixtures';

const copy = ASSISTANT_COPY.sr;
const BEOGRAD = required(sampleGazetteer().city('Beograd'));

const place: PlaceResult = {
  key: 'spot-1',
  kind: 'spot',
  name: 'Kafić Lesi',
  typeKey: 'cafe',
  address: 'Krunska 1',
  area: 'Vračar, Beograd',
  image: null,
  dogs: 'all',
  garden: true,
  distanceM: null,
  link: ['/spots', '1'],
  mapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=44.8,20.4',
  phone: '011 123',
  slug: 'spot-1',
};

describe('AssistantWidgetComponent', () => {
  let fixture: ComponentFixture<AssistantWidgetComponent>;
  let session: {
    copy: ReturnType<typeof signal>;
    messages: ReturnType<typeof signal<ChatMessage[]>>;
    busy: ReturnType<typeof signal<boolean>>;
    start: jest.Mock;
    send: jest.Mock;
    reset: jest.Mock;
    more: jest.Mock;
    removeFilter: jest.Mock;
    retry: jest.Mock;
  };

  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (label: string) =>
    Array.from(element().querySelectorAll('button')).find((entry) => entry.textContent?.trim().startsWith(label)) as HTMLButtonElement;
  const launcher = () => required(element().querySelector<HTMLButtonElement>('.asst-launcher'), 'the launcher');

  beforeEach(async () => {
    session = {
      copy: signal(copy),
      messages: signal<ChatMessage[]>([{ id: 1, role: 'assistant', kind: 'text', say: { key: 'welcome' }, chips: { set: 'welcome' }, note: null }]),
      busy: signal(false),
      start: jest.fn(),
      send: jest.fn(),
      reset: jest.fn(),
      more: jest.fn(),
      removeFilter: jest.fn(),
      retry: jest.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [
        AssistantWidgetComponent,
        TranslocoTestingModule.forRoot({ langs: { rs: { cafe: 'Kafić' }, en: {} }, translocoConfig: { availableLangs: ['rs', 'en'], defaultLang: 'rs' }, preloadLangs: true }),
      ],
      providers: [provideRouter([]), { provide: AnalyticsService, useValue: { event: jest.fn() } }],
    })
      .overrideComponent(AssistantWidgetComponent, { set: { providers: [{ provide: AssistantSession, useValue: session }] } })
      .compileComponents();
    fixture = TestBed.createComponent(AssistantWidgetComponent);
    fixture.detectChanges();
  });

  it('shows only the button until it is opened', () => {
    expect(element().querySelector('#assistant-panel')).toBeNull();
    expect(launcher().getAttribute('aria-expanded')).toBe('false');

    launcher().click();
    fixture.detectChanges();
    expect(session.start).toHaveBeenCalled();
    expect(element().querySelector('#assistant-panel')).not.toBeNull();
    expect(text()).toContain(copy.welcome);
    expect(launcher().getAttribute('aria-expanded')).toBe('true');
  });

  it('writes the conversation in the language the site switches to', () => {
    launcher().click();
    fixture.detectChanges();
    expect(text()).toContain(copy.welcome);

    session.copy.set(ASSISTANT_COPY.en);
    fixture.detectChanges();
    expect(text()).toContain(ASSISTANT_COPY.en.welcome);
    expect(text()).not.toContain(copy.welcome);
    // The suggestions too, and they are sent in English.
    button(ASSISTANT_COPY.en.welcomeChips[3].label).click();
    expect(session.send).toHaveBeenCalledWith('Places to stay on Zlatibor');
  });

  it('sends a suggestion as a message', () => {
    launcher().click();
    fixture.detectChanges();
    button(copy.welcomeChips[0].label).click();
    expect(session.send).toHaveBeenCalledWith(copy.welcomeChips[0].label);
  });

  it('lists the places of a reply with their links, and loads more on request', () => {
    session.messages.set([
      {
        id: 2,
        role: 'assistant',
        kind: 'results',
        query: { categories: ['cafe'], place: BEOGRAD, nearMe: false, radius: null, dogSize: 'large', garden: true, name: null },
        area: { near: null, nearPlace: null },
        groups: [{ category: 'cafe', scope: { kind: 'place', place: BEOGRAD }, items: [place], widened: false, cursor: { kind: 'parks', offset: 6 }, link: { path: '/beograd/kafici' } }],
        note: null,
        loadingMore: null,
      },
    ]);
    launcher().click();
    fixture.detectChanges();

    expect(text()).toContain('Kafići u Beogradu');
    expect(text()).toContain('Kafić Lesi');
    expect(text()).toContain(copy.dogs.all);
    expect(text()).toContain(copy.gardenYes);
    const details = element().querySelector<HTMLAnchorElement>('a[href="/spots/1"]');
    expect(details).not.toBeNull();
    expect(element().querySelector('a[data-link-type="venue_maps"]')?.getAttribute('href')).toBe(place.mapsUrl);
    expect(element().querySelector('a[href="tel:011 123"]')).not.toBeNull();
    expect(element().querySelector('a[href="/beograd/kafici"]')).not.toBeNull();

    button(copy.more).click();
    expect(session.more).toHaveBeenCalledWith(2, 0);
    button(copy.filters.garden).click();
    expect(session.removeFilter).toHaveBeenCalledWith(2, 'garden');
  });

  it('closes on Escape', () => {
    launcher().click();
    fixture.detectChanges();
    required(element().querySelector('#assistant-panel')).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(element().querySelector('#assistant-panel')).toBeNull();
  });
});
