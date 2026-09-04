import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { TranslocoService } from '@ngneat/transloco';
import AOS from 'aos';
import { debounceTime, pipe, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { SnackbarService } from '../../core/services/snackbar.service';
import { DogFoodApi } from '../data-access/catalog/dog-food.api';
import {
  CatalogLookups,
  DOG_FOOD_PAGE_SIZE,
  DogFoodCursor,
  DogFoodDetail,
  DogFoodFilters,
  DogFoodListItem,
  EMPTY_DOG_FOOD_FILTERS,
} from '../data-access/catalog/catalog.models';

export type CatalogDetailError = 'not-found' | 'failed';

interface DogFoodState {
  items: DogFoodListItem[];
  /** Result count for the current filters; known after the first page. */
  total: number | null;
  cursor: DogFoodCursor | null;
  filters: DogFoodFilters;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasError: boolean;
  lookups: CatalogLookups | null;
  isLoadingLookups: boolean;
  detail: DogFoodDetail | null;
  isLoadingDetail: boolean;
  detailError: CatalogDetailError | null;
}

const initialDogFoodState: DogFoodState = {
  items: [],
  total: null,
  cursor: null,
  filters: EMPTY_DOG_FOOD_FILTERS,
  isLoading: false,
  isLoadingMore: false,
  hasError: false,
  lookups: null,
  isLoadingLookups: false,
  detail: null,
  isLoadingDetail: false,
  detailError: null,
};

const destroyed$ = new Subject<void>();

export const DogFoodStore = signalStore(
  { providedIn: 'root' },
  withState(initialDogFoodState),
  withComputed((store) => ({
    hasMore: computed(() => store.cursor() !== null),
    activeFilterCount: computed(() => {
      const f = store.filters();
      return [
        f.foodType,
        f.lifeStage,
        f.breedSize,
        f.brands.length > 0,
        f.grainFree !== null,
        f.minPrice !== null || f.maxPrice !== null,
      ].filter(Boolean).length;
    }),
  })),
  withMethods((store) => {
    const api = inject(DogFoodApi);
    const snackbarService = inject(SnackbarService);
    const translocoService = inject(TranslocoService);
    const refreshAOS = () => setTimeout(() => AOS.refresh(), 500);

    const showError = (messageKey = 'catalog_error') => {
      snackbarService.openSnackbar(
        translocoService.translate(messageKey),
        translocoService.translate('close'),
        'error-snackbar',
      );
    };

    return {
      loadLookups(): void {
        if (store.lookups() || store.isLoadingLookups()) return;
        patchState(store, { isLoadingLookups: true });

        api
          .lookups()
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (lookups) => patchState(store, { lookups, isLoadingLookups: false }),
            error: () => {
              patchState(store, { isLoadingLookups: false });
              showError();
            },
          });
      },

      /** Replaces the list with the first page for `filters`. Debounced so typing does not spam the API. */
      search: rxMethod<DogFoodFilters>(
        pipe(
          tap((filters) =>
            patchState(store, {
              filters,
              isLoading: true,
              isLoadingMore: false,
              hasError: false,
              items: [],
              total: null,
              cursor: null,
            }),
          ),
          debounceTime(250),
          switchMap((filters) =>
            api.search(filters, null, DOG_FOOD_PAGE_SIZE).pipe(
              tapResponse({
                next: (page) => {
                  patchState(store, {
                    items: page.data,
                    total: page.total,
                    cursor: page.cursor,
                    isLoading: false,
                  });
                  refreshAOS();
                },
                error: () => {
                  patchState(store, { isLoading: false, hasError: true });
                  showError();
                },
              }),
            ),
          ),
        ),
      ),

      /** Appends the next page using the cursor the API returned. */
      loadMore(): void {
        const cursor = store.cursor();
        if (!cursor || store.isLoading() || store.isLoadingMore()) return;

        const filters = store.filters();
        patchState(store, { isLoadingMore: true });

        api
          .search(filters, cursor, DOG_FOOD_PAGE_SIZE)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (page) => {
              // A newer search replaced the list while this page was in flight.
              if (store.filters() !== filters) return;
              patchState(store, (state) => ({
                items: [...state.items, ...page.data],
                cursor: page.cursor,
                isLoadingMore: false,
              }));
              refreshAOS();
            },
            error: () => {
              patchState(store, { isLoadingMore: false });
              showError();
            },
          });
      },

      loadDetail: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { detail: null, isLoadingDetail: true, detailError: null })),
          switchMap((slug) =>
            api.bySlug(slug).pipe(
              tapResponse({
                next: (detail) => patchState(store, { detail, isLoadingDetail: false }),
                error: (error: unknown) =>
                  patchState(store, {
                    isLoadingDetail: false,
                    detailError:
                      error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'failed',
                  }),
              }),
            ),
          ),
        ),
      ),

      clearDetail(): void {
        patchState(store, { detail: null, detailError: null, isLoadingDetail: false });
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadLookups();
    },
    onDestroy() {
      destroyed$.next();
      destroyed$.complete();
    },
  }),
);
