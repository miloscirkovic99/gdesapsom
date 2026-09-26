import { inject } from '@angular/core';
import {
  patchState,
  signalStore,
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
import { HttpClient } from '@angular/common/http';
import { TranslocoService } from '@ngneat/transloco';
import { Notifier } from '../platform/notifier';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';

// Define the initial state type
type vetClinics = {
  vetClinicsList: any[];
  totalResult: number;
  totalCount:number;
  limit: number;
  offset: number;
  isLoading: boolean;
};
// Create the signal state
const initialVetState: vetClinics = {
  vetClinicsList: [],
  totalResult: 0,
  totalCount:0,
  limit: 10,
  offset: 0,
  isLoading: false,
};

const destroyed$ = new Subject<void>();
// Create the SignalStore with `withStorageSync`
export const VetClinicsStore = signalStore(
  { providedIn: 'root' },
  withState(initialVetState),
  withMethods((store) => {
    const http = inject(HttpClient);
    const notifier = inject(Notifier);
    const translocoService = inject(TranslocoService);
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

                  notifier.notify(translatedMessage, 'error', translatedButton);

                  patchState(store, { isLoading: false });

                  // Return EMPTY to keep the stream alive
                  return EMPTY;
                })
              );
          }),
          tapResponse({
            next: (response: any) => {
              patchState(store, (state) => ({
                vetClinicsList: [...state.vetClinicsList, ...response.vetClinics],
                totalResult: response.totalResults,
                totalCount:response.totalCount - 1,
                offset:state.vetClinicsList.length + response.vetClinics.length,
                isLoading: false, // Reset loading state on success
              }));
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
