import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
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
import { IonNote } from '@ionic/angular/ion-note';
import { IonRouterLink } from '@ionic/angular/ion-router-link';
import { IonSearchbar } from '@ionic/angular/ion-searchbar';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { IonThumbnail } from '@ionic/angular/ion-thumbnail';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import type { ViewWillEnter } from '@ionic/angular';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { callOutline, globeOutline, locationOutline, navigateOutline, shareSocialOutline } from 'ionicons/icons';
import { PetShopsStore } from '@gde/shared/data-access';
import {
  cleanApiText,
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
  injectActiveLang,
  LocalNamePipe,
  PackageWeightPipe,
  parseCoordinates,
  RsdPricePipe,
  venueLinkType,
} from '@gde/shared/util';
import { ExternalLinkService } from '../../core/platform/external-link.service';
import { ShareService } from '../../core/platform/share.service';
import { DeliveryLinksComponent } from '../../shared/ui/delivery-links.component';
import { MapViewComponent } from '../../shared/ui/map-view.component';

@Component({
  selector: 'app-pet-shop-detail',
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
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonThumbnail,
    IonSearchbar,
    IonSpinner,
    TranslocoPipe,
    LocalNamePipe,
    PackageWeightPipe,
    RsdPricePipe,
    DeliveryLinksComponent,
    MapViewComponent,
  ],
  templateUrl: './pet-shop-detail.page.html',
  styleUrl: './catalog-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetShopDetailPage implements ViewWillEnter {
  /** Route param `:slug`. */
  readonly slug = input.required<string>();

  readonly shops = inject(PetShopsStore);
  readonly lang = injectActiveLang();
  private readonly links = inject(ExternalLinkService);
  private readonly sharing = inject(ShareService);

  readonly assortmentQuery = signal('');

  /** See DogFoodDetailPage: only show the store's detail when it is this page's shop. */
  readonly shop = computed(() => {
    const detail = this.shops.detail();
    return detail && detail.slug === this.slug() ? detail : null;
  });
  readonly description = computed(() => cleanApiText(this.shop()?.description));
  readonly coords = computed(() => {
    const s = this.shop();
    return s ? parseCoordinates(s.latitude, s.longitude) : null;
  });
  readonly directionsUrl = computed(() => {
    const c = this.coords();
    return c ? googleMapsDirectionsUrl(c) : null;
  });
  readonly addressUrl = computed(() => {
    const s = this.shop();
    if (!s) return null;
    return this.directionsUrl() ?? googleMapsSearchUrl(`${s.name}, ${s.address}, ${s.cityName ?? ''}`);
  });
  readonly assortment = computed(() => {
    const offers = this.shop()?.offers ?? [];
    const q = this.assortmentQuery().trim().toLowerCase();
    if (!q) return offers;
    return offers.filter((o) => `${o.food.brandName} ${o.food.name}`.toLowerCase().includes(q));
  });

  constructor() {
    addIcons({ callOutline, globeOutline, locationOutline, navigateOutline, shareSocialOutline });
    effect(() => {
      const slug = this.slug();
      untracked(() => this.shops.loadDetail(slug));
    });
  }

  ionViewWillEnter(): void {
    if (this.shops.detail()?.slug !== this.slug() && !this.shops.isLoadingDetail()) this.reload();
  }

  reload(): void {
    this.shops.loadDetail(this.slug());
  }

  openWebsite(): void {
    const url = this.shop()?.websiteUrl;
    if (url) void this.links.openWeb(url, { type: venueLinkType(url), venue: this.shop()?.slug });
  }

  share(): void {
    const s = this.shop();
    if (s) void this.sharing.share(s.name, `/pet-shops/${s.slug}`, { type: 'pet_shop', id: s.slug });
  }
}
