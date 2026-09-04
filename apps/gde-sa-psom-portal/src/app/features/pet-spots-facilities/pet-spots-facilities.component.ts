import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { SpotsStore } from '../../shared/store/spots.store';
import { CardComponent } from '../../shared/components/card/card.component';
import { ReplaySubject } from 'rxjs';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@ngneat/transloco';
import {
  descriptionToKeyMap,
  descriptionToKeyMapSpot,
} from '../../shared/helpers/map.helpers';
import { SharedStore } from '../../shared/store/shared.store';
import { filterTownshipsMulti } from '../../shared/utils/township.util';
import { ActivatedRoute } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { SearchContext } from '../../core/analytics/analytics.events';
import {
  ListName,
  SearchType,
  toSearchCategory,
} from '../../core/analytics/analytics.taxonomy';

interface SearchPayload {
  ops_id: string | null;
  ugo_id: string | number | null;
  sta_id: string | number | null;
  word: string | null;
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
  resetOffset: boolean | null;
}
type PetSpotsForm = {
  ops_id: FormControl<number[] | null>;
  sta_id: FormControl<number | null>;
  ugo_id: FormControl<number | null>;
  word:   FormControl<string | null>;
  radius: FormControl<number | null>;
};

/** A `search` event waiting for its results so it can carry the real `results_count`. */
interface PendingSearch {
  params: SearchContext;
  /** The store sets isLoading after a 300 ms debounce; ignore the "not loading" state before that. */
  loadingSeen: boolean;
}


@Component({
  selector: 'app-pet-spots-facilities',
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatIconModule,
    CardComponent,
    NgxMatSelectSearchModule,
    TranslocoModule,
    AsyncPipe
  ],
  templateUrl: './pet-spots-facilities.component.html',
  styleUrl: './pet-spots-facilities.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetSpotsFacilitiesComponent {
  // ── DI ────────────────────────────────────────────────────────────────────
  readonly spotsStore   = inject(SpotsStore);
  readonly sharedStore  = inject(SharedStore);
  private  readonly fb          = inject(FormBuilder);
  private  readonly route       = inject(ActivatedRoute);
  private  readonly destroyRef  = inject(DestroyRef);
  private  readonly analytics   = inject(AnalyticsService);

  // ── Maps ──────────────────────────────────────────────────────────────────
  readonly descriptionToKeyMap     = descriptionToKeyMap;
  readonly descriptionToKeyMapSpot = descriptionToKeyMapSpot;
  readonly radiusOptions           = [1000, 2000, 3000, 5000, 7500, 10000] as const;
  readonly listNames               = ListName;

  // ── UI state (signals) ────────────────────────────────────────────────────
  readonly showFilters       = signal(false);
  readonly isLoadingLocation = signal(false);
  readonly userLocation      = signal<{ latitude: number; longitude: number } | null>(null);

  #pendingSearch: PendingSearch | null = null;

  // ── Form ──────────────────────────────────────────────────────────────────
 readonly form: FormGroup<PetSpotsForm> = this.fb.group({
  ops_id: new FormControl<number[] | null>(null),
  sta_id: new FormControl<number | null>(null),
  ugo_id: new FormControl<number | null>(null),
  word:   new FormControl<string | null>(null),
  radius: new FormControl<number | null>(null),
});

  readonly townshipMultiFilterCtrl = new FormControl<string>('');
  readonly filteredtownshipsMulti  = new ReplaySubject<any[]>(1);
readonly formValue = toSignal(
  this.form.valueChanges,
  { initialValue: this.form.value }
);
  // ── Computed ──────────────────────────────────────────────────────────────
  readonly activeFilterCount = computed(() => {
    const loc = this.userLocation();
    const v = this.formValue();
    return [
      v.ops_id?.length,
      v.sta_id,
      v.ugo_id,
      v.radius,
      loc?.latitude,
    ].filter(Boolean).length;
  });

  readonly hasActiveFilters = computed(() => this.activeFilterCount() > 0);

 readonly activeFilterChips = computed(() => {
  const v = this.formValue();
  const loc = this.userLocation();

  const chips: { key: string; label: string }[] = [];

  if (v.sta_id) {
    const match = this.spotsStore.allowed()
      .find((i: any) => i.id === v.sta_id);
    if (match) chips.push({ key: 'sta_id', label: descriptionToKeyMap[match.ime] });
  }

  if (v.ugo_id) {
    const match = this.sharedStore.spotTypes()
      .find((i: any) => i.id === v.ugo_id);
    if (match) chips.push({ key: 'ugo_id', label: descriptionToKeyMapSpot[match.ime] });
  }

  if (v.ops_id?.length) {
    chips.push({ key: 'ops_id', label: `${v.ops_id.length} cities` });
  }

  if (loc) {
    const km = (v.radius ?? 0) / 1000;
    chips.push({ key: 'location', label: `${km} km` });
  }

  return chips;
});


  // ── Constructor / effects ─────────────────────────────────────────────────
  constructor() {
    this.#initFormSubscriptions();
    this.#initTownshipEffect();
    this.#initQueryParamEffect();
    this.#initSearchTrackingEffect();
  }

  // ── Public API ────────────────────────────────────────────────────────────
  onSubmit(resetOffset = false): void {
    this.#search(this.#buildPayload(resetOffset), this.userLocation() ? SearchType.nearMe : SearchType.filter);
  }

  onSelectionChange(controlName: string, event: { value: any }): void {
    if (event.value === null && !this.hasActiveFilters()) {
      this.#resetStoreData();
    }
  }

  toggleFilters(): void {
    this.showFilters.update(v => !v);
  }

  applyFilters(): void {
    this.onSubmit(true);
    this.showFilters.set(false);
  }

  removeFilter(key: string): void {
    if (key === 'location') {
      this.userLocation.set(null);
      this.form.patchValue({ radius: null });
    } else {
      this.form.patchValue({ [key]: null });
    }
    this.onSubmit(true);
  }

  clearFilters(): void {
    this.form.reset();
    this.userLocation.set(null);
    this.#resetStoreData();
    this.toggleFilters();
  }

  getCurrentLocation(): void {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    this.isLoadingLocation.set(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.userLocation.set({
          latitude:  coords.latitude,
          longitude: coords.longitude,
        });
        this.isLoadingLocation.set(false);
        this.form.patchValue({ radius: 5000 });
        this.onSubmit(true);
      },
      (error) => {
        console.error('Geolocation error:', error);
        this.isLoadingLocation.set(false);
        alert('Unable to get your location. Please enable location services.');
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  #initFormSubscriptions(): void {
    this.form.get('word')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(word => this.#search(
        { ...this.#buildPayload(true), word: word ?? null },
        SearchType.text,
      ));

    this.form.get('radius')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(radius => {
        if (this.userLocation() && radius) {
          this.onSubmit(true);
        }
      });

    this.townshipMultiFilterCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.#filterTownships());
  }

  #initTownshipEffect(): void {
    effect(() => {
      const townships = this.sharedStore.townships();
      if (townships.length) {
        this.filteredtownshipsMulti.next(townships.slice());
      }
    });
  }

  #initQueryParamEffect(): void {
    effect(() => {
      const spotTypes   = this.sharedStore.spotTypes();
      const spotTypeName = this.route.snapshot.queryParamMap.get('spotType');

      if (spotTypes?.length && spotTypeName) {
        const match = spotTypes.find((t: any) => t.ime === spotTypeName);
        if (match) {
          this.form.patchValue({ ugo_id: match.id });
          this.onSubmit(true);
        }
      }
    });
  }

  /**
   * Sends the queued `search` once the store has finished loading, so the
   * event carries the real total instead of a guess.
   */
  #initSearchTrackingEffect(): void {
    effect(() => {
      const isLoading = this.spotsStore.isLoading();
      const pending = this.#pendingSearch;
      if (!pending) return;

      if (isLoading) {
        pending.loadingSeen = true;
        return;
      }
      if (!pending.loadingSeen) return;

      this.#pendingSearch = null;
      this.analytics.trackSearch({
        ...pending.params,
        results_count: this.spotsStore.totalResult(),
      });
    });
  }

  #search(payload: SearchPayload, searchType: SearchType): void {
    this.spotsStore.loadSpots({ data: payload });
    this.#queueSearchTracking(payload, searchType);
  }

  /** Only a new search counts - "see more" pagination and clearing to the full list do not. */
  #queueSearchTracking(payload: SearchPayload, searchType: SearchType): void {
    if (!payload.resetOffset) return;

    const hasCriteria =
      !!payload.word || !!payload.ugo_id || !!payload.sta_id || !!payload.ops_id || !!payload.latitude;
    if (!hasCriteria) {
      this.#pendingSearch = null;
      return;
    }

    const v = this.form.value;
    const spotType = v.ugo_id
      ? this.sharedStore.spotTypes().find((t: any) => t.id === v.ugo_id)?.ime
      : null;
    const township = v.ops_id?.length === 1
      ? this.sharedStore.townships().find((t: any) => t.id === v.ops_id![0])?.ime
      : null;

    this.#pendingSearch = {
      loadingSeen: false,
      params: {
        search_term: payload.word,
        search_category: toSearchCategory(spotType),
        search_type: searchType,
        city: township ?? null,
      },
    };
  }

  #filterTownships(): void {
    const search = this.townshipMultiFilterCtrl.value ?? '';
    this.filteredtownshipsMulti.next(
      filterTownshipsMulti(this.sharedStore, search),
    );
  }

  #buildPayload(resetOffset = false): SearchPayload {
    const v   = this.form.value;
    const loc = this.userLocation();

    return {
      ops_id:      v.ops_id?.length ? v.ops_id.join(',') : null,
      ugo_id:      v.ugo_id  ?? null,
      sta_id:      v.sta_id  ?? null,
      word:        v.word    ?? null,
      latitude:    loc?.latitude  ?? null,
      longitude:   loc?.longitude ?? null,
      radius:      v.radius  ?? null,
      resetOffset: !!(v.word || resetOffset),
    };
  }

  #resetStoreData(): void {
    this.#pendingSearch = null;
    this.spotsStore.loadSpots({
      data: {
        ops_id: null, ugo_id: null, sta_id: null, word: null,
        latitude: null, longitude: null, radius: null, resetOffset: true,
      },
    });
  }

  ngOnDestroy(): void {
    this.#resetStoreData();
  }
}
