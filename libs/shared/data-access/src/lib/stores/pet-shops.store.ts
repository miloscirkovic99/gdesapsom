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
import { debounceTime, pipe, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { PetShopsApi } from '../catalog/pet-shops.api';
import { Notifier } from '../platform/notifier';
import {
  EMPTY_PET_SHOP_FILTERS,
  PET_SHOP_PAGE_SIZE,
  PetShopCursor,
  PetShopDetail,
  PetShopFilters,
  PetShopListItem,
} from '../catalog/catalog.models';
import { CatalogDetailError } from './dog-food.store';

interface PetShopsState {
  items: PetShopListItem[];
  total: number | null;
  cursor: PetShopCursor | null;
  filters: PetShopFilters;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasError: boolean;
  detail: PetShopDetail | null;
  isLoadingDetail: boolean;
  detailError: CatalogDetailError | null;
}

const initialPetShopsState: PetShopsState = {
  items: [],
  total: null,
  cursor: null,
  filters: EMPTY_PET_SHOP_FILTERS,
  isLoading: false,
  isLoadingMore: false,
  hasError: false,
  detail: null,
  isLoadingDetail: false,
  detailError: null,
};

const destroyed$ = new Subject<void>();

export const PetShopsStore = signalStore(
  { providedIn: 'root' },
  withState(initialPetShopsState),
  withComputed((store) => ({
    hasMore: computed(() => store.cursor() !== null),
    activeFilterCount: computed(() => {
      const f = store.filters();
      return [f.townshipIds.length > 0, f.hasDelivery, f.near !== null].filter(Boolean).length;
    }),
  })),
  withMethods((store) => {
    const api = inject(PetShopsApi);
    const notifier = inject(Notifier);
    const translocoService = inject(TranslocoService);

    const showError = (messageKey = 'catalog_error') => {
      notifier.notify(
        translocoService.translate(messageKey),
        'error',
        translocoService.translate('close'),
      );
    };

    return {
      search: rxMethod<PetShopFilters>(
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
            api.search(filters, null, PET_SHOP_PAGE_SIZE).pipe(
              tapResponse({
                next: (page) => {
                  patchState(store, {
                    items: page.data,
                    total: page.total,
                    cursor: page.cursor,
                    isLoading: false,
                  });
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

      loadMore(): void {
        const cursor = store.cursor();
        if (!cursor || store.isLoading() || store.isLoadingMore()) return;

        const filters = store.filters();
        patchState(store, { isLoadingMore: true });

        api
          .search(filters, cursor, PET_SHOP_PAGE_SIZE)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (page) => {
              if (store.filters() !== filters) return;
              patchState(store, (state) => ({
                items: [...state.items, ...page.data],
                cursor: page.cursor,
                isLoadingMore: false,
              }));
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
    onDestroy() {
      destroyed$.next();
      destroyed$.complete();
    },
  }),
);
