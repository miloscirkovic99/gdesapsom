import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { countryName } from '../domain/countries';
import { formatDate, type IsoDate } from '../domain/dates';
import { ITEM_STATUSES, type ReadinessItem, type ReadinessReport } from '../domain/readiness';
import { COPY, injectTripLang } from '../pet-trip-copy';
import { SourceListComponent } from './source-list.component';

/**
 * The readiness report: overall verdict, the dated actions in order, then every
 * rule grouped by status, each with what it says, its sources and when it
 * was checked. Colours only repeat what the status text says.
 */
@Component({
  selector: 'app-pet-trip-readiness',
  imports: [SourceListComponent],
  templateUrl: './readiness-report.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadinessReportComponent {
  readonly report = input.required<ReadinessReport>();

  readonly lang = injectTripLang();
  readonly copy = computed(() => COPY[this.lang()]);

  readonly verdict = computed(() => this.copy().overall[this.report().overall]);
  readonly destination = computed(() => countryName(this.report().destination, this.lang()));
  readonly groups = computed(() =>
    ITEM_STATUSES.map((status) => ({
      status,
      label: this.copy().status[status],
      items: this.report().items.filter((item) => item.status === status),
    })).filter((group) => group.items.length),
  );

  dateOf(date: IsoDate): string {
    return formatDate(date, this.lang());
  }

  itemTitle(item: ReadinessItem): string {
    return item.dogLabel ? `${item.title} (${item.dogLabel})` : item.title;
  }
}
