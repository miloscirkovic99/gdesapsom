import { DOCUMENT } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SITE_ORIGIN } from '../../core/services/seo.service';
import { formatFee } from '../winter/winter-copy';
import { PlannerAnalytics } from './planner-analytics';
import { PlannerApiService, PlannerFailure } from './planner-api.service';
import { FAILURE_MESSAGES, RULES_BADGE } from './planner-copy';
import { PLAN_PATH, PLANNER_PATH } from './planner-pages';
import { PlannerStorage } from './planner-storage';
import { CATEGORY_LABELS, fillDogName, walkingRouteUrl } from './planner-text';
import { isWinterPlan, PlannerPlace, PlannerResult, PlanStop, SwapTarget } from './planner.models';

/** One stop as the template shows it: the plan's words with the name filled in, and its place. */
interface StopView {
  key: string;
  target: SwapTarget;
  time: string;
  place: PlannerPlace;
  why: string;
  tip: string;
}

interface DayView {
  title: string | null;
  stops: StopView[];
  routeUrl: string | null;
}

interface StayView {
  key: string;
  target: SwapTarget;
  place: PlannerPlace;
  why: string;
}

/**
 * /plan/:id: a saved plan, opened from the form (which hands the result over
 * in the navigation state) or from a shared link (which loads it). Client
 * rendered and noindex. "Zameni" saves a new plan and moves to its link.
 */
@Component({
  selector: 'app-plan-page',
  imports: [RouterLink],
  templateUrl: './plan-page.component.html',
  styleUrl: './planner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanPageComponent {
  readonly #api = inject(PlannerApiService);
  readonly #storage = inject(PlannerStorage);
  readonly #analytics = inject(PlannerAnalytics);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);

  readonly plannerPath = PLANNER_PATH;
  readonly rulesBadge = RULES_BADGE;
  readonly categoryLabels = CATEGORY_LABELS;
  readonly formatFee = formatFee;

  readonly result = signal<PlannerResult | null>(null);
  readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  readonly error = signal<string | null>(null);
  readonly dogName = signal('');

  readonly swapping = signal<string | null>(null);
  readonly swapError = signal<string | null>(null);
  /** Places swapped away per entry, so the next "Zameni" moves on. */
  readonly #swappedAway = new Map<string, number[]>();

  readonly rating = signal<1 | -1 | null>(null);
  readonly reportFor = signal<number | null>(null);
  readonly reportText = signal('');
  readonly reported = signal<ReadonlySet<number>>(new Set());
  readonly shareNote = signal<string | null>(null);

  readonly title = computed(() => {
    const result = this.result();
    return result ? this.#fill(result.plan.naslov) : '';
  });

  readonly notes = computed(() => (this.result()?.plan.napomene ?? []).map((note) => this.#fill(note)));

  readonly days = computed<DayView[]>(() => {
    const result = this.result();
    if (!result) return [];
    const plan = result.plan;
    if (!isWinterPlan(plan)) {
      const stops = this.#stops(result, plan.stanice, (index) => ({ section: 'stanice', index }));
      return [{ title: null, stops, routeUrl: walkingRouteUrl(stops.map((stop) => stop.place)) }];
    }
    return plan.dani.map((day) => {
      const stops = this.#stops(result, day.stanice, (index) => ({ section: 'stanice', day: day.dan, index }));
      return { title: `Dan ${day.dan}`, stops, routeUrl: walkingRouteUrl(stops.map((stop) => stop.place)) };
    });
  });

  readonly stays = computed<StayView[]>(() => {
    const result = this.result();
    if (!result || !isWinterPlan(result.plan)) return [];
    return result.plan.smestaj.flatMap((stay, index) => {
      const place = result.places[String(stay.lokacija_id)];
      return place ? [{ key: `smestaj-${index}`, target: { section: 'smestaj' as const, index }, place, why: this.#fill(stay.zasto) }] : [];
    });
  });

  readonly vet = computed<PlannerPlace | null>(() => {
    const result = this.result();
    if (!result || !isWinterPlan(result.plan) || result.plan.veterinar_id === null) return null;
    return result.places[String(result.plan.veterinar_id)] ?? null;
  });

  constructor() {
    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => this.#open(params.get('id') ?? ''));
    afterNextRender(() => this.dogName.set(this.#storage.dogName()));
  }

  swap(view: { key: string; target: SwapTarget; place: PlannerPlace }): void {
    const result = this.result();
    if (!result || this.swapping()) return;
    const exclude = this.#swappedAway.get(view.key) ?? [];

    this.swapping.set(view.key);
    this.swapError.set(null);
    this.#api.swap(result.plan_id, { ...view.target, exclude }).subscribe({
      next: (next) => {
        this.#swappedAway.set(view.key, [...exclude, view.place.id]);
        this.#analytics.swap(result.mode, view.place.kategorija);
        this.swapping.set(null);
        void this.#router.navigate([PLAN_PATH, next.plan_id], { state: { result: next }, replaceUrl: true });
      },
      error: () => {
        this.swapping.set(null);
        this.swapError.set('Nemamo drugo mesto iste vrste u blizini.');
      },
    });
  }

  rate(value: 1 | -1): void {
    const result = this.result();
    if (!result || this.rating() !== null) return;
    this.rating.set(value);
    this.#api.feedback({ plan_id: result.plan_id, rating: value }).subscribe({ error: () => this.rating.set(null) });
  }

  openReport(placeId: number): void {
    this.reportFor.set(this.reportFor() === placeId ? null : placeId);
    this.reportText.set('');
  }

  sendReport(placeId: number): void {
    const result = this.result();
    const comment = this.reportText().trim().slice(0, 500);
    if (!result || !comment) return;
    this.#api.feedback({ plan_id: result.plan_id, venue_id: placeId, comment }).subscribe({
      next: () => {
        this.reported.set(new Set([...this.reported(), placeId]));
        this.reportFor.set(null);
      },
    });
  }

  async share(): Promise<void> {
    const result = this.result();
    if (!result) return;
    const url = `${SITE_ORIGIN}${PLAN_PATH}/${encodeURIComponent(result.plan_id)}`;
    const navigator = this.#document.defaultView?.navigator;

    if (navigator?.share) {
      try {
        await navigator.share({ title: this.title(), url });
        this.#analytics.share('native');
      } catch {
        // The visitor closed the share sheet.
      }
      return;
    }
    try {
      await navigator?.clipboard.writeText(url);
      this.shareNote.set('Link je kopiran.');
      this.#analytics.share('copy_link');
    } catch {
      this.shareNote.set(url);
    }
  }

  venueClicked(place: PlannerPlace): void {
    this.#analytics.venueClick(place.id, place.kategorija);
  }

  bookingClicked(place: PlannerPlace): void {
    this.#analytics.bookingClick(place.id);
  }

  #open(planId: string): void {
    // From the form or a swap, in the navigation state; after a reload it is still in history.state.
    const handedOver = (this.#router.currentNavigation()?.extras.state?.['result'] ??
      this.#document.defaultView?.history.state?.['result']) as PlannerResult | undefined;
    if (handedOver && String(handedOver.plan_id) === planId) {
      this.result.set(handedOver);
      this.status.set('ready');
      return;
    }

    this.status.set('loading');
    this.#api.get(planId).subscribe({
      next: (result) => {
        this.result.set(result);
        this.status.set('ready');
      },
      error: (failure: PlannerFailure) => {
        this.status.set('error');
        this.error.set(failure.kind === 'not_found' ? FAILURE_MESSAGES.not_found : FAILURE_MESSAGES.unavailable);
      },
    });
  }

  #stops(result: PlannerResult, stops: PlanStop[], target: (index: number) => SwapTarget): StopView[] {
    return stops.flatMap((stop, index) => {
      const place = result.places[String(stop.lokacija_id)];
      if (!place) return [];
      const swapTarget = target(index);
      return [
        {
          key: `${swapTarget.day ?? 0}-${index}`,
          target: swapTarget,
          time: stop.vreme,
          place,
          why: this.#fill(stop.zasto),
          tip: this.#fill(stop.savet_za_psa),
        },
      ];
    });
  }

  #fill(text: string): string {
    return fillDogName(text, this.dogName());
  }
}
