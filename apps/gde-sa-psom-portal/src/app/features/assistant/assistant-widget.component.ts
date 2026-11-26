import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ClientImagePipe } from '../../shared/utils/client-image.pipe';
import { type Chip, type ChipSet, chipsOf, type Note, noteText, type Say, sayText } from './assistant-copy';
import { AssistantSession, type ChatMessage, type FilterKey } from './assistant.session';
import { NEAR_RADIUS_M } from './data/assistant-search.service';
import type { PlaceResult, ResultGroup } from './data/place-results';
import { isSpotCategory, type PlacesQuery } from './domain/query.models';
import { MAX_MESSAGE_LENGTH } from './domain/text';

type ResultsMessage = Extract<ChatMessage, { kind: 'results' }>;

interface FilterChip {
  key: FilterKey;
  label: string;
}

/** Below this width the panel covers the screen. */
const MOBILE_QUERY = '(max-width: 767.98px)';

/**
 * The floating "Pitaj Gde sa psom" button and the chat panel it opens, on
 * every public page. Rendered only in the browser, inside a `@defer` block
 * of the app shell, so neither the prerendered HTML nor the first bundle
 * carry it.
 *
 * Every place in a reply is a row from our database (AssistantSession);
 * links go to the place's page, the map, or the site's full list.
 */
@Component({
  selector: 'app-assistant-widget',
  imports: [RouterLink, TranslocoModule, ClientImagePipe],
  templateUrl: './assistant-widget.component.html',
  styleUrl: './assistant-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AssistantSession],
})
export class AssistantWidgetComponent {
  readonly session = inject(AssistantSession);
  readonly #document = inject(DOCUMENT);
  readonly #analytics = inject(AnalyticsService);

  readonly copy = this.session.copy;
  readonly open = signal(false);
  readonly draft = signal('');
  readonly maxLength = MAX_MESSAGE_LENGTH;
  readonly mobile = signal(false);
  readonly canSend = computed(() => this.draft().trim().length > 0 && !this.session.busy());

  private readonly launcher = viewChild<ElementRef<HTMLButtonElement>>('launcher');
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('input');
  private readonly log = viewChild<ElementRef<HTMLElement>>('log');
  #lastKey = '';

  constructor() {
    const view = this.#document.defaultView;
    const media = view?.matchMedia?.(MOBILE_QUERY);
    if (media) {
      this.mobile.set(media.matches);
      const onChange = (event: MediaQueryListEvent) => this.mobile.set(event.matches);
      media.addEventListener?.('change', onChange);
      inject(DestroyRef).onDestroy(() => {
        media.removeEventListener?.('change', onChange);
        this.#lockScroll(false);
      });
    }

    // A sent message scrolls to the bottom; a reply that does not fit puts its question at the
    // top, so a long result list is read from where it starts. "More" keeps the scroll as it is.
    effect(() => {
      const messages = this.session.messages();
      const log = this.log()?.nativeElement;
      if (!log || !this.open()) return;
      const last = messages[messages.length - 1];
      const key = last ? `${messages.length}:${last.id}:${last.role === 'assistant' ? last.kind : 'user'}` : '';
      if (key === this.#lastKey) return;
      this.#lastKey = key;
      const reply = last?.role === 'assistant' && last.kind !== 'pending';
      setTimeout(() => {
        const nodes = log.querySelectorAll<HTMLElement>('[data-message]');
        const answer = nodes[nodes.length - 1];
        const question = nodes[nodes.length - 2];
        if (reply && answer && question && answer.offsetHeight > log.clientHeight * 0.5) {
          // The log is the messages' offsetParent (position: relative), so offsetTop is the scroll position.
          log.scrollTo({ top: question.offsetTop - 12, behavior: 'smooth' });
        } else {
          log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
        }
      });
    });
  }

  toggle(): void {
    if (this.open()) this.close();
    else this.show();
  }

  show(): void {
    this.open.set(true);
    this.session.start();
    this.#lastKey = '';
    this.#lockScroll(this.mobile());
    this.#analytics.event('assistant_open', {});
    setTimeout(() => this.input()?.nativeElement.focus());
  }

  close(): void {
    this.open.set(false);
    this.#lockScroll(false);
    setTimeout(() => this.launcher()?.nativeElement.focus());
  }

  submit(event: Event): void {
    event.preventDefault();
    if (!this.canSend()) return;
    void this.session.send(this.draft());
    this.draft.set('');
    // Enter before the next change detection: the binding would still hold '' and leave the text.
    const input = this.input()?.nativeElement;
    if (input) input.value = '';
  }

  onInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  sendChip(chip: Chip): void {
    if (this.session.busy()) return;
    void this.session.send(chip.text ?? chip.label);
    this.input()?.nativeElement.focus();
  }

  /** A link to a page of the site: on a phone the panel steps aside so the page shows. */
  followed(item?: PlaceResult): void {
    if (item) this.#analytics.event('assistant_result_click', { result_kind: item.kind, venue_slug: item.slug });
    if (this.mobile()) this.close();
  }

  /** Replies are written here, in the site's current language, from what they say. */
  sayText(say: Say): string {
    return sayText(say, this.copy());
  }

  chipsOf(chips: ChipSet): Chip[] {
    return chipsOf(chips, this.copy());
  }

  noteText(note: Note | null): string | null {
    return noteText(note, this.copy());
  }

  groupTitle(group: ResultGroup): string {
    const copy = this.copy();
    return group.scope.kind === 'near' ? copy.nearTitle(group.category) : copy.groupTitle(group.category, group.scope);
  }

  widenedText(group: ResultGroup): string | null {
    if (!group.widened || group.scope.kind !== 'place') return null;
    return this.copy().widened(group.scope.place.name, group.scope.place.cityNames[0] ?? '');
  }

  /**
   * The filters a reply applied. The dog and the garden only filter venues:
   * they stay in the conversation for the next café, but a vet search does
   * not show them.
   */
  filters(query: PlacesQuery): FilterChip[] {
    const copy = this.copy();
    const chips: FilterChip[] = [];
    if (query.nearMe) {
      const byDistance = this.#venues(query) || query.categories.includes('petshop');
      chips.push({ key: 'near', label: copy.filters.near(byDistance ? (query.radius ?? NEAR_RADIUS_M) : null) });
    }
    if (this.#venues(query) && query.dogSize) chips.push({ key: 'dog', label: copy.filters.dog[query.dogSize] });
    if (this.#venues(query) && query.garden) chips.push({ key: 'garden', label: copy.filters.garden });
    return chips;
  }

  hasFilters(query: PlacesQuery): boolean {
    return this.#venues(query) && (query.garden || query.dogSize !== null);
  }

  #venues(query: PlacesQuery): boolean {
    return !query.categories.length || query.categories.some(isSpotCategory);
  }

  resultsOf(message: ChatMessage): ResultsMessage | null {
    return message.role === 'assistant' && message.kind === 'results' ? message : null;
  }

  shownCount(message: ResultsMessage): number {
    return message.groups.reduce((sum, group) => sum + group.items.length, 0);
  }

  #lockScroll(lock: boolean): void {
    const body = this.#document.body;
    if (!body) return;
    body.style.overflow = lock ? 'hidden' : '';
  }
}
