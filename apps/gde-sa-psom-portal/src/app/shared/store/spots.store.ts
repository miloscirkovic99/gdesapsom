import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  patchState,
  signalStore,
  withState,
  withMethods,
  withHooks,
  withComputed,
} from '@ngrx/signals';
import AOS from 'aos';
import {
  Subject,
  switchMap,
  takeUntil,
  debounceTime,
  catchError,
  tap,
  pipe,
  EMPTY,
} from 'rxjs';
import { SnackbarService } from '../../core/services/snackbar.service';
import { TranslocoService } from '@ngneat/transloco';
import { DialogService } from '../../core/services/dialog.service';
import { ContactFormService } from '../components/contact-form/contact-form.service';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { environment } from '../../../env/env.dev';

interface SpotsSearchResponse {
  spotsList: Record<string, unknown>[];
  totalResults: number;
}

interface RandomSpotsResponse {
  randomSpots: Record<string, unknown>[];
}

interface AllowedPetTypesResponse {
  allowed: Record<string, unknown>[];
}

interface SpotsState {
  spotsList: any[];
  totalResult: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  random: any[];
  allowed: any[];
  spotTypes: any[];
  spotsSearchResult: any[];
}

const initialSpotsState: SpotsState = {
  spotsList: [],
  totalResult: 0,
  limit: 10,
  offset: 0,
  isLoading: false,
  random: [],
  allowed: [],
  spotTypes: [],
  spotsSearchResult: [],
};

const destroyed$ = new Subject<void>();

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

    const showSuccess = (messageKey: string) => {
      snackbarService.openSnackbar(
        translocoService.translate(messageKey),
        translocoService.translate('close'),
        'success-snackbar'
      );
    };

    const showError = (messageKey: string = 'error_global') => {
      snackbarService.openSnackbar(
        translocoService.translate(messageKey),
        translocoService.translate('close'),
        'error-snackbar'
      );
      patchState(store, { isLoading: false });
    };

    return {
      loadSpots: rxMethod<{ data: { ops_id: string | null; ugo_id: string | null; sta_id: string | null; word: string | null; resetOffset?: boolean; latitude: number | null; longitude: number | null,radius:number | null} }>(
        pipe(
          debounceTime(300),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((params) => {
            if (params.data.resetOffset) {
              patchState(store, { offset: 0, spotsList: [] });
            }

            const limit = store.limit();
            const offset = store.offset();

            return http.post<SpotsSearchResponse>('pet-friendly-spots/search-query', {
              ops_id: params.data.ops_id,
              ugo_id: params.data.ugo_id,
              sta_id: params.data.sta_id,
              word: params.data.word,
              lat: params.data.latitude,
              lon: params.data.longitude,
              radius: params.data.radius,
              offset,
              limit,
            }).pipe(
              catchError(() => {
                showError('spots_error404');
                return EMPTY;
              })
            );
          }),
          tapResponse({
            next: (response: SpotsSearchResponse) => {
              patchState(store, (state) => ({
                spotsList: [...state.spotsList, ...response.spotsList],
                totalResult: response.totalResults,
                offset: state.spotsList.length + response.spotsList.length,
                isLoading: false,
              }));
              refreshAOS();
            },
            error: () => patchState(store, { isLoading: false }),
          })
        )
      ),
      // getNearMeSpots: rxMethod<{ latitude: number; longitude: number,radius:number }>(
      //   pipe(
      //     debounceTime(300),
      //     tap(() => patchState(store, { isLoading: true })),
      //     switchMap((params) => {
      //       const { latitude, longitude, radius } = params;
      //       return http.post<SpotsSearchResponse>('pet-friendly-spots/near-me', { latitude, longitude, radius }).pipe(
      //         catchError(() => {
      //           showError('spots_error404');
      //           return EMPTY;
      //         })
      //       );
      //     }),
      //     tapResponse({
      //       next: (response: SpotsSearchResponse) => {
      //         patchState(store, (state) => ({
      //           spotsList: response.spotsList,
      //           totalResult: response.totalResults,
      //           offset: 0,
      //           isLoading: false,
      //         }));
      //         refreshAOS();
      //       },
      //       error: () => patchState(store, { isLoading: false }),
      //     })
      //   )
      // ),
      getSpotById(iuo_id: string, onSuccess: (spot: any) => void, onError: () => void) {
        if (!iuo_id) {
          console.error('getSpotById: iuo_id is null or undefined', iuo_id);
          onError();
          return;
        }
                
        http
           .post<any>(`pet-friendly-spots/all/${iuo_id}`, { iuo_id })
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (response) => {
              onSuccess(response?.spotsListSingle?.[0] ?? null);
            },
            error: (err) => {
              console.error('getSpotById error:', err);
              onError();
            },
          });
      },
      randomSpots() {
        http
          .get<RandomSpotsResponse>('pet-friendly-spots/random')
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (response) => {
              patchState(store, (state) => ({
                random: [...state.random, ...response.randomSpots],
              }));
            },
            error: () => showError(),
          });
      },
      suggestSpot(form: any, onSuccess?: () => void, onError?: () => void) {
        http
          .post<unknown>('pet-friendly-spots/pending', form)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: () => {
              dialogService.closeDialog();
              showSuccess('success_add');
              if (environment.production) {
                contactFormService.sendEmail({
                  from: 'noreply@gdesapsom.com',
                  subject: `Novi objekat ${form.iuo_ime}`,
                  message: 'New pet location to check on: gdesapsom.com',
                  showSnackbar: false,
                });
              }
              onSuccess?.();
            },
            error: () => {
              showError();
              onError?.();
            },
          });
      },
      updateSpot(form: any) {
        http
          .post<unknown>('pet-friendly-spots/update', form)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: () => {
              this.loadInitialData();
              dialogService.closeDialog();
              showSuccess('spot_updated_success');
              refreshAOS();
            },
            error: () => showError(),
          });
      },
      updatePendingSpot(form: any) {
        http
          .post<unknown>('pet-friendly-spots/update_pending', form)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: () => {
              dialogService.closeDialog();
              showSuccess('spot_updated_success');
              refreshAOS();
            },
            error: () => showError(),
          });
      },
      loadInitialData() {
        const data = {
          ops_id: null,
          ugo_id: null,
          sta_id: null,
          word: null,
          resetOffset: true,
          latitude: null,
          longitude: null,
          radius: null,
        
        };
        this.loadSpots({ data });
      },
      deleteSpot(spotId: number | string) {
        http
          .post('pet-friendly-spots/delete', { iuo_id: spotId })
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: () => {
              this.loadInitialData();
              showSuccess('spot_deleted_success');
            },
            error: () => showError(),
          });
      },
      acceptPendingSpot(data: any) {
        http
          .post<unknown>('pet-friendly-spots/create', data)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: () => showSuccess('spot_accepted_success'),
            error: () => showError(),
          });
      },
      declinePendingSpot(spotId: number | string) {
        http
          .put('pet-friendly-spots/pending', { pr_id: spotId })
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: () => showSuccess('spot_declined_success'),
            error: () => showError(),
          });
      },
      allowedPetTypes() {
        http
          .get<AllowedPetTypesResponse>('allowed-pet-types')
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (response) => {
              patchState(store, { allowed: response.allowed });
            },
            error: () => showError(),
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
    onDestroy() {
      destroyed$.next();
      destroyed$.complete();
    },
  })
);
