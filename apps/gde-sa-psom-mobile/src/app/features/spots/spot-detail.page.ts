import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { IonBackButton } from '@ionic/angular/ion-back-button';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonList } from '@ionic/angular/ion-list';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { callOutline, globeOutline, leafOutline, locationOutline, navigateOutline, paw, shareSocialOutline } from 'ionicons/icons';
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
import { MapViewComponent } from '../../shared/ui/map-view.component';

type LoadStatus = 'loading' | 'loaded' | 'error';

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
    IonSpinner,
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

  readonly spot = signal<Spot | null>(null);
  readonly status = signal<LoadStatus>('loading');

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
  readonly addressUrl = computed(() => {
    const s = this.spot();
    if (!s) return null;
    const c = this.coords();
    return c ? googleMapsDirectionsUrl(c) : googleMapsSearchUrl(`${s.iuo_ime}, ${s.iuo_adressa}, ${s.grd_ime}`);
  });

  constructor() {
    addIcons({ callOutline, globeOutline, leafOutline, locationOutline, navigateOutline, paw, shareSocialOutline });
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

  openWebsite(): void {
    const url = this.spot()?.iuo_link_web;
    if (url) void this.links.openWeb(url, { type: venueLinkType(url), venue: this.venueSlug() });
  }
}
