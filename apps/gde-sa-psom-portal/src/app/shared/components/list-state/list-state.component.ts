import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoModule } from '@ngneat/transloco';

export type ListStatus = 'loading' | 'error' | 'empty';

/**
 * Loading skeleton, error and empty states for catalog lists.
 *
 * The parent decides which one applies and renders the real grid itself when
 * there is data, so this component never needs the data shape.
 */
@Component({
  selector: 'app-list-state',
  imports: [TranslocoModule],
  templateUrl: './list-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListStateComponent {
  readonly status = input.required<ListStatus>();
  /** Tailwind grid classes matching the real grid, so the skeleton does not jump. */
  readonly gridClass = input('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3');
  /** 'food' draws a square image block, 'shop' a text-only card. */
  readonly skeleton = input<'food' | 'shop'>('food');
  readonly skeletonCount = input(6);
  readonly emptyTitleKey = input('no_results_title');
  readonly emptyTextKey = input('no_results');
  /** Shows a "clear filters" button in the empty state. */
  readonly canClear = input(false);

  readonly retry = output<void>();
  readonly clear = output<void>();

  readonly placeholders = computed(() => Array.from({ length: this.skeletonCount() }, (_, i) => i));
}
