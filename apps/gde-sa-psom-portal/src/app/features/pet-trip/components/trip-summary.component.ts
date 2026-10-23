import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { countryName } from '../domain/countries';
import { costCategoryLabel, type CostCategory } from '../domain/costs';
import { formatDate, type IsoDate } from '../domain/dates';
import { formatRange, type MoneyRange } from '../domain/money';
import { COPY } from '../pet-trip-copy';
import { PetTripPlanner } from '../pet-trip.planner';

/**
 * The whole trip on one screen: readiness and costs side by side but kept
 * apart, the next dated steps, and the optional AI explanation, which is
 * labelled as such (also as `data-ai-generated` for machines) and never
 * replaces the computed results above it.
 */
@Component({
  selector: 'app-pet-trip-summary',
  templateUrl: './trip-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripSummaryComponent {
  readonly planner = inject(PetTripPlanner);
  readonly #document = inject(DOCUMENT);

  readonly lang = this.planner.lang;
  readonly copy = computed(() => COPY[this.lang()]);

  readonly trip = this.planner.trip;
  readonly report = this.planner.report;
  readonly base = computed(() => this.planner.breakdowns()[0]);
  readonly verdict = computed(() => this.copy().overall[this.report().overall]);
  readonly nextSteps = computed(() => this.report().timeline.slice(0, 6));

  /** "Srbija → Hrvatska, Split · Automobilom · 20. decembra 2026. – 27. decembra 2026. · 2 putnika, 1 pas" */
  readonly tripLine = computed(() => {
    const trip = this.trip();
    const lang = this.lang();
    const summary = this.copy().summary;
    const destination = countryName(trip.destination, lang);
    const place = trip.destinationCity ? `${destination}, ${trip.destinationCity}` : destination;
    const dates = trip.departureDate
      ? trip.returnDate
        ? `${this.dateOf(trip.departureDate)} – ${this.dateOf(trip.returnDate)}`
        : this.dateOf(trip.departureDate)
      : null;
    const people = `${summary.travelers(trip.travelers)}, ${summary.dogs(trip.dogs.length)}`;
    return [`${countryName('RS', lang)} → ${place}`, this.copy().transport[trip.transport], dates, people]
      .filter(Boolean)
      .join(' · ');
  });

  readonly categoryOf = (category: CostCategory): string => costCategoryLabel(category, this.lang());

  readonly itemTitles = computed(
    () => new Map(this.report().items.map((item) => [item.key, item.dogLabel ? `${item.title} (${item.dogLabel})` : item.title])),
  );

  readonly aiMessage = computed(() => {
    const { status, reason, limit } = this.planner.insights();
    if (status === 'idle' || status === 'loading') return '';
    if (status === 'quota' && reason) {
      return reason === 'device' ? this.copy().ai.quota.device(limit) : this.copy().ai.quota[reason];
    }
    return this.copy().ai.status[status];
  });

  /** "Preostalo AI objašnjenja na ovom uređaju: 3 od 5." once the server has said so. */
  readonly aiAllowance = computed(() => {
    const { remaining, limit } = this.planner.insights();
    return remaining !== null && limit !== null ? this.copy().ai.remaining(remaining, limit) : '';
  });

  dateOf(date: IsoDate): string {
    return formatDate(date, this.lang());
  }

  money(range: MoneyRange | null): string {
    return range ? formatRange(range, this.base().currency, this.lang()) : '—';
  }

  print(): void {
    this.#document.defaultView?.print();
  }
}
