import { computed, inject } from '@angular/core';
import {
  patchState,
  signalState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  catchError,
  debounceTime,
  EMPTY,
  of,
  pipe,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import AOS from 'aos';
import { SnackbarService } from '../../core/services/snackbar.service';
import { HttpClient } from '@angular/common/http';
import { DialogService } from '../../core/services/dialog.service';
import { TranslocoService } from '@ngneat/transloco';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';

// Define the initial state type
type vetClinics = {
  vetClinicsList: any[];
  totalResult: number;
  limit: number;
  offset: number;
  isLoading: boolean;
};
// Create the signal state
const initialVetState = signalState<vetClinics>({
  vetClinicsList: [],
  totalResult: 0,
  limit: 10,
  offset: 0,
  isLoading: false,
});

const destroyed$ = new Subject<void>();
// Create the SignalStore with `withStorageSync`
export const VetClinicsStore = signalStore(
  { providedIn: 'root' },
  withState(initialVetState),
  withComputed((store) => ({
    vetClinicsList: computed(() => store.vetClinicsList()),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);
    const snackbarService = inject(SnackbarService);
    const translocoService = inject(TranslocoService);
    const dialogService = inject(DialogService);
    const refreshAOS = () => setTimeout(() => AOS.refresh(), 500);
    return {
      loadVetclinics: rxMethod<any>(
        pipe(
          tap(() => {
            debounceTime(300);
            patchState(store, { isLoading: true });
          }),
          switchMap((params: any) => {
            if (params?.data?.resetOffset) {
              patchState(store, { offset: 0, vetClinicsList: [] });
            }

            const limit = store.limit();
            const offset = store.offset();

            return http
              .post<any>('veterinary-clinics/list', {
                 ops_id: params?.data?.ops_id,
                grd_id: params?.data?.grd_id,
                word: params.data?.word,
                offset,
                limit,
              })
              .pipe(
                // Handle errors inside switchMap to prevent stream completion
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

                  // Return EMPTY to keep the stream alive
                  return EMPTY;
                })
              );
          }),
          tapResponse({
            next: (response: any) => {
              console.log(response);

              patchState(store, (state) => ({
                vetClinicsList: [...state.vetClinicsList, ...response.vetClinics],
                totalResult: response.totalResults,
                offset:state.vetClinicsList.length + response.vetClinics.length,
                isLoading: false, // Reset loading state on success
              }));
              refreshAOS();
            },
            error: (error: unknown) => {
              of(null);
            },
          })
        )
      ),
    };
  }),
  withHooks({
    onInit(store) {
      store.loadVetclinics({});
    },
  })
);
