import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';
import { faqPageStructuredData } from '../../shared/utils/structured-data';
import { PET_FRIENDLY_CITIES } from '../pet-friendly/pet-friendly-pages';
import { WINTER_DESTINATIONS, WINTER_HUB_PATH } from '../winter/winter-pages';
import { PlannerAnalytics } from './planner-analytics';
import { PlannerApiService, PlannerFailure } from './planner-api.service';
import { TURNSTILE_SITE_KEY } from './planner-config';
import { FAILURE_MESSAGES, limitMessage, LOADING_TEXT, PLANNER_FAQ, PLANNER_INTRO, READY_PLANS } from './planner-copy';
import { findPlannerPage, PLAN_PATH, PLANNER_PAGE_DATA, PlannerPageInfo } from './planner-pages';
import { PlannerStorage } from './planner-storage';
import { addDays, belgradeToday, remainingLine } from './planner-text';
import type { DanParams, PlannerLimit, PlannerMode, PlannerParams, ZimovanjeParams } from './planner.models';
import { TurnstileService } from './turnstile.service';

const FAQ_ID = 'planner-faq';
/** How far ahead a day can be planned: the forecast reaches about 9 days. */
const MAX_DAYS_AHEAD = 9;

/**
 * /planer and /planer/<city>: the planner form. Two tabs ("Dan u gradu",
 * "Zimovanje"), the dog's name kept in this browser only, Turnstile, and the
 * weekly quota under the button. A made plan opens on /plan/:id.
 */
@Component({
  selector: 'app-planner-page',
  imports: [ReactiveFormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './planner-page.component.html',
  styleUrl: './planner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerPageComponent {
  readonly #api = inject(PlannerApiService);
  readonly #storage = inject(PlannerStorage);
  readonly #turnstile = inject(TurnstileService);
  readonly #analytics = inject(PlannerAnalytics);
  readonly #router = inject(Router);
  readonly #seo = inject(SeoService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(NonNullableFormBuilder);

  readonly page: PlannerPageInfo = findPlannerPage(inject(ActivatedRoute).snapshot.data[PLANNER_PAGE_DATA]) as PlannerPageInfo;
  readonly city = PET_FRIENDLY_CITIES.find((item) => item.slug === this.page.citySlug) ?? null;
  readonly h1 = this.city ? `Planer sa psom za ${this.city.name.nameSr}` : 'Planer sa psom';
  readonly intro = PLANNER_INTRO;
  readonly faq = PLANNER_FAQ;
  readonly loadingText = LOADING_TEXT;
  readonly cities = PET_FRIENDLY_CITIES;
  readonly destinations = WINTER_DESTINATIONS;
  readonly nights = [1, 2, 3, 4, 5, 6, 7];
  readonly readyPlans = READY_PLANS;
  readonly hubPath = WINTER_HUB_PATH;
  readonly planPath = PLAN_PATH;
  readonly breadcrumbs: BreadcrumbItem[] = this.city
    ? [{ label: 'Planer sa psom', link: '/planer' }, { label: this.city.name.nameSr }]
    : [{ label: 'Planer sa psom' }];

  readonly tab = signal<PlannerMode>('dan');
  readonly dogName = new FormControl('', { nonNullable: true });
  readonly danForm = this.#fb.group({
    grad: [this.page.citySlug ?? PET_FRIENDLY_CITIES[0].slug],
    datum: [''],
    velicina: ['srednji' as DanParams['velicina']],
    energija: ['srednja' as DanParams['energija']],
    osetljiv_na_vrucinu: [false],
    tip_dana: ['mesovit' as DanParams['tip_dana']],
  });
  readonly zimForm = this.#fb.group({
    destinacija: [WINTER_DESTINATIONS[0].slug],
    broj_noci: [3],
    velicina: ['srednji' as ZimovanjeParams['velicina']],
    dlaka: ['srednja' as ZimovanjeParams['dlaka']],
    neko_skija: [false],
    pas_sme_sam: [false],
  });

  /** Set in the browser: the prerendered HTML must not carry the build date. */
  readonly minDate = signal('');
  readonly maxDate = signal('');

  readonly status = signal<'idle' | 'loading'>('idle');
  readonly error = signal<string | null>(null);
  readonly limit = signal<PlannerLimit | null>(null);
  readonly limitText = computed(() => {
    const limit = this.limit();
    return limit ? limitMessage(limit.reason, limit.next_at) : null;
  });

  readonly #remaining = signal<number | null>(null);
  readonly quotaLine = computed(() => {
    const remaining = this.#remaining();
    return remaining === null ? null : remainingLine(remaining);
  });

  readonly siteKey = TURNSTILE_SITE_KEY;
  readonly #token = signal<string | null>(null);
  readonly captchaReady = computed(() => this.#token() !== null);
  readonly turnstileHost = viewChild<ElementRef<HTMLElement>>('turnstile');
  #widgetId: string | null = null;
  readonly #started = new Set<PlannerMode>();

  constructor() {
    const faq = faqPageStructuredData(this.faq);
    if (faq) this.#seo.setStructuredData(FAQ_ID, faq);
    this.#destroyRef.onDestroy(() => {
      this.#seo.clearStructuredData(FAQ_ID);
      if (this.#widgetId) this.#turnstile.remove(this.#widgetId);
    });

    afterNextRender(() => {
      const today = belgradeToday();
      this.minDate.set(today);
      this.maxDate.set(addDays(today, MAX_DAYS_AHEAD));
      if (!this.danForm.controls.datum.value) this.danForm.controls.datum.setValue(today);
      this.dogName.setValue(this.#storage.dogName());
      // The stored count shows at once; the server's count, which other tabs
      // and devices on this cookie also spend, replaces it when it arrives.
      this.#remaining.set(this.#storage.remaining().remaining);
      this.#api.quota().subscribe({
        next: (quota) => {
          this.#remaining.set(quota.remaining);
          this.#storage.saveQuota(quota.remaining, quota.next_at);
          // Nothing left: say so now rather than after a filled-in form.
          if (quota.remaining === 0 && quota.next_at) this.limit.set({ reason: 'device', next_at: quota.next_at });
        },
        error: () => undefined,
      });
      this.#renderTurnstile();
    });
  }

  selectTab(mode: PlannerMode): void {
    this.tab.set(mode);
    this.error.set(null);
  }

  /** Left / right arrows move between the two tabs, as the ARIA tabs pattern expects. */
  onTabKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next: PlannerMode = this.tab() === 'dan' ? 'zimovanje' : 'dan';
    this.selectTab(next);
    (event.currentTarget as HTMLElement).parentElement?.querySelector<HTMLElement>(`#planner-tab-${next}`)?.focus();
  }

  /** planner_start, once per tab, on the first interaction with its form. */
  onFormFocus(mode: PlannerMode): void {
    if (this.#started.has(mode)) return;
    this.#started.add(mode);
    this.#analytics.start(mode);
  }

  submit(): void {
    if (this.status() === 'loading') return;
    this.error.set(null);
    this.limit.set(null);

    const params = this.#params();
    if (!params) {
      this.error.set(FAILURE_MESSAGES.invalid);
      return;
    }
    const token = this.#token();
    if (!token) {
      this.error.set(FAILURE_MESSAGES.captcha);
      return;
    }

    // The name stays here; the request below carries only `params`.
    this.#storage.saveDogName(this.dogName.value);
    this.status.set('loading');

    this.#api.create(params, token).subscribe({
      next: (result) => {
        this.#storage.saveQuota(result.remaining ?? 0, result.next_at ?? null);
        this.#analytics.generate(result.mode, result.source);
        void this.#router.navigate([PLAN_PATH, result.plan_id], { state: { result } });
      },
      error: (failure: PlannerFailure) => {
        this.status.set('idle');
        this.#freshToken();
        if (failure.kind === 'limit') {
          this.limit.set(failure.limit);
          this.#analytics.limitHit(failure.limit.reason);
          if (failure.limit.reason === 'device') {
            this.#storage.saveQuota(0, failure.limit.next_at);
            this.#remaining.set(0);
          }
          return;
        }
        this.error.set(failure.kind === 'not_found' ? FAILURE_MESSAGES.unavailable : FAILURE_MESSAGES[failure.kind]);
      },
    });
  }

  #params(): PlannerParams | null {
    if (this.tab() === 'dan') {
      const value = this.danForm.getRawValue();
      if (!value.datum || (this.minDate() && (value.datum < this.minDate() || value.datum > this.maxDate()))) return null;
      return { mode: 'dan', ...value };
    }
    const value = this.zimForm.getRawValue();
    return { mode: 'zimovanje', ...value, broj_noci: Number(value.broj_noci) };
  }

  async #renderTurnstile(): Promise<void> {
    const host = this.turnstileHost()?.nativeElement;
    if (!host || !this.siteKey) return;
    try {
      this.#widgetId = await this.#turnstile.render(host, this.siteKey, (token) => this.#token.set(token));
    } catch {
      this.error.set(FAILURE_MESSAGES.unavailable);
    }
  }

  /** A Turnstile token is single-use: every answer from the API needs a new one. */
  #freshToken(): void {
    this.#token.set(null);
    if (this.#widgetId) this.#turnstile.reset(this.#widgetId);
  }
}
