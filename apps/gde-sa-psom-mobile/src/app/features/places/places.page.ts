import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonFooter } from '@ionic/angular/ion-footer';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonInfiniteScroll } from '@ionic/angular/ion-infinite-scroll';
import { IonInfiniteScrollContent } from '@ionic/angular/ion-infinite-scroll-content';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonList } from '@ionic/angular/ion-list';
import { IonModal } from '@ionic/angular/ion-modal';
import { IonRefresher } from '@ionic/angular/ion-refresher';
import { IonRouterLink } from '@ionic/angular/ion-router-link';
import { IonRefresherContent } from '@ionic/angular/ion-refresher-content';
import { IonSearchbar } from '@ionic/angular/ion-searchbar';
import { IonSegment } from '@ionic/angular/ion-segment';
import { IonSegmentButton } from '@ionic/angular/ion-segment-button';
import { IonSelect } from '@ionic/angular/ion-select';
import { IonSelectOption } from '@ionic/angular/ion-select-option';
import { IonSkeletonText } from '@ionic/angular/ion-skeleton-text';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { IonThumbnail } from '@ionic/angular/ion-thumbnail';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToggle } from '@ionic/angular/ion-toggle';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { ModalController } from '@ionic/angular/modal-controller';
import type { InfiniteScrollCustomEvent, RefresherCustomEvent } from '@ionic/angular';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { add, alertCircleOutline, leafOutline, openOutline, optionsOutline, searchOutline } from 'ionicons/icons';
import { Park, ParksStore, SharedStore, SpotsStore, Township } from '@gde/shared/data-access';
import {
  cleanApiText,
  descriptionToKeyMap,
  descriptionToKeyMapSpot,
  googleMapsSearchUrl,
  injectActiveLang,
} from '@gde/shared/util';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { GeolocationService } from '../../core/platform/geolocation.service';
import { formatDistance } from '../../shared/format-distance';
import { FilterChip, FilterChipsComponent } from '../../shared/ui/filter-chips.component';
import { SpotCardComponent } from '../../shared/ui/spot-card.component';
import { TownshipPickerComponent } from '../../shared/ui/township-picker.component';
import { linkKey, linkNeeds, PlacesLink, readPlacesLink, resolvePlacesLink } from './place-links';
import {
  activeSpotFilterCount,
  ChipSpec,
  NO_SPOT_FILTERS,
  orderSpotTypes,
  placeLabels,
  RADIUS_OPTIONS,
  SpotFilterLookups,
  SpotFilters,
  spotFilterChips,
  spotFilterKeys,
  spotTypeLabels,
  withoutChip,
} from './spot-filters';
import { SpotSearch } from './spot-search';

type Segment = 'venues' | 'parks';

/** Something that finishes a pull-to-refresh or an infinite-scroll step. */
interface Completable {
  complete(): Promise<void> | void;
}

/** The park rules the website lists (keys rule_1 … rule_13). */
const PARK_RULES = Array.from({ length: 13 }, (_, i) => `rule_${i + 1}`);

@Component({
  selector: 'app-places',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
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
    IonSkeletonText,
    IonModal,
    IonFooter,
    IonSelect,
    IonSelectOption,
    IonToggle,
    RouterLink,
    IonRouterLink,
    TranslocoPipe,
    SpotCardComponent,
    FilterChipsComponent,
  ],
  providers: [SpotSearch],
  templateUrl: './places.page.html',
  styleUrl: './places.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacesPage {
  readonly list = inject(SpotSearch);
  /** For the pet sizes (`allowed`). */
  readonly spots = inject(SpotsStore);
  readonly parks = inject(ParksStore);
  readonly shared = inject(SharedStore);
  readonly lang = injectActiveLang();
  private readonly route = inject(ActivatedRoute);
  private readonly modals = inject(ModalController);
  private readonly geolocation = inject(GeolocationService);
  private readonly analytics = inject(AnalyticsService);
  private readonly transloco = inject(TranslocoService);

  readonly radiusOptions = RADIUS_OPTIONS;
  readonly parkRules = PARK_RULES;
  readonly petSizeKey = descriptionToKeyMap;
  readonly spotTypeKey = descriptionToKeyMapSpot;

  readonly segment = signal<Segment>('venues');
  /** Filters behind the list on screen. */
  readonly filters = signal<SpotFilters>(NO_SPOT_FILTERS);
  /** Filters being edited in the sheet; applied with "Show results". */
  readonly draft = signal<SpotFilters>(NO_SPOT_FILTERS);
  readonly sheetOpen = signal(false);
  readonly locating = signal(false);
  /** A link (Home, a venue page, a website URL) waiting for the venue types or townships it names. */
  readonly pendingLink = signal<PlacesLink | null>(null);
  /** City of the parks list; 0 = every city. */
  readonly parkCityId = signal(0);

  /** Re-labels the chips when the language changes or its file arrives. */
  readonly #translation = toSignal(this.transloco.selectTranslation());

  /** Venue types with each category's types side by side. */
  readonly spotTypes = computed(() => orderSpotTypes(this.shared.spotTypes()));
  readonly #lookups = computed<SpotFilterLookups>(() => ({
    spotTypes: this.shared.spotTypes(),
    townships: this.shared.townships() as Township[],
    petSizes: this.spots.allowed(),
  }));

  readonly activeFilterCount = computed(() => activeSpotFilterCount(this.filters()));
  readonly chips = computed<FilterChip[]>(() => {
    this.#translation();
    return spotFilterChips(this.filters(), this.#lookups(), this.lang()).map((c) => ({
      id: c.id,
      label: this.#label(c),
    }));
  });
  /** The sheet's venue type field: "Kafići" for a whole category. */
  readonly draftTypes = computed(() => {
    this.#translation();
    return spotTypeLabels(this.draft().spotTypeIds, this.shared.spotTypes())
      .map((c) => this.#label(c))
      .join(', ');
  });
  readonly draftPlaces = computed(() => {
    this.#translation();
    return placeLabels(this.draft().townshipIds, this.shared.townships() as Township[], this.lang(), false)
      .map((c) => this.#label(c))
      .join(', ');
  });

  /** Placeholders until the first results: also while locating or resolving a link. */
  readonly listPending = computed(
    () =>
      !this.list.spots().length &&
      (this.list.status() === 'loading' || this.list.status() === 'idle' || this.locating() || !!this.pendingLink()),
  );

  /** Cities that have parks, by name, for the parks filter. */
  readonly parkCities = computed(() => {
    const byId = new Map<number, string>();
    for (const park of this.parks.parks()) byId.set(Number(park.grd_id), park.grd_ime);
    return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'sr'));
  });
  readonly visibleParks = computed(() => {
    const cityId = this.parkCityId();
    const parks = this.parks.parks();
    return cityId ? parks.filter((p) => Number(p.grd_id) === cityId) : parks;
  });

  #pendingSpots: Completable | null = null;
  #pendingParks: Completable | null = null;
  /** `linkKey` of the last link followed. */
  #appliedLink: string | null = null;

  constructor() {
    addIcons({ add, alertCircleOutline, leafOutline, openOutline, optionsOutline, searchOutline });

    // Finish pull-to-refresh / infinite scroll once the list is done.
    effect(() => {
      const busy = this.list.status() === 'loading' || this.list.loadingMore();
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

    // Links from Home, venue pages and the website: ?segment=parks, ?near=1, ?category=kafici&city=novi-sad …
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => this.#applyQueryParams(params));

    // A link becomes filters once the venue types and townships it names have loaded.
    effect(() => {
      const link = this.pendingLink();
      if (!link) return;
      const needs = linkNeeds(link);
      const spotTypes = this.shared.spotTypes();
      const townships = this.shared.townships() as Township[];
      if ((needs.spotTypes && !spotTypes.length) || (needs.townships && !townships.length)) return;
      untracked(() => {
        this.pendingLink.set(null);
        const resolved = resolvePlacesLink(link, spotTypes, townships);
        this.filters.set({
          ...NO_SPOT_FILTERS,
          word: resolved.word,
          spotTypeIds: resolved.spotTypeIds,
          townshipIds: resolved.townshipIds,
        });
        this.search();
      });
    });

    // Opened without a link: everything.
    if (this.list.status() === 'idle' && !this.pendingLink() && !this.locating()) this.search();
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
    this.analytics.trackSearch('spots', word);
  }

  /** A new list for the filters on screen. */
  search(): void {
    this.list.search(this.filters());
  }

  loadMore(event: InfiniteScrollCustomEvent): void {
    this.list.loadMore();
    if (this.list.loadingMore()) this.#pendingSpots = event.target;
    else void event.target.complete();
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

  removeChip(id: string): void {
    this.filters.set(withoutChip(this.filters(), id, this.#lookups()));
    this.search();
  }

  // ── Filter sheet ────────────────────────────────────────────────────────
  openFilters(): void {
    this.draft.set(this.filters());
    this.sheetOpen.set(true);
  }

  patchDraft(patch: Partial<SpotFilters>): void {
    this.draft.update((d) => ({ ...d, ...patch }));
  }

  setDraftTypes(value: unknown): void {
    this.patchDraft({ spotTypeIds: Array.isArray(value) ? value.map(Number) : [] });
  }

  async pickTownships(): Promise<void> {
    const modal = await this.modals.create({
      component: TownshipPickerComponent,
      componentProps: {
        townships: this.shared.townships() as Township[],
        selected: this.draft().townshipIds,
        multiple: true,
        title: 'mobile_city_or_township',
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
      this.analytics.trackNearMe('spots');
    } else if (toggle) {
      // No position: put the switch back.
      (toggle as HTMLIonToggleElement).checked = false;
    }
  }

  applyFilters(): void {
    this.filters.set(this.draft());
    this.sheetOpen.set(false);
    this.search();
    this.analytics.trackFilterApplied('spots', spotFilterKeys(this.filters()));
  }

  clearFilters(): void {
    const cleared = { ...NO_SPOT_FILTERS, word: this.filters().word };
    this.draft.set(cleared);
    this.filters.set(cleared);
    this.sheetOpen.set(false);
    this.search();
  }

  radiusLabel(metres: number): string {
    return formatDistance(metres, this.lang()) ?? '';
  }

  // ── Parks ───────────────────────────────────────────────────────────────
  setParkCity(value: unknown): void {
    this.parkCityId.set(typeof value === 'number' ? value : 0);
  }

  parkDescription(park: Park): string | null {
    return cleanApiText(park.par_opis);
  }

  parkMapUrl(park: Park): string {
    return googleMapsSearchUrl([park.par_ime, park.par_lokacija, park.grd_ime].filter(Boolean).join(', '));
  }

  #label(chip: ChipSpec): string {
    return chip.text ?? this.transloco.translate(chip.key ?? '', chip.params);
  }

  #applyQueryParams(params: ParamMap): void {
    // Coming back from a venue or another tab brings the same params again: keep what the user changed since.
    const key = linkKey(params);
    if (key === this.#appliedLink) return;
    this.#appliedLink = key;

    const segment = params.get('segment');
    if (segment === 'venues' || segment === 'parks') this.segment.set(segment);

    if (params.get('near') === '1') {
      void this.#searchNearMe();
      return;
    }

    const link = readPlacesLink(params);
    if (!link) return;
    // A search typed on Home.
    if (link.word) this.analytics.trackSearch('spots', link.word);
    this.pendingLink.set(link);
  }

  /** "Near me" from Home: venues around the phone, other filters cleared. */
  async #searchNearMe(): Promise<void> {
    this.locating.set(true);
    const near = await this.geolocation.current();
    this.locating.set(false);
    if (near) {
      this.analytics.trackNearMe('spots');
      this.filters.set({ ...NO_SPOT_FILTERS, near });
      this.search();
    } else if (this.list.status() === 'idle') {
      this.search();
    }
  }
}
