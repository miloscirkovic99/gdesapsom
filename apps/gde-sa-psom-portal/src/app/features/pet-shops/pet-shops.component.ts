import { AsyncPipe, Location, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { ReplaySubject } from 'rxjs';
import { SnackbarService } from '../../core/services/snackbar.service';
import { CatalogNavComponent } from '../../shared/components/catalog-nav/catalog-nav.component';
import { ListStateComponent, ListStatus } from '../../shared/components/list-state/list-state.component';
import { PetShopCardComponent } from '../../shared/components/pet-shop-card/pet-shop-card.component';
import { PetShopFilters } from '../../shared/data-access/catalog/catalog.models';
import { PetShopsStore } from '../../shared/store/pet-shops.store';
import { SharedStore } from '../../shared/store/shared.store';
import { injectActiveLang } from '../../shared/utils/active-lang';
import { pluralKey } from '../../shared/utils/plural';
import { filterTownshipsMulti } from '../../shared/utils/township.util';

type ShopsForm = {
  word: FormControl<string | null>;
  townshipIds: FormControl<number[]>;
  hasDelivery: FormControl<boolean>;
  radius: FormControl<number>;
};

type ChipKey = 'townships' | 'hasDelivery' | 'near';

/** Row shape of SharedStore.townships() (the legacy `opstina` table). */
interface Township {
  id: number;
  ime: string;
}

interface FilterChip {
  key: ChipKey;
  label?: string;
  labelKey?: string;
}

const DEFAULT_RADIUS = 5000;

@Component({
  selector: 'app-pet-shops',
  imports: [
    AsyncPipe,
    NgTemplateOutlet,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
    TranslocoModule,
    CatalogNavComponent,
    ListStateComponent,
    PetShopCardComponent,
  ],
  templateUrl: './pet-shops.component.html',
  styleUrl: './pet-shops.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetShopsComponent implements OnInit {
  // ── DI ────────────────────────────────────────────────────────────────────
  readonly store = inject(PetShopsStore);
  readonly sharedStore = inject(SharedStore);
  readonly lang = injectActiveLang();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackbarService = inject(SnackbarService);
  private readonly translocoService = inject(TranslocoService);

  // ── Static options ────────────────────────────────────────────────────────
  readonly radiusOptions = [1000, 2000, 3000, 5000, 7500, 10000] as const;

  // ── UI state ──────────────────────────────────────────────────────────────
  readonly showFilters = signal(false);
  readonly isLoadingLocation = signal(false);
  readonly userLocation = signal<{ lat: number; lon: number } | null>(null);

  // ── Form ──────────────────────────────────────────────────────────────────
  readonly form = new FormGroup<ShopsForm>({
    word: new FormControl<string | null>(null),
    townshipIds: new FormControl<number[]>([], { nonNullable: true }),
    hasDelivery: new FormControl(false, { nonNullable: true }),
    radius: new FormControl(DEFAULT_RADIUS, { nonNullable: true }),
  });

  readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  readonly townshipMultiFilterCtrl = new FormControl<string>('');
  readonly filteredTownships = new ReplaySubject<Township[]>(1);

  // ── Computed ──────────────────────────────────────────────────────────────
  readonly listStatus = computed<ListStatus | null>(() => {
    if (this.store.isLoading()) return 'loading';
    if (this.store.hasError()) return 'error';
    if (this.store.items().length === 0) return 'empty';
    return null;
  });

  readonly totalCountKey = computed(() =>
    pluralKey('shop_count', this.store.total() ?? 0, this.lang()),
  );

  readonly hasAnyFilter = computed(
    () => this.store.activeFilterCount() > 0 || !!this.formValue().word?.trim(),
  );

  readonly activeChips = computed<FilterChip[]>(() => {
    const value = this.formValue();
    const chips: FilterChip[] = [];

    const selected = value.townshipIds ?? [];
    if (selected.length) {
      const names = (this.sharedStore.townships() as Township[])
        .filter((t) => selected.includes(t.id))
        .map((t) => t.ime);
      const shown = names.slice(0, 2).join(', ');
      const rest = names.length - 2;
      chips.push({ key: 'townships', label: rest > 0 ? `${shown} +${rest}` : shown || `${selected.length}` });
    }

    if (value.hasDelivery) chips.push({ key: 'hasDelivery', labelKey: 'filter_has_delivery' });

    if (this.userLocation()) {
      chips.push({ key: 'near', label: `${(value.radius ?? DEFAULT_RADIUS) / 1000} km` });
    }

    return chips;
  });

  // ── Constructor / effects ─────────────────────────────────────────────────
  constructor() {
    effect(() => {
      const townships = this.sharedStore.townships();
      if (townships.length) {
        this.filteredTownships.next(townships.slice());
      }
    });

    this.townshipMultiFilterCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() =>
        this.filteredTownships.next(
          filterTownshipsMulti(this.sharedStore, this.townshipMultiFilterCtrl.value ?? ''),
        ),
      );
  }

  ngOnInit(): void {
    this.#applyQueryParams(this.route.snapshot.queryParamMap);

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.#runSearch());

    this.#runSearch();
  }

  // ── Public API ────────────────────────────────────────────────────────────
  getCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.#notify('geolocation_not_supported');
      return;
    }

    this.isLoadingLocation.set(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.userLocation.set({ lat: coords.latitude, lon: coords.longitude });
        this.isLoadingLocation.set(false);
        this.#runSearch();
      },
      () => {
        this.isLoadingLocation.set(false);
        this.#notify('unable_to_get_location');
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  clearLocation(): void {
    this.userLocation.set(null);
    this.#runSearch();
  }

  removeChip(key: ChipKey): void {
    if (key === 'townships') this.form.controls.townshipIds.setValue([]);
    else if (key === 'hasDelivery') this.form.controls.hasDelivery.setValue(false);
    else this.clearLocation();
  }

  clearFilters(): void {
    this.userLocation.set(null);
    this.form.reset({ townshipIds: [], hasDelivery: false, radius: DEFAULT_RADIUS });
    this.showFilters.set(false);
  }

  toggleFilters(): void {
    this.showFilters.update((open) => !open);
  }

  applyFilters(): void {
    this.showFilters.set(false);
  }

  retry(): void {
    this.#runSearch();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showFilters()) this.showFilters.set(false);
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  #runSearch(): void {
    const filters = this.#toFilters();
    this.store.search(filters);
    this.#syncUrl(filters);
  }

  #toFilters(): PetShopFilters {
    const value = this.form.getRawValue();
    const near = this.userLocation();
    return {
      word: value.word?.trim() || null,
      townshipIds: value.townshipIds,
      hasDelivery: value.hasDelivery,
      near: near ? { lat: near.lat, lon: near.lon, radius: value.radius } : null,
    };
  }

  /** See DogFoodCatalogComponent for why this bypasses `router.navigate`. */
  #syncUrl(filters: PetShopFilters): void {
    const queryParams: Params = {
      q: filters.word,
      township: filters.townshipIds.length ? filters.townshipIds.join(',') : null,
      delivery: filters.hasDelivery ? '1' : null,
    };

    const tree = this.router.createUrlTree([], { relativeTo: this.route, queryParams });
    this.location.replaceState(this.router.serializeUrl(tree));
  }

  #applyQueryParams(params: ParamMap): void {
    this.form.patchValue({
      word: params.get('q'),
      townshipIds: (params.get('township') ?? '')
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isInteger(id) && id > 0),
      hasDelivery: params.get('delivery') === '1',
    });
  }

  #notify(messageKey: string): void {
    this.snackbarService.openSnackbar(
      this.translocoService.translate(messageKey),
      this.translocoService.translate('close'),
      'error-snackbar',
    );
  }
}
