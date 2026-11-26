import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';
import { CostPlannerComponent } from './components/cost-planner.component';
import { DogsStepComponent } from './components/dogs-step.component';
import { ReadinessReportComponent } from './components/readiness-report.component';
import { TripStepComponent } from './components/trip-step.component';
import { TripSummaryComponent } from './components/trip-summary.component';
import { countryName } from './domain/countries';
import { formatDate } from './domain/dates';
import { RULESET } from './domain/rules/ruleset';
import { COPY } from './pet-trip-copy';
import { PetTripPlanner, type PlannerView, type ResultsTab } from './pet-trip.planner';

const TABS: readonly ResultsTab[] = ['readiness', 'costs', 'summary'];
const STEPS: readonly PlannerView[] = ['trip', 'dogs', 'results'];
const RULES_CHECKED_AT = RULESET.rules.reduce(
  (latest, rule) => (rule.verifiedAt && rule.verifiedAt > latest ? rule.verifiedAt : latest),
  '',
);

/**
 * /putovanje-sa-psom: the readiness check and the cost planner on one page,
 * fed by one trip, in the site's language (Serbian or English). Prerendered
 * in Serbian with the introduction and the empty first step; the visitor's
 * saved draft comes back after hydration.
 *
 * The page's styles are global (ViewEncapsulation.None, every selector under
 * `.pt`) so the step and result components share them instead of each
 * carrying a copy.
 */
@Component({
  selector: 'app-pet-trip-page',
  imports: [
    BreadcrumbComponent,
    TripStepComponent,
    DogsStepComponent,
    ReadinessReportComponent,
    CostPlannerComponent,
    TripSummaryComponent,
  ],
  templateUrl: './pet-trip-page.component.html',
  styleUrl: './pet-trip-page.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PetTripPlanner],
})
export class PetTripPageComponent {
  readonly planner = inject(PetTripPlanner);
  readonly #document = inject(DOCUMENT);

  readonly lang = this.planner.lang;
  readonly copy = computed(() => COPY[this.lang()]);
  readonly tabs = TABS;
  readonly steps = STEPS;
  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => [{ label: this.copy().breadcrumb }]);
  readonly rulesCheckedAt = computed(() => this.copy().rulesCheckedAt(formatDate(RULES_CHECKED_AT, this.lang())));

  readonly tripLine = computed(() => {
    const trip = this.planner.trip();
    const dates = trip.departureDate ? ` · ${formatDate(trip.departureDate, this.lang())}` : '';
    return `${countryName(trip.destination, this.lang())} · ${this.copy().transport[trip.transport]}${dates}`;
  });

  readonly tabCounts = computed(() => {
    const report = this.planner.report();
    return {
      readiness: report.counts['action-required'] + report.counts['insufficient-info'],
      costs: this.planner.breakdowns()[0].unknown.length,
      summary: 0,
    } satisfies Record<ResultsTab, number>;
  });

  constructor() {
    afterNextRender(() => this.planner.restore());
  }

  stepIndex(step: PlannerView): number {
    return STEPS.indexOf(step);
  }

  go(view: PlannerView): void {
    if (this.planner.goTo(view)) {
      this.#focus('pt-main');
      return;
    }
    // Back on a step with errors: land on the first field to fix.
    setTimeout(() => {
      const invalid = this.#document.querySelector<HTMLElement>('.pt [aria-invalid="true"], .pt .ng-invalid input');
      (invalid ?? this.#document.getElementById('pt-main'))?.focus();
    });
  }

  selectTab(tab: ResultsTab): void {
    this.planner.tab.set(tab);
  }

  /** Arrow keys, Home and End move between tabs, as in the WAI-ARIA tabs pattern. */
  onTabKey(event: KeyboardEvent): void {
    const index = TABS.indexOf(this.planner.tab());
    const next =
      event.key === 'ArrowRight' ? (index + 1) % TABS.length
      : event.key === 'ArrowLeft' ? (index - 1 + TABS.length) % TABS.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? TABS.length - 1
      : null;
    if (next === null) return;
    event.preventDefault();
    this.planner.tab.set(TABS[next]);
    this.#focus(`pt-tab-${TABS[next]}`);
  }

  reset(): void {
    if (this.#document.defaultView?.confirm(this.copy().resetConfirm)) {
      this.planner.reset();
      this.#focus('pt-main');
    }
  }

  /** Moves focus after the view changes, so keyboard and screen reader users land on the new content. */
  #focus(id: string): void {
    setTimeout(() => this.#document.getElementById(id)?.focus());
  }
}
