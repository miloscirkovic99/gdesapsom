import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatDate } from '../domain/dates';
import { localize } from '../domain/lang';
import type { SourceRecord } from '../domain/rules/rule.models';
import { COPY, injectTripLang } from '../pet-trip-copy';

/** Official pages behind a rule or a price, each with the day it was checked. */
@Component({
  selector: 'app-pet-trip-sources',
  template: `
    <ul class="pt-sources">
      @for (source of shown(); track source.id) {
        <li>
          <a [href]="source.url" target="_blank" rel="noopener" class="pt-source__link">{{ source.title }}</a>
          <span class="pt-source__meta">{{ source.publisher }} · {{ source.checked }}</span>
        </li>
      }
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourceListComponent {
  readonly sources = input.required<readonly SourceRecord[]>();
  readonly lang = injectTripLang();

  readonly shown = computed(() => {
    const lang = this.lang();
    return this.sources().map((source) => ({
      id: source.id,
      url: source.url,
      title: localize(source.title, lang),
      publisher: localize(source.publisher, lang),
      checked: COPY[lang].sourceChecked(formatDate(source.checkedAt, lang)),
    }));
  });
}
