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
import { TranslocoService } from '@ngneat/transloco';
import { ContactFormService } from '../contact/contact-form.service';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { APP_CONFIG } from '../config/app-config';
import { Notifier } from '../platform/notifier';
import { AllowedPetType, Spot, SpotSearchParams, SuggestSpotPayload } from '../models/places.models';

interface SpotsSearchResponse {
  spotsList: Spot[];
  totalResults: number;
}

interface RandomSpotsResponse {
  randomSpots: Spot[];
}

interface AllowedPetTypesResponse {
  allowed: AllowedPetType[];
}

interface SpotsState {
  spotsList: Spot[];
  totalResult: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  random: Spot[];
  allowed: AllowedPetType[];
}

const initialSpotsState: SpotsState = {
  spotsList: [],
  totalResult: 0,
  limit: 10,
  offset: 0,
  isLoading: false,
  random: [],
  allowed: [],
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
    const notifier = inject(Notifier);
    const translocoService = inject(TranslocoService);
    const contactFormService = inject(ContactFormService);
    const config = inject(APP_CONFIG);

    const showSuccess = (messageKey: string) => {
      notifier.notify(
        translocoService.translate(messageKey),
        'success',
        translocoService.translate('close')
      );
    };

    const showError = (messageKey: string = 'error_global') => {
      notifier.notify(
        translocoService.translate(messageKey),
        'error',
        translocoService.translate('close')
      );
      patchState(store, { isLoading: false });
    };

    return {
      loadSpots: rxMethod<{ data: SpotSearchParams }>(
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
      //       },
      //       error: () => patchState(store, { isLoading: false }),
      //     })
      //   )
      // ),
      getSpotById(iuo_id: string, onSuccess: (spot: Spot | null) => void, onError: () => void) {
        if (!iuo_id) {
          console.error('getSpotById: iuo_id is null or undefined', iuo_id);
          onError();
          return;
        }
                
        http
           .post<{ spotsListSingle?: Spot[] }>(`pet-friendly-spots/all/${iuo_id}`, { iuo_id })
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
              // A new random set replaces the old one (pull-to-refresh on mobile).
              patchState(store, { random: response.randomSpots });
            },
            error: () => showError(),
          });
      },
      suggestSpot(form: SuggestSpotPayload, onSuccess?: () => void, onError?: () => void) {
        http
          .post<unknown>('pet-friendly-spots/pending', form)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: () => {
              showSuccess('success_add');
              if (config.production) {
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
      /** `onSuccess` runs before the success message, e.g. to close the edit dialog. */
      updateSpot(form: any, onSuccess?: () => void) {
        http
          .post<unknown>('pet-friendly-spots/update', form)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: () => {
              this.loadInitialData();
              onSuccess?.();
              showSuccess('spot_updated_success');
            },
            error: () => showError(),
          });
      },
      /** `onSuccess` runs before the success message, e.g. to close the edit dialog. */
      updatePendingSpot(form: any, onSuccess?: () => void) {
        http
          .post<unknown>('pet-friendly-spots/update_pending', form)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: () => {
              onSuccess?.();
              showSuccess('spot_updated_success');
            },
            error: () => showError(),
          });
      },
      loadInitialData() {
        const data: SpotSearchParams = {
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
