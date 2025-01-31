import { HttpClient } from '@angular/common/http';
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
import { Subject, take, takeUntil } from 'rxjs';
import { SnackbarService } from '../../core/services/snackbar.service';

// Define the initial state type
type SharedState = {
  townships: any[];
  spotTypes: any;
  gardenTypes: any;
  city:any;
  state:any
};

// Create the signal state
const initialSharedState = signalState<SharedState>({
  townships: [],
  gardenTypes: [],
  spotTypes: [],
  city:[],
  state:[]
});
const destroyed$ = new Subject<void>();

export const SharedStore = signalStore(
  { providedIn: 'root' },
  withState(initialSharedState),
  withComputed((store) => ({
    townships: computed(() => store.townships()),
    spotTypes: computed(() => store.spotTypes()),
    gardens: computed(() => store.gardenTypes()),
    city:computed(() => store.city()),
    state:computed(() => store.state()),

  })),
  withMethods((store) => {
    const http = inject(HttpClient);
    const snackbarService = inject(SnackbarService);

    const handleError = (error: any) => {
      snackbarService.openSnackbar(
        'Oops... Something went wrong, please check your fields and try again',
        'Close',
        'error-snackbar'
      );
    };
    return {
      getSpotTypes() {
        http
          .get<any>('pet-friendly-spots-types/list')
          .pipe(take(1), takeUntil(destroyed$))
          .subscribe({
            next: (response) => {
              patchState(store, (state) => ({
                spotTypes: response.spotTypes,
              }));
            },
            error: handleError,
          });
      },

      getTownships() {
        http
          .get<any>('township')
          .pipe(take(1), takeUntil(destroyed$))
          .subscribe({
            next: (response) => {
              patchState(store, (state) => ({
                townships: response.township,
              }));
            },
            error: handleError,
          });
      },
      getCityandState(){
        http
        .get<any>('countryandcities')
        .pipe(take(1), takeUntil(destroyed$))
        .subscribe({
          next: (response) => {            
            patchState(store, (state) => ({
              city: response.city,
              state:response.state
            }));
          },
          error: handleError,
        });
      },
      addTownship(params: any) {
        http
          .post<any>('township', params)
          .pipe(take(1), takeUntil(destroyed$))
          .subscribe({
            next: (result: any) => {
              this.getTownships();
              snackbarService.openSnackbar(
                result.success,
                'Close',
                'success-snackbar'
              );
            },
            error: handleError,
          });
      },
      addCity(params: any) {
        http
          .post<any>('countryandcities', params)
          .pipe(take(1), takeUntil(destroyed$))
          .subscribe({
            next: (result: any) => {
              this.getCityandState();
              snackbarService.openSnackbar(
                result.success,
                'Close',
                'success-snackbar'
              );
            },
            error: handleError,
          });
      },
      getGardenTypes() {
        http
          .get<any>('gardenTypes')
          .pipe(take(1), takeUntil(destroyed$))
          .subscribe({
            next: (response) => {
              patchState(store, (state) => ({
                gardenTypes: response.gardenTypes,
              }));
            },
            error: handleError,
          });
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.getGardenTypes();
      store.getTownships();
      store.getSpotTypes();
      store.getCityandState()
    },
    onDestroy(store) {
      destroyed$.next(); // Ensures cleanup of ongoing HTTP requests
      destroyed$.complete();
    },
  })
);
