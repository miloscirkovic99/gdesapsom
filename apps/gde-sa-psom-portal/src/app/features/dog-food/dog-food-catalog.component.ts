import { Location, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { CatalogNavComponent } from '../../shared/components/catalog-nav/catalog-nav.component';
import { DogFoodCardComponent } from '../../shared/components/dog-food-card/dog-food-card.component';
import { ListStateComponent, ListStatus } from '../../shared/components/list-state/list-state.component';
import {
  DogFoodFilters,
  DogFoodSort,
  LookupItem,
} from '../../shared/data-access/catalog/catalog.models';
import { LocalNamePipe } from '../../shared/pipes/local-name.pipe';
import { RsdPricePipe } from '../../shared/pipes/rsd-price.pipe';
import { DogFoodStore } from '../../shared/store/dog-food.store';
import { injectActiveLang } from '../../shared/utils/active-lang';
import { pluralKey } from '../../shared/utils/plural';

type CatalogForm = {
  word: FormControl<string | null>;
  foodType: FormControl<string | null>;
  lifeStage: FormControl<string | null>;
  breedSize: FormControl<string | null>;
  brands: FormControl<string[]>;
  grainFree: FormControl<boolean>;
  minPrice: FormControl<number | null>;
  maxPrice: FormControl<number | null>;
  sort: FormControl<DogFoodSort>;
};

type ChipKey = 'foodType' | 'lifeStage' | 'breedSize' | 'grainFree' | 'price' | `brand:${string}`;

interface FilterChip {
  key: ChipKey;
  label?: string;
  labelKey?: string;
}

@Component({
  selector: 'app-dog-food-catalog',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    TranslocoModule,
    CatalogNavComponent,
    DogFoodCardComponent,
    ListStateComponent,
    LocalNamePipe,
    RsdPricePipe,
  ],
  templateUrl: './dog-food-catalog.component.html',
  styleUrl: './dog-food-catalog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogFoodCatalogComponent implements OnInit {
  // ── DI ────────────────────────────────────────────────────────────────────
  readonly store = inject(DogFoodStore);
  readonly lang = injectActiveLang();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);

  // ── Static options ────────────────────────────────────────────────────────
  readonly sortOptions: { value: DogFoodSort; key: string }[] = [
    { value: 'name', key: 'sort_name' },
    { value: 'price', key: 'sort_price' },
    { value: 'new', key: 'sort_new' },
  ];

  // ── UI state ──────────────────────────────────────────────────────────────
  readonly showFilters = signal(false);

  // ── Form ──────────────────────────────────────────────────────────────────
  readonly form = new FormGroup<CatalogForm>({
    word: new FormControl<string | null>(null),
    foodType: new FormControl<string | null>(null),
    lifeStage: new FormControl<string | null>(null),
    breedSize: new FormControl<string | null>(null),
    brands: new FormControl<string[]>([], { nonNullable: true }),
    grainFree: new FormControl(false, { nonNullable: true }),
    minPrice: new FormControl<number | null>(null),
    maxPrice: new FormControl<number | null>(null),
    sort: new FormControl<DogFoodSort>('name', { nonNullable: true }),
  });

  readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  // ── Computed ──────────────────────────────────────────────────────────────
  readonly listStatus = computed<ListStatus | null>(() => {
    if (this.store.isLoading()) return 'loading';
    if (this.store.hasError()) return 'error';
    if (this.store.items().length === 0) return 'empty';
    return null;
  });

  readonly totalCountKey = computed(() =>
    pluralKey('food_count', this.store.total() ?? 0, this.lang()),
  );

  readonly hasAnyFilter = computed(
    () => this.store.activeFilterCount() > 0 || !!this.formValue().word?.trim(),
  );

  readonly activeChips = computed<FilterChip[]>(() => {
    const value = this.formValue();
    const lookups = this.store.lookups();
    const lang = this.lang();
    const chips: FilterChip[] = [];

    const nameOf = (list: LookupItem[] | undefined, code: string): string => {
      const match = list?.find((item) => item.code === code);
      if (!match) return code;
      return lang.startsWith('en') ? match.nameEn : match.nameSr;
    };

    if (value.foodType) chips.push({ key: 'foodType', label: nameOf(lookups?.foodTypes, value.foodType) });
    if (value.lifeStage) chips.push({ key: 'lifeStage', label: nameOf(lookups?.lifeStages, value.lifeStage) });
    if (value.breedSize) chips.push({ key: 'breedSize', label: nameOf(lookups?.breedSizes, value.breedSize) });

    for (const slug of value.brands ?? []) {
      chips.push({ key: `brand:${slug}`, label: lookups?.brands.find((b) => b.slug === slug)?.name ?? slug });
    }

    if (value.grainFree) chips.push({ key: 'grainFree', labelKey: 'grain_free' });

    if (value.minPrice != null || value.maxPrice != null) {
      const format = (n: number) => new Intl.NumberFormat(lang.startsWith('en') ? 'en-US' : 'sr-Latn-RS').format(n);
      const from = value.minPrice != null ? format(value.minPrice) : '0';
      const to = value.maxPrice != null ? format(value.maxPrice) : '';
      chips.push({ key: 'price', label: `${from} - ${to} RSD`.replace(' -  RSD', '+ RSD') });
    }

    return chips;
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.#applyQueryParams(this.route.snapshot.queryParamMap);

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.#runSearch());

    this.#runSearch();
  }

  // ── Public API ────────────────────────────────────────────────────────────
  selectFoodType(code: string | null): void {
    const current = this.form.controls.foodType.value;
    this.form.controls.foodType.setValue(code === current ? null : code);
  }

  isBrandSelected(slug: string): boolean {
    return this.formValue().brands?.includes(slug) ?? false;
  }

  toggleBrand(slug: string, checked: boolean): void {
    const brands = this.form.controls.brands.value;
    this.form.controls.brands.setValue(
      checked ? [...new Set([...brands, slug])] : brands.filter((b) => b !== slug),
    );
  }

  removeChip(key: ChipKey): void {
    if (key === 'foodType' || key === 'lifeStage' || key === 'breedSize') {
      this.form.controls[key].setValue(null);
      return;
    }
    if (key === 'price') {
      this.form.patchValue({ minPrice: null, maxPrice: null });
      return;
    }
    if (key === 'grainFree') {
      this.form.controls.grainFree.setValue(false);
      return;
    }
    this.toggleBrand(key.slice('brand:'.length), false);
  }

  clearFilters(): void {
    this.form.reset({ brands: [], grainFree: false, sort: this.form.controls.sort.value });
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

  #toFilters(): DogFoodFilters {
    const value = this.form.getRawValue();
    return {
      word: value.word?.trim() || null,
      foodType: value.foodType || null,
      lifeStage: value.lifeStage || null,
      breedSize: value.breedSize || null,
      brands: value.brands,
      grainFree: value.grainFree ? true : null,
      minPrice: value.minPrice ?? null,
      maxPrice: value.maxPrice ?? null,
      sort: value.sort,
    };
  }

  /**
   * Mirrors the filters into the URL (`/dog-food?type=dry&brand=royal-canin`)
   * so results are shareable and survive back navigation. `Location.replaceState`
   * is used instead of `router.navigate` because the app's scroll restoration
   * scrolls to the top on every navigation, which would jump the page on each
   * keystroke.
   */
  #syncUrl(filters: DogFoodFilters): void {
    const queryParams: Params = {
      q: filters.word,
      type: filters.foodType,
      stage: filters.lifeStage,
      size: filters.breedSize,
      brand: filters.brands.length ? filters.brands.join(',') : null,
      grainFree: filters.grainFree ? '1' : null,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      sort: filters.sort !== 'name' ? filters.sort : null,
    };

    const tree = this.router.createUrlTree([], { relativeTo: this.route, queryParams });
    this.location.replaceState(this.router.serializeUrl(tree));
  }

  #applyQueryParams(params: ParamMap): void {
    const numberOf = (key: string): number | null => {
      const raw = params.get(key);
      if (raw === null || raw === '') return null;
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    };

    const sort = params.get('sort');

    this.form.patchValue({
      word: params.get('q'),
      foodType: params.get('type'),
      lifeStage: params.get('stage'),
      breedSize: params.get('size'),
      brands: (params.get('brand') ?? '')
        .split(',')
        .map((slug) => slug.trim())
        .filter(Boolean),
      grainFree: params.get('grainFree') === '1',
      minPrice: numberOf('minPrice'),
      maxPrice: numberOf('maxPrice'),
      sort: sort === 'price' || sort === 'new' ? sort : 'name',
    });
  }
}
