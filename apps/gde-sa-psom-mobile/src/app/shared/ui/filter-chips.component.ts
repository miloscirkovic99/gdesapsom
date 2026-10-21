import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/ion-icon';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';

/** One active filter, already translated for display. */
export interface FilterChip {
  /** Passed back by `remove`; the page decides what it stands for (e.g. 'type:3'). */
  id: string;
  label: string;
}

/**
 * The filters in force, under a search row: tap one to drop it, or clear them all.
 * Renders nothing while no filter is on.
 */
@Component({
  selector: 'app-filter-chips',
  imports: [IonIcon, TranslocoPipe],
  template: `
    @if (chips().length) {
      <div class="chips">
        @for (chip of chips(); track chip.id) {
          <button
            type="button"
            class="chip"
            [attr.aria-label]="'mobile_remove_filter' | transloco: { name: chip.label }"
            (click)="remove.emit(chip.id)"
          >
            <span>{{ chip.label }}</span>
            <ion-icon name="close" aria-hidden="true" />
          </button>
        }
        @if (chips().length > 1) {
          <button type="button" class="app-text-button" (click)="clear.emit()">
            {{ 'mobile_clear_all' | transloco }}
          </button>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    /* One line that scrolls sideways, flush with the screen edges. */
    .chips {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      padding: 0 var(--app-gutter) 12px;
      scrollbar-width: none;
    }
    .chips::-webkit-scrollbar {
      display: none;
    }
    .chip {
      display: inline-flex;
      flex: none;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 10px 0 12px;
      border: 0;
      border-radius: var(--app-radius-sm);
      background: var(--app-primary-soft);
      color: var(--app-on-primary-soft);
      font: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
    }
    .chip:active {
      filter: brightness(0.95);
    }
    .chip ion-icon {
      font-size: 16px;
    }
    .app-text-button {
      flex: none;
      min-height: 32px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterChipsComponent {
  readonly chips = input.required<FilterChip[]>();
  readonly remove = output<string>();
  readonly clear = output<void>();

  constructor() {
    addIcons({ close });
  }
}
