import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { RouteConstants } from '../../constants/route.constant';
import { DogFoodListItem } from '../../data-access/catalog/catalog.models';
import { LocalNamePipe } from '../../pipes/local-name.pipe';
import { PackageWeightPipe } from '../../pipes/package-weight.pipe';
import { RsdPricePipe } from '../../pipes/rsd-price.pipe';
import { pluralKey } from '../../utils/plural';

/** Product tile for catalog grids and "related products" strips. */
@Component({
  selector: 'app-dog-food-card',
  imports: [RouterLink, TranslocoModule, LocalNamePipe, PackageWeightPipe, RsdPricePipe],
  templateUrl: './dog-food-card.component.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogFoodCardComponent {
  readonly item = input.required<DogFoodListItem>();
  readonly lang = input.required<string>();

  readonly link = computed(() => ['/' + RouteConstants.dogFood, this.item().slug]);

  readonly offerCountKey = computed(() =>
    pluralKey('offer_count', this.item().offerCount, this.lang()),
  );
}
