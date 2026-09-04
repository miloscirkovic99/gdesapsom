import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { RouteConstants } from '../../constants/route.constant';
import { PetShopListItem } from '../../data-access/catalog/catalog.models';
import { pluralKey } from '../../utils/plural';
import { DeliveryLinksComponent } from '../delivery-links/delivery-links.component';

/** Shop tile for the pet shop list. */
@Component({
  selector: 'app-pet-shop-card',
  imports: [RouterLink, TranslocoModule, DeliveryLinksComponent],
  templateUrl: './pet-shop-card.component.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetShopCardComponent {
  readonly shop = input.required<PetShopListItem>();
  readonly lang = input.required<string>();

  readonly link = computed(() => ['/' + RouteConstants.petShops, this.shop().slug]);

  /** "Vračar, Beograd" - collapses township and city when they share a name. */
  readonly location = computed(() => {
    const { townshipName, cityName } = this.shop();
    return [...new Set([townshipName, cityName].filter((v): v is string => !!v))].join(', ');
  });

  readonly itemCountKey = computed(() => pluralKey('item_count', this.shop().offerCount, this.lang()));

  readonly distanceKm = computed(() => {
    const metres = this.shop().distanceM;
    if (metres === null) return null;
    return new Intl.NumberFormat(this.lang().startsWith('en') ? 'en-US' : 'sr-Latn-RS', {
      maximumFractionDigits: 1,
    }).format(metres / 1000);
  });
}
