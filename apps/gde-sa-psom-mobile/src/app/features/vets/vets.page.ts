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
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { ModalController } from '@ionic/angular/modal-controller';
import type { InfiniteScrollCustomEvent, RefresherCustomEvent } from '@ionic/angular';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { callOutline, locationOutline } from 'ionicons/icons';
import { SharedStore, VetClinic, VetClinicsStore } from '@gde/shared/data-access';
import { googleMapsSearchUrl } from '@gde/shared/util';
import { TownshipPickerComponent } from '../../shared/ui/township-picker.component';
import { NO_VET_FILTERS, toVetSearchParams, VetFilters } from './vet-filters';

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
    IonSpinner,
    TranslocoPipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar class="page-toolbar">
        <ion-title class="page-title">{{ 'mobile_tab_vets' | transloco }}</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          [value]="filters().word"
          [placeholder]="'search_name' | transloco"
          [debounce]="400"
          enterkeyhint="search"
          (ionInput)="setWord($event.detail.value)"
        />
      </ion-toolbar>
      <ion-toolbar>
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
          <ion-buttons slot="end">
            <ion-button (click)="pickTownships()">
              {{ 'township' | transloco }}{{ filters().townshipIds.length ? ' (' + filters().townshipIds.length + ')' : '' }}
            </ion-button>
          </ion-buttons>
        }
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <ion-list lines="full">
        @for (clinic of vets.vetClinicsList(); track clinic.vetc_id) {
          <ion-item>
            <ion-label class="ion-text-wrap">
              <h2>{{ clinic.vetc_naziv }}</h2>
              @if (clinic.vetc_adresa) {
                <p>{{ clinic.vetc_adresa }}</p>
              }
              <p>{{ clinic.ops_ime ? clinic.ops_ime + ', ' : '' }}{{ clinic.grd_ime }}</p>
            </ion-label>
            <ion-buttons slot="end">
              @if (clinic.vetc_telefon) {
                <ion-button [href]="'tel:' + clinic.vetc_telefon" [attr.aria-label]="'mobile_call' | transloco">
                  <ion-icon slot="icon-only" name="call-outline" />
                </ion-button>
              }
              <ion-button
                [href]="mapUrl(clinic)"
                target="_blank"
                rel="noopener"
                [attr.aria-label]="'mobile_open_in_maps' | transloco"
              >
                <ion-icon slot="icon-only" name="location-outline" />
              </ion-button>
            </ion-buttons>
          </ion-item>
        } @empty {
          <div class="state ion-padding">
            @if (vets.isLoading()) {
              <ion-spinner />
            } @else {
              <h3>{{ 'no_results_title' | transloco }}</h3>
              <p>{{ 'no_entries' | transloco }}</p>
            }
          </div>
        }
      </ion-list>

      <ion-infinite-scroll [disabled]="!canLoadMore()" (ionInfinite)="loadMore($event)">
        <ion-infinite-scroll-content />
      </ion-infinite-scroll>
    </ion-content>
  `,
  styles: `
    .city {
      padding-inline: 16px;
    }
    ion-item ion-buttons ion-button {
      --color: var(--app-pine);
    }
    .state {
      text-align: center;
      color: var(--ion-color-medium);
      padding-top: 48px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VetsPage {
  readonly vets = inject(VetClinicsStore);
  readonly shared = inject(SharedStore);
  private readonly modals = inject(ModalController);

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
    addIcons({ callOutline, locationOutline });
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
  }

  setCity(value: unknown): void {
    const cityId = typeof value === 'number' ? value : 0;
    this.filters.update((f) => ({ ...f, cityId, townshipIds: [] }));
    this.search();
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

