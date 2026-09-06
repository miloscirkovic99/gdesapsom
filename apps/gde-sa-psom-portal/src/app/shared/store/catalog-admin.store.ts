import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { TranslocoService } from '@ngneat/transloco';
import { catchError, Observable, take, tap, throwError } from 'rxjs';
import { SnackbarService } from '../../core/services/snackbar.service';
import { CatalogAdminApi } from '../data-access/catalog/catalog-admin.api';
import {
  AdminBrand,
  AdminBrandPayload,
  AdminDogFood,
  AdminDogFoodPayload,
  AdminPetShop,
  AdminPetShopPayload,
  SavedRef,
} from '../data-access/catalog/catalog-admin.models';

interface CatalogAdminState {
  shops: AdminPetShop[];
  isLoadingShops: boolean;
  products: AdminDogFood[];
  isLoadingProducts: boolean;
  brands: AdminBrand[];
  isLoadingBrands: boolean;
}

const initialCatalogAdminState: CatalogAdminState = {
  shops: [],
  isLoadingShops: false,
  products: [],
  isLoadingProducts: false,
  brands: [],
  isLoadingBrands: false,
};

/**
 * Admin lists for the catalog plus the mutations that change them.
 *
 * Unlike the public stores nothing loads on init: the admin panel calls
 * `loadShops()` / `loadProducts()` / `loadBrands()` itself. Every mutation
 * shows a snackbar (the API's own message on failure, it is written for the
 * admin) and reloads the affected list; the returned observable lets a dialog
 * close itself once the save went through.
 */
export const CatalogAdminStore = signalStore(
  { providedIn: 'root' },
  withState(initialCatalogAdminState),
  withComputed((store) => ({
    activeShops: computed(() => store.shops().filter((shop) => shop.isActive)),
    activeProducts: computed(() => store.products().filter((product) => product.isActive)),
  })),
  withMethods((store) => {
    const api = inject(CatalogAdminApi);
    const snackbarService = inject(SnackbarService);
    const translocoService = inject(TranslocoService);

    const notifySuccess = (messageKey: string): void => {
      snackbarService.openSnackbar(
        translocoService.translate(messageKey),
        translocoService.translate('close'),
        'success-snackbar',
      );
    };

    // The handlers answer 4xx with a `message` written for the admin ("Slug već
    // koristi..."); anything else (network, HTML instead of JSON) gets the
    // generic text rather than a raw parser error.
    const notifyError = (error?: unknown): void => {
      const serverMessage =
        error instanceof HttpErrorResponse &&
        error.status >= 400 &&
        error.status < 600 &&
        typeof error.error?.message === 'string'
          ? error.error.message
          : null;
      snackbarService.openSnackbar(
        serverMessage || translocoService.translate('admin_error'),
        translocoService.translate('close'),
        'error-snackbar',
      );
    };

    const loadShops = (): void => {
      patchState(store, { isLoadingShops: true });
      api
        .listPetShops()
        .pipe(take(1))
        .subscribe({
          next: (shops) => patchState(store, { shops, isLoadingShops: false }),
          error: (error) => {
            patchState(store, { isLoadingShops: false });
            notifyError(error);
          },
        });
    };

    const loadProducts = (): void => {
      patchState(store, { isLoadingProducts: true });
      api
        .listDogFood()
        .pipe(take(1))
        .subscribe({
          next: (products) => patchState(store, { products, isLoadingProducts: false }),
          error: (error) => {
            patchState(store, { isLoadingProducts: false });
            notifyError(error);
          },
        });
    };

    const loadBrands = (): void => {
      patchState(store, { isLoadingBrands: true });
      api
        .listBrands()
        .pipe(take(1))
        .subscribe({
          next: (brands) => patchState(store, { brands, isLoadingBrands: false }),
          error: (error) => {
            patchState(store, { isLoadingBrands: false });
            notifyError(error);
          },
        });
    };

    /** Snackbar + list reload on success, snackbar + rethrow on failure. */
    const mutate = <T>(source: Observable<T>, successKey: string, reload: () => void): Observable<T> =>
      source.pipe(
        take(1),
        tap(() => {
          notifySuccess(successKey);
          reload();
        }),
        catchError((error: unknown) => {
          notifyError(error);
          return throwError(() => error);
        }),
      );

    /** Fire-and-forget variant for buttons in the lists. */
    const run = (source: Observable<unknown>, successKey: string, reload: () => void): void => {
      mutate(source, successKey, reload).subscribe({ error: () => undefined });
    };

    return {
      notifySuccess,
      notifyError,
      loadShops,
      loadProducts,
      loadBrands,

      // ── Pet shops ─────────────────────────────────────────────────────
      saveShop(payload: AdminPetShopPayload, id: number | null): Observable<SavedRef> {
        const request = id === null ? api.createPetShop(payload) : api.updatePetShop(id, payload);
        return mutate(request, 'admin_shop_saved', loadShops);
      },
      setShopActive(id: number, isActive: boolean): void {
        run(api.setPetShopActive(id, isActive), 'admin_done', loadShops);
      },
      deleteShop(id: number, hard: boolean): void {
        run(api.deletePetShop(id, hard), 'admin_done', loadShops);
      },

      // ── Dog food ──────────────────────────────────────────────────────
      saveProduct(payload: AdminDogFoodPayload, id: number | null): Observable<SavedRef> {
        const request = id === null ? api.createDogFood(payload) : api.updateDogFood(id, payload);
        return mutate(request, 'admin_product_saved', loadProducts);
      },
      setProductActive(id: number, isActive: boolean): void {
        run(api.setDogFoodActive(id, isActive), 'admin_done', loadProducts);
      },
      deleteProduct(id: number, hard: boolean): void {
        run(api.deleteDogFood(id, hard), 'admin_done', loadProducts);
      },

      // ── Brands ────────────────────────────────────────────────────────
      createBrand(payload: AdminBrandPayload): Observable<AdminBrand> {
        return mutate(api.createBrand(payload), 'admin_brand_saved', loadBrands);
      },
    };
  }),
);
