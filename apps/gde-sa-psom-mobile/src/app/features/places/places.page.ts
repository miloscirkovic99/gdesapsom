import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { IonBadge } from '@ionic/angular/ion-badge';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonInfiniteScroll } from '@ionic/angular/ion-infinite-scroll';
import { IonInfiniteScrollContent } from '@ionic/angular/ion-infinite-scroll-content';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonList } from '@ionic/angular/ion-list';
import { IonModal } from '@ionic/angular/ion-modal';
import { IonRefresher } from '@ionic/angular/ion-refresher';
import { IonRefresherContent } from '@ionic/angular/ion-refresher-content';
import { IonSearchbar } from '@ionic/angular/ion-searchbar';
import { IonSegment } from '@ionic/angular/ion-segment';
import { IonSegmentButton } from '@ionic/angular/ion-segment-button';
import { IonSelect } from '@ionic/angular/ion-select';
import { IonSelectOption } from '@ionic/angular/ion-select-option';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { IonThumbnail } from '@ionic/angular/ion-thumbnail';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToggle } from '@ionic/angular/ion-toggle';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { ModalController } from '@ionic/angular/modal-controller';
import type { InfiniteScrollCustomEvent, RefresherCustomEvent } from '@ionic/angular';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { optionsOutline } from 'ionicons/icons';
import { Park, ParksStore, SharedStore, SpotsStore, Township } from '@gde/shared/data-access';
import {
  descriptionToKeyMap,
  descriptionToKeyMapSpot,
  googleMapsSearchUrl,
  injectActiveLang,
} from '@gde/shared/util';
import { GeolocationService } from '../../core/platform/geolocation.service';
import { SpotCardComponent } from '../../shared/ui/spot-card.component';
import { TownshipPickerComponent } from '../../shared/ui/township-picker.component';
import { activeSpotFilterCount, NO_SPOT_FILTERS, SpotFilters, toSpotSearchParams } from './spot-filters';

type Segment = 'venues' | 'parks';

/** Something that finishes a pull-to-refresh or an infinite-scroll step. */
interface Completable {
  complete(): Promise<void> | void;
}

@Component({
  selector: 'app-places',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    IonSearchbar,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonList,
    IonItem,
    IonLabel,
    IonThumbnail,
    IonSpinner,
    IonModal,
    IonSelect,
    IonSelectOption,
    IonToggle,
    TranslocoPipe,
    SpotCardComponent,
  ],
  templateUrl: './places.page.html',
  styleUrl: './places.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacesPage {
  readonly spots = inject(SpotsStore);
  readonly parks = inject(ParksStore);
  readonly shared = inject(SharedStore);
  readonly lang = injectActiveLang();
  private readonly route = inject(ActivatedRoute);
  private readonly modals = inject(ModalController);
  private readonly geolocation = inject(GeolocationService);

  readonly radiusOptions = [1000, 2000, 3000, 5000, 10000];
  readonly petSizeKey = descriptionToKeyMap;
  readonly spotTypeKey = descriptionToKeyMapSpot;

  readonly segment = signal<Segment>('venues');
  /** Filters behind the list on screen. */
  readonly filters = signal<SpotFilters>(NO_SPOT_FILTERS);
  /** Filters being edited in the sheet; applied with "Show results". */
  readonly draft = signal<SpotFilters>(NO_SPOT_FILTERS);
  readonly sheetOpen = signal(false);
  readonly locating = signal(false);
  /** Venue type name from `?spotType=`, resolved once the types have loaded. */
  private readonly pendingSpotType = signal<string | null>(null);

  readonly activeFilterCount = computed(() => activeSpotFilterCount(this.filters()));

  readonly canLoadMore = computed(() => {
    const shown = this.spots.spotsList().length;
    return shown > 0 && shown < this.spots.totalResult();
  });

  readonly draftTownships = computed(() => {
    const ids = new Set(this.draft().townshipIds);
    return this.shared
      .townships()
      .filter((t) => ids.has(t.id))
      .map((t) => t.ime)
      .join(', ');
  });

  #pendingSpots: Completable | null = null;
  #pendingParks: Completable | null = null;

  constructor() {
    addIcons({ optionsOutline });

    // Finish pull-to-refresh / infinite scroll once the store is done.
    effect(() => {
      const busy = this.spots.isLoading();
      untracked(() => {
        if (!busy && this.#pendingSpots) {
          void this.#pendingSpots.complete();
          this.#pendingSpots = null;
        }
      });
    });
    effect(() => {
      const status = this.parks.parksStatus();
      untracked(() => {
        if (status !== 'loading' && this.#pendingParks) {
          void this.#pendingParks.complete();
          this.#pendingParks = null;
        }
      });
    });

    // Links from Home: ?segment=parks, ?word=..., ?spotType=Restoran
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => this.#applyQueryParams(params));

    effect(() => {
      const name = this.pendingSpotType();
      const types = this.shared.spotTypes();
      if (!name || !types.length) return;
      untracked(() => {
        const match = types.find((t) => t.ime === name);
        this.pendingSpotType.set(null);
        this.filters.update((f) => ({ ...f, spotTypeId: match?.id ?? 0 }));
        this.search();
      });
    });
  }

  setSegment(value: unknown): void {
    if (value !== 'venues' && value !== 'parks') return;
    this.segment.set(value);
    if (value === 'parks' && this.parks.parksStatus() === 'error') this.parks.petParks();
  }

  setWord(value: string | null | undefined): void {
    const word = (value ?? '').trim() || null;
    if (word === this.filters().word) return;
    this.filters.update((f) => ({ ...f, word }));
    this.search();
  }

  /** `reset` starts a new list; otherwise the next page is appended. */
  search(reset = true): void {
    this.spots.loadSpots({ data: toSpotSearchParams(this.filters(), reset) });
  }

  loadMore(event: InfiniteScrollCustomEvent): void {
    this.#pendingSpots = event.target;
    this.search(false);
  }

  refresh(event: RefresherCustomEvent): void {
    if (this.segment() === 'parks') {
      this.#pendingParks = event.target;
      this.parks.petParks();
    } else {
      this.#pendingSpots = event.target;
      this.search();
    }
  }

  // ── Filter sheet ────────────────────────────────────────────────────────
  openFilters(): void {
    this.draft.set(this.filters());
    this.sheetOpen.set(true);
  }

  patchDraft(patch: Partial<SpotFilters>): void {
    this.draft.update((d) => ({ ...d, ...patch }));
  }

  async pickTownships(): Promise<void> {
    const modal = await this.modals.create({
      component: TownshipPickerComponent,
      componentProps: {
        townships: this.shared.townships() as Township[],
        selected: this.draft().townshipIds,
        multiple: true,
        title: 'township',
      },
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<number[]>();
    if (role === 'confirm' && data) this.patchDraft({ townshipIds: data });
  }

  async toggleNearMe(on: boolean, toggle: EventTarget | null): Promise<void> {
    if (!on) {
      this.patchDraft({ near: null });
      return;
    }
    this.locating.set(true);
    const near = await this.geolocation.current();
    this.locating.set(false);
    if (near) {
      this.patchDraft({ near });
    } else if (toggle) {
      // No position: put the switch back.
      (toggle as HTMLIonToggleElement).checked = false;
    }
  }

  applyFilters(): void {
    this.filters.set(this.draft());
    this.sheetOpen.set(false);
    this.search();
  }

  clearFilters(): void {
    const cleared = { ...NO_SPOT_FILTERS, word: this.filters().word };
    this.draft.set(cleared);
    this.filters.set(cleared);
    this.sheetOpen.set(false);
    this.search();
  }

  parkMapUrl(park: Park): string {
    return googleMapsSearchUrl([park.par_ime, park.par_lokacija, park.grd_ime].filter(Boolean).join(', '));
  }

  #applyQueryParams(params: ParamMap): void {
    const segment = params.get('segment');
    if (segment === 'venues' || segment === 'parks') this.segment.set(segment);

    const word = params.get('word');
    const spotType = params.get('spotType');
    if (word === null && spotType === null) return;

    this.filters.set({ ...NO_SPOT_FILTERS, word: word?.trim() || null });
    if (spotType) {
      this.pendingSpotType.set(spotType);
    } else {
      this.search();
    }
  }
}

