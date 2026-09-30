import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton } from '@ionic/angular/ion-back-button';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonList } from '@ionic/angular/ion-list';
import { IonRouterLink } from '@ionic/angular/ion-router-link';
import { IonSkeletonText } from '@ionic/angular/ion-skeleton-text';
import { IonThumbnail } from '@ionic/angular/ion-thumbnail';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import type { ViewWillEnter } from '@ionic/angular';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { alertCircleOutline, checkmarkCircle, imageOutline, navigateOutline, shareSocialOutline } from 'ionicons/icons';
import { DogFoodOffer, DogFoodStore } from '@gde/shared/data-access';
import {
  cleanApiText,
  googleMapsDirectionsUrl,
  injectActiveLang,
  LocalNamePipe,
  PackageWeightPipe,
  parseCoordinates,
  RsdPricePipe,
} from '@gde/shared/util';
import { ShareService } from '../../core/platform/share.service';
import { revealTitleOnScroll } from '../../shared/title-reveal';
import { DeliveryLinksComponent } from '../../shared/ui/delivery-links.component';
import { bestOfferId } from './best-offer';

@Component({
  selector: 'app-dog-food-detail',
  imports: [
    RouterLink,
    IonRouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonLabel,
    IonList,
    IonItem,
    IonThumbnail,
    IonSkeletonText,
    TranslocoPipe,
    LocalNamePipe,
    PackageWeightPipe,
    RsdPricePipe,
    DeliveryLinksComponent,
  ],
  templateUrl: './dog-food-detail.page.html',
  styleUrl: './catalog-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogFoodDetailPage implements ViewWillEnter {
  /** Route param `:slug`. */
  readonly slug = input.required<string>();

  readonly food = inject(DogFoodStore);
  readonly lang = injectActiveLang();
  private readonly sharing = inject(ShareService);

  /**
   * The store holds one detail at a time. Pages further down the stack (a
   * related product) replace it, so this page only shows it when it is its own.
   */
  readonly product = computed(() => {
    const detail = this.food.detail();
    return detail && detail.slug === this.slug() ? detail : null;
  });
  readonly description = computed(() => cleanApiText(this.product()?.description));
  readonly ingredients = computed(() => cleanApiText(this.product()?.ingredients));
  readonly bestOfferId = computed(() => bestOfferId(this.product()?.offers ?? []));
  private readonly headline = viewChild<ElementRef<HTMLElement>>('headline');
  readonly title = revealTitleOnScroll(this.headline);

  constructor() {
    addIcons({ alertCircleOutline, checkmarkCircle, imageOutline, navigateOutline, shareSocialOutline });
    effect(() => {
      const slug = this.slug();
      untracked(() => this.food.loadDetail(slug));
    });
  }

  /** Coming back to this page after a related product replaced the store's detail. */
  ionViewWillEnter(): void {
    if (this.food.detail()?.slug !== this.slug() && !this.food.isLoadingDetail()) this.reload();
  }

  reload(): void {
    this.food.loadDetail(this.slug());
  }

  locationOf(offer: DogFoodOffer): string {
    return [offer.shop.address, offer.shop.townshipName ?? offer.shop.cityName].filter(Boolean).join(', ');
  }

  directionsUrl(offer: DogFoodOffer): string | null {
    const c = parseCoordinates(offer.shop.latitude, offer.shop.longitude);
    return c ? googleMapsDirectionsUrl(c) : null;
  }

  share(): void {
    const p = this.product();
    if (p) void this.sharing.share(`${p.brand.name} ${p.name}`, `/dog-food/${p.slug}`, { type: 'dog_food', id: p.slug });
  }
}
