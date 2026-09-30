import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { bicycleOutline } from 'ionicons/icons';

/**
 * Wolt / Glovo buttons. Renders nothing when neither link exists. The links
 * leave the app, so Android opens the delivery app when it is installed.
 * (Ionic moves `aria-label` from ion-button onto its inner native button.)
 * Taps are reported as `affiliate_booking` outbound clicks, with the shop
 * slug as `venue_slug` when the caller passes it.
 */
@Component({
  selector: 'app-delivery-links',
  imports: [IonButton, IonIcon, TranslocoPipe],
  template: `
    @if (woltUrl(); as wolt) {
      <ion-button
        size="small"
        fill="outline"
        [href]="wolt"
        target="_blank"
        rel="noopener sponsored"
        data-link-type="affiliate_booking"
        [attr.data-venue-slug]="venueSlug()"
        [attr.aria-label]="'order_on' | transloco: { service: 'Wolt' }"
      >
        <ion-icon slot="start" name="bicycle-outline" aria-hidden="true" />
        Wolt
      </ion-button>
    }
    @if (glovoUrl(); as glovo) {
      <ion-button
        size="small"
        fill="outline"
        [href]="glovo"
        target="_blank"
        rel="noopener sponsored"
        data-link-type="affiliate_booking"
        [attr.data-venue-slug]="venueSlug()"
        [attr.aria-label]="'order_on' | transloco: { service: 'Glovo' }"
      >
        <ion-icon slot="start" name="bicycle-outline" aria-hidden="true" />
        Glovo
      </ion-button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    ion-button {
      margin: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryLinksComponent {
  readonly woltUrl = input<string | null>(null);
  readonly glovoUrl = input<string | null>(null);
  readonly venueSlug = input<string | null>(null);

  constructor() {
    addIcons({ bicycleOutline });
  }
}
