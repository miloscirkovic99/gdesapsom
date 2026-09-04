import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { RouteConstants } from '../../constants/route.constant';
import { DogFoodOffer } from '../../data-access/catalog/catalog.models';
import { RsdPricePipe } from '../../pipes/rsd-price.pipe';
import { DeliveryLinksComponent } from '../delivery-links/delivery-links.component';

/**
 * "Where to buy" ladder on the product page: every shop that lists the
 * product, in stock first and cheapest first, with the best in-stock price
 * called out. This is the Food -> Offer -> Shop relationship made visible.
 */
@Component({
  selector: 'app-offer-list',
  imports: [RouterLink, TranslocoModule, RsdPricePipe, DeliveryLinksComponent],
  templateUrl: './offer-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfferListComponent {
  readonly offers = input.required<DogFoodOffer[]>();
  readonly lang = input.required<string>();

  readonly shopsRoute = '/' + RouteConstants.petShops;

  readonly bestOfferId = computed(() => {
    let best: DogFoodOffer | null = null;
    for (const offer of this.offers()) {
      if (!offer.isInStock || offer.price === null) continue;
      if (!best || offer.price < (best.price as number)) best = offer;
    }
    return best?.id ?? null;
  });

  /** Only worth highlighting when there is something to compare against. */
  readonly showBest = computed(
    () => this.offers().filter((o) => o.isInStock && o.price !== null).length > 1,
  );

  locationOf(offer: DogFoodOffer): string {
    return [offer.shop.address, offer.shop.townshipName].filter(Boolean).join(', ');
  }

  directionsUrl(offer: DogFoodOffer): string | null {
    const { latitude, longitude } = offer.shop;
    if (latitude === null || longitude === null) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }
}
