import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
import { IonRefresherContent } from '@ionic/angular/ion-refresher-content';
import { IonRouterLink } from '@ionic/angular/ion-router-link';
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
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline, imageOutline, optionsOutline, searchOutline } from 'ionicons/icons';
import {
  DogFoodFilters,
  DogFoodSort,
  DogFoodStore,
  EMPTY_DOG_FOOD_FILTERS,
  EMPTY_PET_SHOP_FILTERS,
  PetShopFilters,
  PetShopsStore,
  SharedStore,
} from '@gde/shared/data-access';
import { injectActiveLang, LocalNamePipe, PackageWeightPipe, pluralKey, RsdPricePipe } from '@gde/shared/util';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { GeolocationService } from '../../core/platform/geolocation.service';
import { formatDistance } from '../../shared/format-distance';
import { TownshipPickerComponent } from '../../shared/ui/township-picker.component';
import { foodFilterKeys, shopFilterKeys } from './catalog-filters';

type Segment = 'food' | 'shops';

interface Completable {
  complete(): Promise<void> | void;
}

@Component({
  selector: 'app-catalog',
  imports: [
    RouterLink,
    IonRouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonSegment,
    IonSegmentButton,
    IonSearchbar,
    IonButtons,
    IonButton,
    IonIcon,
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
    TranslocoPipe,
    LocalNamePipe,
    PackageWeightPipe,
    RsdPricePipe,
  ],
  templateUrl: './catalog.page.html',
  styleUrl: './catalog.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPage {
  readonly food = inject(DogFoodStore);
  readonly shops = inject(PetShopsStore);
  readonly shared = inject(SharedStore);
  readonly lang = injectActiveLang();
  private readonly route = inject(ActivatedRoute);
  private readonly modals = inject(ModalController);
  private readonly geolocation = inject(GeolocationService);
  private readonly analytics = inject(AnalyticsService);

  readonly sortOptions: { value: DogFoodSort; key: string }[] = [
    { value: 'name', key: 'sort_name' },
    { value: 'price', key: 'sort_price' },
    { value: 'new', key: 'sort_new' },
  ];
  readonly radiusOptions = [1000, 2000, 5000, 10000];

  readonly segment = signal<Segment>('food');
  readonly foodDraft = signal<DogFoodFilters>(EMPTY_DOG_FOOD_FILTERS);
  readonly shopDraft = signal<PetShopFilters>(EMPTY_PET_SHOP_FILTERS);
  readonly foodSheetOpen = signal(false);
  readonly shopSheetOpen = signal(false);
  readonly locating = signal(false);

  #pendingFood: Completable | null = null;
  #pendingShops: Completable | null = null;

  constructor() {
    addIcons({ cloudOfflineOutline, imageOutline, optionsOutline, searchOutline });

    this.food.search(EMPTY_DOG_FOOD_FILTERS);

    effect(() => {
      const busy = this.food.isLoading() || this.food.isLoadingMore();
      untracked(() => {
        if (!busy && this.#pendingFood) {
          void this.#pendingFood.complete();
          this.#pendingFood = null;
        }
      });
    });
    effect(() => {
      const busy = this.shops.isLoading() || this.shops.isLoadingMore();
      untracked(() => {
        if (!busy && this.#pendingShops) {
          void this.#pendingShops.complete();
          this.#pendingShops = null;
        }
      });
    });

    // Home links here with ?segment=food|shops.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const segment = params.get('segment');
      if (segment === 'food' || segment === 'shops') this.setSegment(segment);
    });
  }

  setSegment(value: unknown): void {
    if (value !== 'food' && value !== 'shops') return;
    this.segment.set(value);
    // The shop list loads the first time its segment is shown.
    if (value === 'shops' && !this.shops.items().length && !this.shops.isLoading()) {
      this.shops.search(this.shops.filters());
    }
  }

  // ── Search ──────────────────────────────────────────────────────────────
  setFoodWord(value: string | null | undefined): void {
    const word = (value ?? '').trim() || null;
    if (word === this.food.filters().word) return;
    this.food.search({ ...this.food.filters(), word });
    this.analytics.trackSearch('dog_food', word);
  }

  setShopWord(value: string | null | undefined): void {
    const word = (value ?? '').trim() || null;
    if (word === this.shops.filters().word) return;
    this.shops.search({ ...this.shops.filters(), word });
    this.analytics.trackSearch('pet_shops', word);
  }

  loadMore(event: InfiniteScrollCustomEvent): void {
    if (this.segment() === 'food') {
      this.#pendingFood = event.target;
      this.food.loadMore();
    } else {
      this.#pendingShops = event.target;
      this.shops.loadMore();
    }
    // loadMore() is a no-op when a page is already in flight; don't leave the spinner up.
    setTimeout(() => {
      if (!this.food.isLoadingMore() && !this.shops.isLoadingMore()) void event.target.complete();
    }, 0);
  }

  refresh(event: RefresherCustomEvent): void {
    if (this.segment() === 'food') {
      this.#pendingFood = event.target;
      this.food.search(this.food.filters());
    } else {
      this.#pendingShops = event.target;
      this.shops.search(this.shops.filters());
    }
  }

  // ── Food filters ────────────────────────────────────────────────────────
  openFoodFilters(): void {
    this.foodDraft.set(this.food.filters());
    this.foodSheetOpen.set(true);
  }

  patchFood(patch: Partial<DogFoodFilters>): void {
    this.foodDraft.update((f) => ({ ...f, ...patch }));
  }

  applyFood(): void {
    this.food.search(this.foodDraft());
    this.foodSheetOpen.set(false);
    this.analytics.trackFilterApplied('dog_food', foodFilterKeys(this.foodDraft()));
  }

  clearFood(): void {
    this.food.search({ ...EMPTY_DOG_FOOD_FILTERS, word: this.food.filters().word });
    this.foodSheetOpen.set(false);
  }

  // ── Shop filters ────────────────────────────────────────────────────────
  openShopFilters(): void {
    this.shopDraft.set(this.shops.filters());
    this.shopSheetOpen.set(true);
  }

  patchShop(patch: Partial<PetShopFilters>): void {
    this.shopDraft.update((f) => ({ ...f, ...patch }));
  }

  async pickShopTownships(): Promise<void> {
    const modal = await this.modals.create({
      component: TownshipPickerComponent,
      componentProps: {
        townships: this.shared.townships(),
        selected: this.shopDraft().townshipIds,
        multiple: true,
        title: 'filter_township',
      },
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<number[]>();
    if (role === 'confirm' && data) this.patchShop({ townshipIds: data });
  }

  async toggleShopsNearMe(on: boolean, toggle: EventTarget | null): Promise<void> {
    if (!on) {
      this.patchShop({ near: null });
      return;
    }
    this.locating.set(true);
    const position = await this.geolocation.current();
    this.locating.set(false);
    if (position) {
      this.patchShop({ near: { lat: position.latitude, lon: position.longitude, radius: 5000 } });
      this.analytics.trackNearMe('pet_shops');
    } else if (toggle) {
      (toggle as HTMLIonToggleElement).checked = false;
    }
  }

  setShopRadius(radius: number): void {
    const near = this.shopDraft().near;
    if (near) this.patchShop({ near: { ...near, radius } });
  }

  applyShops(): void {
    this.shops.search(this.shopDraft());
    this.shopSheetOpen.set(false);
    this.analytics.trackFilterApplied('pet_shops', shopFilterKeys(this.shopDraft()));
  }

  clearShops(): void {
    this.shops.search({ ...EMPTY_PET_SHOP_FILTERS, word: this.shops.filters().word });
    this.shopSheetOpen.set(false);
  }

  // ── Template helpers ────────────────────────────────────────────────────
  countKey(base: string, count: number): string {
    return pluralKey(base, count, this.lang());
  }

  distance(metres: number | null): string | null {
    return formatDistance(metres, this.lang());
  }
}
