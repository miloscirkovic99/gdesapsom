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
  delay,
  pipe,
  EMPTY,
} from 'rxjs';
import { SnackbarService } from '../../core/services/snackbar.service';
import { TranslocoService } from '@ngneat/transloco';
import { DialogService } from '../../core/services/dialog.service';
import { ContactFormService } from '../components/contact-form/contact-form.service';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import{tapResponse} from '@ngrx/operators'
import { environment } from 'apps/gde-sa-psom-portal/src/env/env.dev';

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
    const contactFormService = inject(ContactFormService);
    const refreshAOS = () => setTimeout(() => AOS.refresh(), 500);

    const handleError = (error: any) => {
      const translatedButton = translocoService.translate('close');

      const translatedMessage = translocoService.translate('error_global');
      snackbarService.openSnackbar(
        translatedMessage,
        translatedButton,
        'error-snackbar'
      );
      patchState(store, { isLoading: false });
    };

    return {
      loadSpots: rxMethod<any>(
        pipe(
          tap(() => {
            debounceTime(300);
            patchState(store, { isLoading: true });
          }),
          switchMap((params: any) => {
            if (params?.data?.resetOffset) {
              patchState(store, { offset: 0, spotsList: [] });
            }

            const limit = store.limit();
            const offset = store.offset();

            return http.post<any>('pet-friendly-spots/search-query', {
              ops_id: params?.data?.ops_id,
              ugo_id: params?.data?.ugo_id,
              sta_id: params?.data?.sta_id,
              word: params.data?.word,
              offset,
              limit,
            }).pipe(
              // Handle errors inside switchMap to prevent stream completion
              catchError((error) => {
                const translatedMessage = translocoService.translate('spots_error404');
                const translatedButton = translocoService.translate('close');

                snackbarService.openSnackbar(
                  translatedMessage,
                  translatedButton,
                  'error-snackbar'
                );

                patchState(store, { isLoading: false });

                // Return EMPTY to keep the stream alive
                return EMPTY;
              })
            );

          }),
          tapResponse({
            next: (response:any) => {
              patchState(store, (state) => ({
                spotsList: [...state.spotsList, ...response.spotsList],
                totalResult: response.totalResults,
                offset: state.spotsList.length + response.spotsList.length,
                isLoading: false, // Reset loading state on success
              }));
              refreshAOS();
            },
            error:  (error: unknown)=> {
               of(null)
            }
          })
        )
      ),

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
        const translatedButton = translocoService.translate('close');

        http
          .post<any>('pet-friendly-spots/pending', form)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (result) => {
              dialogService.closeDialog();
              const translatedMessage =
                translocoService.translate('success_add');

              snackbarService.openSnackbar(
                translatedMessage,
                translatedButton,
                'success-snackbar'
              );
              if(environment.production){

                const data = {
                  email: 'noreply@gdesapsom.com',
                  subject: `Novi objekat ${form.iuo_ime}`,
                  message: `New pet location u have  check on: gdesapsom.com`,
                };
                contactFormService.sendEmail(data);
              }
            },
            error: (err) => {
              console.error(err);
              const translatedMessage =
                translocoService.translate('error_global');

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
          .post<any>('pet-friendly-spots/update', form)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (result) => {
              this.loadInitialData();
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
      updatePendingSpot(form: any) {
        http
          .post<any>('pet-friendly-spots/update_pending', form)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (result) => {
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
      loadInitialData() {
        const data = {
          ops_id: null,
          ugo_id: null,
          sta_id: null,
          word: null,
          resetOffset: true,
        };
        this.loadSpots({ data });
      },
      deleteSpot(spotId: any) {
        http
          .post('pet-friendly-spots/delete', { iuo_id: spotId })
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (result) => {
              this.loadInitialData();
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
      store.loadInitialData();
      store.randomSpots();
      store.allowedPetTypes();
    },
    onDestroy(store) {
      destroyed$.next(); // Ensures cleanup of ongoing HTTP requests
      destroyed$.complete();
    },
  })
);
