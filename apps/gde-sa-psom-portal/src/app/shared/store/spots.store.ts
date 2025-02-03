import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  patchState,
  signalStore,
  withState,
  withMethods,
  withHooks,
  signalState,
  withComputed,
} from '@ngrx/signals';
import AOS from 'aos';
import {
  debounce,
  Subject,
  switchMap,
  takeUntil,
  debounceTime,
  catchError,
  tap,
  throwError,
  of,
} from 'rxjs';
import { SnackbarService } from '../../core/services/snackbar.service';
import { TranslocoService } from '@ngneat/transloco';
import { DialogService } from '../../core/services/dialog.service';

// Define the initial state type
type SpotsState = {
  spotsList: any[];
  totalResult: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  random: any[];
  allowed: any[];
  spotTypes: any[];
  spotsSearchResult: any[];
};

// Create the signal state
const initialSpotsState = signalState<SpotsState>({
  spotsList: [],
  totalResult: 0,
  limit: 10,
  offset: 0,
  isLoading: false,
  random: [],
  allowed: [],
  spotTypes: [],
  spotsSearchResult: [],
});
const destroyed$ = new Subject<void>();
// Create the SignalStore with `withStorageSync`
export const SpotsStore = signalStore(
  { providedIn: 'root' },
  withState(initialSpotsState),
  withComputed((store) => ({
    spots: computed(() => store.spotsList()),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);
    const snackbarService = inject(SnackbarService);
    const translocoService = inject(TranslocoService);
    const dialogService = inject(DialogService);

    const refreshAOS = () => setTimeout(() => AOS.refresh(), 500);

    const handleError = (error: any) => {
      snackbarService.openSnackbar(
        'Oops... Something went wrong, please check your fields and try again',
        'Close',
        'error-snackbar'
      );
      patchState(store, { isLoading: false });
    };

    return {
      loadData(
        ops_id?: any,
        ugo_id?: any,
        sta_id?: any,
        word?: any,
        resetOffset: boolean = false
      ) {
        patchState(store, { isLoading: true });

        if (resetOffset) {
          patchState(store, { offset: 0, spotsList: [] });
        }

        const limit = store.limit();
        const offset = store.offset();

        return of({}) // Emits an initial empty value
          .pipe(
            takeUntil(destroyed$),
            debounceTime(300), // Adds debounce directly in the function
            switchMap(() =>
              http.post<any>('pet-friendly-spots/search-query', {
                ops_id,
                ugo_id,
                sta_id,
                word,
                offset,
                limit,
              })
            ),
            takeUntil(destroyed$),
            tap((response) => {
              patchState(store, (state) => ({
                spotsList: [...state.spotsList, ...response.spotsList],
                totalResult: response.totalResults,
                offset: state.spotsList.length + response.spotsList.length,
                isLoading: false,
              }));
              refreshAOS();
            }),
            catchError((error) => {
              const translatedMessage =
                translocoService.translate('spots_error404');
              const translatedButton = translocoService.translate('close');

              snackbarService.openSnackbar(
                translatedMessage,
                translatedButton,
                'error-snackbar'
              );

              patchState(store, { isLoading: false });

              return throwError(() => error);
            })
          )
          .subscribe(); // Subscribe here since no Subject is used
      },

      randomSpots() {
        http
          .get<any>('pet-friendly-spots/random')
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (response) => {
              patchState(store, (state) => ({
                random: [...state.random, ...response.randomSpots],
              }));
            },
            error: handleError,
          });
      },
      suggestSpot(form: any) {
        http
          .post<any>('pet-friendly-spots/pending', form.value)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (result) => {
              form.reset();
              dialogService.closeDialog();
              const translatedMessage =
                translocoService.translate('success_add');
              const translatedButton = translocoService.translate('close');
              snackbarService.openSnackbar(
                translatedMessage,
                translatedButton,
                'success-snackbar'
              );
            },
            error: (err) => {
              console.error(err);
              const translatedMessage =
                translocoService.translate('success_add');
              const translatedButton = translocoService.translate('close');
              snackbarService.openSnackbar(
                translatedMessage,
                translatedButton,
                'error-snackbar'
              );
            },
          });
      },
      updateSpot(form: any) {
        http
          .post<any>('pet-friendly-spots/update', form.value)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (result) => {
              this.loadData(null, null, null,null, true);
              dialogService.closeDialog();
              snackbarService.openSnackbar(
                'Successfully updated pet-friendly location.',
                'Zatvori',

                'success-snackbar'
              );
              refreshAOS();
            },
            error: handleError,
          });
      },
      deleteSpot(spotId: any) {
        http
          .post('pet-friendly-spots/delete', { iuo_id: spotId })
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (result) => {
              this.loadData(null, null, null, true);
              snackbarService.openSnackbar(
                'Successfully deleted pet-friendly location.',
                'Zatvori',

                'success-snackbar'
              );
            },
            error: handleError,
          });
      },
      acceptPendingSpot(data: any) {
        http
          .post<any>('pet-friendly-spots/create', data)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (result) => {
              snackbarService.openSnackbar(
                'Successfully accepted pet-friendly location.',
                'Zatvori',

                'success-snackbar'
              );
            },
          });
      },
      declinePendingSpot(spotId: any) {
        http
          .put('pet-friendly-spots/pending', { pr_id: spotId })
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (result) => {
              snackbarService.openSnackbar(
                'Successfully accepted pending pet-friendly location.',
                'Zatvori',

                'success-snackbar'
              );
            },
            error: handleError,
          });
      },
      allowedPetTypes() {
        http
          .get<any>('allowed-pet-types')
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (response) => {
              patchState(store, (state) => ({
                allowed: response.allowed,
              }));
            },
            error: handleError,
          });
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadData();
      store.randomSpots();
      store.allowedPetTypes();
    },
    onDestroy(store) {
      destroyed$.next(); // Ensures cleanup of ongoing HTTP requests
      destroyed$.complete();
    },
  })
);
