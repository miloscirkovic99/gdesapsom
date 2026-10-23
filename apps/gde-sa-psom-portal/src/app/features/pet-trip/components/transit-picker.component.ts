import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { COUNTRIES, countryName, type CountryCode } from '../domain/countries';
import { COPY, injectTripLang, ROUTE_SUGGESTIONS, routeLabel } from '../pet-trip-copy';

/**
 * The countries a car crosses, in driving order: chips for the chosen ones,
 * the usual routes as one-click picks, and a select for anything else. Used
 * by the trip step and by scenarios B and C.
 */
@Component({
  selector: 'app-pet-trip-transit',
  template: `
    <div class="pt-transit">
      @if (value().length) {
        <ol class="pt-chips">
          @for (code of value(); track code; let index = $index) {
            <li class="pt-chip">
              <span>{{ index + 1 }}. {{ nameOf(code) }}</span>
              <button type="button" class="pt-chip__remove" (click)="remove(code)" [attr.aria-label]="copy().trip.transitRemove(nameOf(code))">
                <span aria-hidden="true">×</span>
              </button>
            </li>
          }
        </ol>
      } @else {
        <p class="pt-hint">{{ copy().trip.transitNone }}</p>
      }

      @if (suggestions().length) {
        <p class="pt-suggest">
          <span>{{ copy().trip.transitSuggest }}:</span>
          @for (suggestion of suggestions(); track suggestion.label) {
            <button type="button" class="pt-link-btn" (click)="changed.emit(suggestion.transit.slice())">{{ suggestion.label }}</button>
          }
        </p>
      }

      <div class="pt-transit__add">
        <label class="sr-only" [for]="selectId()">{{ copy().trip.transitAdd }}</label>
        <select [id]="selectId()" class="select select-bordered select-sm" (change)="add($event)">
          <option value="">{{ copy().trip.transitAdd }}…</option>
          @for (option of available(); track option.code) {
            <option [value]="option.code">{{ option.name }}</option>
          }
        </select>
        @if (value().length) {
          <button type="button" class="pt-link-btn" (click)="changed.emit([])">{{ copy().trip.transitNone }}</button>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransitPickerComponent {
  readonly value = input.required<readonly CountryCode[]>();
  readonly destination = input.required<CountryCode>();
  /** Unique per use, for the select's label. */
  readonly selectId = input.required<string>();
  readonly changed = output<CountryCode[]>();

  readonly lang = injectTripLang();
  readonly copy = computed(() => COPY[this.lang()]);
  readonly suggestions = computed(() =>
    (ROUTE_SUGGESTIONS[this.destination()] ?? []).map((transit) => ({ transit, label: routeLabel(transit, this.lang()) })),
  );
  readonly available = computed(() =>
    COUNTRIES.filter((info) => info.code !== 'RS' && info.code !== this.destination() && !this.value().includes(info.code)).map(
      (info) => ({ code: info.code, name: info.name[this.lang()] }),
    ),
  );

  nameOf(code: CountryCode): string {
    return countryName(code, this.lang());
  }

  remove(code: CountryCode): void {
    this.changed.emit(this.value().filter((entry) => entry !== code));
  }

  add(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const code = select.value as CountryCode;
    select.value = '';
    if (code) this.changed.emit([...this.value(), code]);
  }
}
