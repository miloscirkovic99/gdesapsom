import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { IonBackButton } from '@ionic/angular/ion-back-button';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonList } from '@ionic/angular/ion-list';
import { IonSkeletonText } from '@ionic/angular/ion-skeleton-text';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  bedOutline,
  beerOutline,
  cafeOutline,
  callOutline,
  globeOutline,
  leafOutline,
  locationOutline,
  navigateOutline,
  paw,
  restaurantOutline,
  shareSocialOutline,
} from 'ionicons/icons';
import { Spot, SpotsStore } from '@gde/shared/data-access';
import {
  cleanApiText,
  descriptionToKeyMap,
  descriptionToKeyMapGarden,
  descriptionToKeyMapSpot,
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
  parseCoordinates,
  venueLinkType,
  wazeDirectionsUrl,
} from '@gde/shared/util';
import { ExternalLinkService } from '../../core/platform/external-link.service';
import { ShareService } from '../../core/platform/share.service';
import { RecentActivityService } from '../../core/recent/recent-activity.service';
import { revealTitleOnScroll } from '../../shared/title-reveal';
import { MapViewComponent } from '../../shared/ui/map-view.component';
import { categoryForSpotType } from '../places/place-groups';
import { freshLink, placesQueryParams } from '../places/place-links';

type LoadStatus = 'loading' | 'loaded' | 'error';

/** A link to the venue list, filtered to the venue's category and/or city. */
interface RelatedLink {
  icon: string;
  /** Translation key: the category, or "All places". */
  titleKey: string;
  /** The city as the API names it; null when `placeKey` says "All of Serbia". */
  place: string | null;
  placeKey: string | null;
  queryParams: Record<string, string>;
}

@Component({
  selector: 'app-spot-detail',
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonSkeletonText,
    IonLabel,
    IonList,
    IonItem,
    TranslocoPipe,
    MapViewComponent,
  ],
  templateUrl: './spot-detail.page.html',
  styleUrl: './spot-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpotDetailPage {
  /** Route param `:id` (withComponentInputBinding). */
  readonly id = input.required<string>();

  private readonly spots = inject(SpotsStore);
  private readonly links = inject(ExternalLinkService);
  private readonly sharing = inject(ShareService);
  private readonly recent = inject(RecentActivityService);
  private readonly router = inject(Router);

  readonly spot = signal<Spot | null>(null);
  readonly status = signal<LoadStatus>('loading');
  private readonly headline = viewChild<ElementRef<HTMLElement>>('headline');
  readonly title = revealTitleOnScroll(this.headline);

  readonly photos = computed(() => {
    const s = this.spot();
    return s ? [s.iuo_slika_base64, s.iuo_slika_base64_unutra].filter((p): p is string => !!p) : [];
  });
  readonly typeKey = computed(() => descriptionToKeyMapSpot[this.spot()?.ugo_ime ?? ''] ?? null);
  readonly dogsKey = computed(() => descriptionToKeyMap[this.spot()?.sta_ime ?? ''] ?? null);
  readonly gardenKey = computed(() => descriptionToKeyMapGarden[this.spot()?.bas_naziv ?? ''] ?? null);
  readonly description = computed(() => cleanApiText(this.spot()?.iuo_opis));
  /** Spots have no slug, so `spot-<id>` names the venue in GA4 (`venue_slug`), as on the website. */
  readonly venueSlug = computed(() => {
    const id = this.spot()?.iuo_id;
    return id ? `spot-${id}` : null;
  });
  readonly coords = computed(() => {
    const s = this.spot();
    return s ? parseCoordinates(s.latitude, s.longitude) : null;
  });
  readonly googleUrl = computed(() => {
    const c = this.coords();
    return c ? googleMapsDirectionsUrl(c) : null;
  });
  readonly wazeUrl = computed(() => {
    const c = this.coords();
    return c ? wazeDirectionsUrl(c) : null;
  });
  /**
   * "More places like this", as the website's relatedHubLinksForSpot: the
   * category in the city, the whole city, the category in all of Serbia.
   * Unlike the website, any city works: the app filters townships itself.
   */
  readonly related = computed<RelatedLink[]>(() => {
    const s = this.spot();
    if (!s) return [];
    const category = categoryForSpotType(s.ugo_ime);
    const city = s.grd_ime?.trim() || null;
    const links: RelatedLink[] = [];
    if (category && city) {
      links.push({
        icon: category.icon,
        titleKey: category.labelKey,
        place: city,
        placeKey: null,
        queryParams: placesQueryParams({ category: category.slug, city }),
      });
    }
    if (city) {
      links.push({
        icon: 'location-outline',
        titleKey: 'mobile_all_places',
        place: city,
        placeKey: null,
        queryParams: placesQueryParams({ city }),
      });
    }
    if (category) {
      links.push({
        icon: category.icon,
        titleKey: category.labelKey,
        place: null,
        placeKey: 'mobile_all_of_serbia',
        queryParams: placesQueryParams({ category: category.slug }),
      });
    }
    return links;
  });
  readonly addressUrl = computed(() => {
    const s = this.spot();
    if (!s) return null;
    const c = this.coords();
    return c ? googleMapsDirectionsUrl(c) : googleMapsSearchUrl(`${s.iuo_ime}, ${s.iuo_adressa}, ${s.grd_ime}`);
  });

  constructor() {
    addIcons({
      alertCircleOutline,
      bedOutline,
      beerOutline,
      cafeOutline,
      callOutline,
      globeOutline,
      leafOutline,
      locationOutline,
      navigateOutline,
      paw,
      restaurantOutline,
      shareSocialOutline,
    });
    effect(() => {
      const id = this.id();
      untracked(() => this.load(id));
    });
  }

  load(id: string): void {
    this.status.set('loading');
    this.spots.getSpotById(
      id,
      (spot) => {
        this.spot.set(spot);
        if (spot) void this.recent.addSpot(spot);
        this.status.set(spot ? 'loaded' : 'error');
      },
      () => this.status.set('error'),
    );
  }

  share(): void {
    const s = this.spot();
    if (s) void this.sharing.share(s.iuo_ime, `/spots/${s.iuo_id}`, { type: 'spot', id: `spot-${s.iuo_id}` });
  }

  openPlaces(link: RelatedLink): void {
    void this.router.navigate(['/tabs/places'], { queryParams: freshLink(link.queryParams) });
  }

  openWebsite(): void {
    const url = this.spot()?.iuo_link_web;
    if (url) void this.links.openWeb(url, { type: venueLinkType(url), venue: this.venueSlug() });
  }
}
