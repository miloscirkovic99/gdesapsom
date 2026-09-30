import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
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
import { IonRefresher } from '@ionic/angular/ion-refresher';
import { IonRefresherContent } from '@ionic/angular/ion-refresher-content';
import { IonSearchbar } from '@ionic/angular/ion-searchbar';
import { IonSelect } from '@ionic/angular/ion-select';
import { IonSelectOption } from '@ionic/angular/ion-select-option';
import { IonSkeletonText } from '@ionic/angular/ion-skeleton-text';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { ModalController } from '@ionic/angular/modal-controller';
import type { InfiniteScrollCustomEvent, RefresherCustomEvent } from '@ionic/angular';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { callOutline, chevronDown, locationOutline, searchOutline } from 'ionicons/icons';
import { SharedStore, VetClinic, VetClinicsStore } from '@gde/shared/data-access';
import { googleMapsSearchUrl } from '@gde/shared/util';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { TownshipPickerComponent } from '../../shared/ui/township-picker.component';
import { NO_VET_FILTERS, toVetSearchParams, VetFilters, vetFilterKeys } from './vet-filters';

@Component({
  selector: 'app-vets',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
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
    IonSelect,
    IonSelectOption,
    IonSkeletonText,
    TranslocoPipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar class="page-toolbar">
        <ion-title class="page-title">{{ 'mobile_tab_vets' | transloco }}</ion-title>
      </ion-toolbar>
      <ion-toolbar class="sub-toolbar">
        <div class="search-row">
          <ion-searchbar
            [value]="filters().word"
            [placeholder]="'search_name' | transloco"
            [debounce]="400"
            enterkeyhint="search"
            (ionInput)="setWord($event.detail.value)"
          />
        </div>
        <div class="place-row">
          <ion-select [cancelText]="'mobile_cancel' | transloco" [okText]="'mobile_done' | transloco"
            class="city"
            [label]="'mobile_city' | transloco"
            interface="action-sheet"
            [value]="filters().cityId"
            (ionChange)="setCity($event.detail.value)"
          >
            <ion-select-option [value]="0">{{ 'mobile_all' | transloco }}</ion-select-option>
            @for (city of shared.city(); track city.grd_id) {
              <ion-select-option [value]="city.grd_id">{{ city.grd_ime }}</ion-select-option>
            }
          </ion-select>
          @if (cityTownships().length > 1) {
            <button type="button" class="township" [class.active]="filters().townshipIds.length" (click)="pickTownships()">
              {{ 'township' | transloco }}{{ filters().townshipIds.length ? ' (' + filters().townshipIds.length + ')' : '' }}
              <ion-icon name="chevron-down" aria-hidden="true" />
            </button>
          }
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <ion-list lines="inset" class="clinics">
        @for (clinic of vets.vetClinicsList(); track clinic.vetc_id) {
          <ion-item>
            <ion-label class="ion-text-wrap">
              <h2>{{ clinic.vetc_naziv }}</h2>
              @if (clinic.vetc_adresa) {
                <p>{{ clinic.vetc_adresa }}</p>
              }
              <p class="area">{{ clinic.ops_ime ? clinic.ops_ime + ', ' : '' }}{{ clinic.grd_ime }}</p>
            </ion-label>
            <ion-buttons slot="end">
              @if (clinic.vetc_telefon) {
                <ion-button
                  [href]="'tel:' + clinic.vetc_telefon"
                  data-link-type="venue_phone"
                  [attr.aria-label]="'mobile_call' | transloco"
                >
                  <ion-icon slot="icon-only" name="call-outline" />
                </ion-button>
              }
              <ion-button
                [href]="mapUrl(clinic)"
                target="_blank"
                rel="noopener"
                data-link-type="venue_maps"
                [attr.aria-label]="'mobile_open_in_maps' | transloco"
              >
                <ion-icon slot="icon-only" name="location-outline" />
              </ion-button>
            </ion-buttons>
          </ion-item>
        } @empty {
          @if (vets.isLoading()) {
            @for (i of [1, 2, 3, 4, 5]; track i) {
              <div class="skeleton-row" aria-hidden="true">
                <div class="skeleton-lines">
                  <ion-skeleton-text [animated]="true" style="width: 65%; height: 14px" />
                  <ion-skeleton-text [animated]="true" style="width: 50%" />
                  <ion-skeleton-text [animated]="true" style="width: 35%" />
                </div>
              </div>
            }
          } @else {
            <div class="app-state">
              <ion-icon name="search-outline" aria-hidden="true" />
              <h3>{{ 'no_results_title' | transloco }}</h3>
              <p>{{ 'no_entries' | transloco }}</p>
            </div>
          }
        }
      </ion-list>

      <ion-infinite-scroll [disabled]="!canLoadMore()" (ionInfinite)="loadMore($event)">
        <ion-infinite-scroll-content />
      </ion-infinite-scroll>
    </ion-content>
  `,
  styles: `
    .search-row {
      padding-bottom: 8px;
    }
    /* City and municipality: two filled controls under the search. */
    .place-row {
      display: flex;
      gap: 8px;
      padding: 0 var(--app-gutter) 12px;
    }
    .city {
      --padding-start: 12px;
      --padding-end: 12px;
      flex: 1;
      min-width: 0;
      min-height: 44px;
      border-radius: var(--app-radius-md);
      background: var(--app-surface-sunken);
      font-size: 0.9375rem;
    }
    .city::part(label) {
      color: var(--app-text-2);
      font-weight: 500;
    }
    .city::part(text) {
      font-weight: 600;
    }
    .township {
      display: inline-flex;
      flex: none;
      align-items: center;
      gap: 6px;
      min-height: 44px;
      padding: 0 12px;
      border: 0;
      border-radius: var(--app-radius-md);
      background: var(--app-surface-sunken);
      color: var(--app-text);
      font: inherit;
      font-size: 0.9375rem;
      font-weight: 600;
    }
    .township.active {
      background: var(--app-primary-soft);
      color: var(--app-on-primary-soft);
    }
    .township ion-icon {
      color: var(--app-text-2);
      font-size: 14px;
    }
    .clinics {
      padding-top: 8px;
    }
    .clinics ion-item {
      --min-height: 76px;
    }
    .clinics ion-label {
      margin-block: 12px;
    }
    .clinics ion-label p {
      color: var(--app-text-2);
    }
    .area {
      font-size: 0.8125rem !important;
    }
    /* Call and map: round, filled, thumb-sized. */
    .clinics ion-buttons {
      gap: 8px;
      margin-inline-start: 12px;
    }
    .clinics ion-buttons ion-button {
      --background: var(--app-surface-sunken);
      --background-activated: var(--app-primary-soft);
      --background-activated-opacity: 1;
      --border-radius: 50%;
      --color: var(--app-primary);
      --padding-start: 0;
      --padding-end: 0;
      width: 44px;
      height: 44px;
      margin: 0;
    }
    .clinics ion-buttons ion-icon {
      font-size: 20px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VetsPage {
  readonly vets = inject(VetClinicsStore);
  readonly shared = inject(SharedStore);
  private readonly modals = inject(ModalController);
  private readonly analytics = inject(AnalyticsService);

  readonly filters = signal<VetFilters>(NO_VET_FILTERS);
  /** Townships of the chosen city, from the full list (see Township). */
  readonly cityTownships = computed(() => {
    const cityId = this.filters().cityId;
    return cityId ? this.shared.townships().filter((t) => t.grd_id === cityId) : [];
  });
  readonly canLoadMore = computed(() => {
    const shown = this.vets.vetClinicsList().length;
    return shown > 0 && shown < this.vets.totalResult();
  });

  #pending: { complete(): Promise<void> | void } | null = null;

  constructor() {
    addIcons({ callOutline, chevronDown, locationOutline, searchOutline });
    effect(() => {
      const busy = this.vets.isLoading();
      untracked(() => {
        if (!busy && this.#pending) {
          void this.#pending.complete();
          this.#pending = null;
        }
      });
    });
  }

  setWord(value: string | null | undefined): void {
    const word = (value ?? '').trim() || null;
    if (word === this.filters().word) return;
    this.filters.update((f) => ({ ...f, word }));
    this.search();
    this.analytics.trackSearch('vet_clinics', word);
  }

  setCity(value: unknown): void {
    const cityId = typeof value === 'number' ? value : 0;
    this.filters.update((f) => ({ ...f, cityId, townshipIds: [] }));
    this.search();
    this.analytics.trackFilterApplied('vet_clinics', vetFilterKeys(this.filters()));
  }

  async pickTownships(): Promise<void> {
    const modal = await this.modals.create({
      component: TownshipPickerComponent,
      componentProps: {
        townships: this.cityTownships(),
        selected: this.filters().townshipIds,
        multiple: true,
        title: 'township',
      },
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<number[]>();
    if (role === 'confirm' && data) {
      this.filters.update((f) => ({ ...f, townshipIds: data }));
      this.search();
      this.analytics.trackFilterApplied('vet_clinics', vetFilterKeys(this.filters()));
    }
  }

  search(reset = true): void {
    this.vets.loadVetclinics({ data: toVetSearchParams(this.filters(), reset) });
  }

  loadMore(event: InfiniteScrollCustomEvent): void {
    this.#pending = event.target;
    this.search(false);
  }

  refresh(event: RefresherCustomEvent): void {
    this.#pending = event.target;
    this.search();
  }

  mapUrl(clinic: VetClinic): string {
    return googleMapsSearchUrl([clinic.vetc_naziv, clinic.vetc_adresa, clinic.grd_ime].filter(Boolean).join(', '));
  }
}

