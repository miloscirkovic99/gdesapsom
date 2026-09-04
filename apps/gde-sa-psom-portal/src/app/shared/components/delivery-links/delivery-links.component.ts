import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoModule } from '@ngneat/transloco';

/**
 * Wolt / Glovo buttons for a shop or a single offer. Renders nothing when
 * neither link exists, so callers can drop it in unconditionally.
 */
@Component({
  selector: 'app-delivery-links',
  imports: [TranslocoModule],
  template: `
    @if (woltUrl(); as wolt) {
      <a
        [href]="wolt"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-outline gap-1.5"
        [class.btn-xs]="size() === 'xs'"
        [class.btn-sm]="size() === 'sm'"
        [attr.aria-label]="'order_on' | transloco: { service: 'Wolt' }"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
        Wolt
      </a>
    }
    @if (glovoUrl(); as glovo) {
      <a
        [href]="glovo"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-outline gap-1.5"
        [class.btn-xs]="size() === 'xs'"
        [class.btn-sm]="size() === 'sm'"
        [attr.aria-label]="'order_on' | transloco: { service: 'Glovo' }"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
        Glovo
      </a>
    }
  `,
  host: { class: 'inline-flex flex-wrap items-center gap-1.5' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryLinksComponent {
  readonly woltUrl = input<string | null>(null);
  readonly glovoUrl = input<string | null>(null);
  readonly size = input<'xs' | 'sm'>('sm');
}
