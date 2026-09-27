import { HttpClient } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Subject, take, takeUntil } from 'rxjs';
import { Notifier } from '../platform/notifier';
import { City, Country, GardenType, SpotType, Township } from '../models/places.models';

// Define the initial state type
type SharedState = {
  townships: Township[];
  spotTypes: SpotType[];
  gardenTypes: GardenType[];
  city: City[];
  /** Countries (`drz`), from `countryandcities`. */
  state: Country[];
  townshipsByCity: Township[];
};

// Create the signal state
const initialSharedState: SharedState = {
  townships: [],
  gardenTypes: [],
  spotTypes: [],
  city:[],
  state:[],
  townshipsByCity:[]
};
const destroyed$ = new Subject<void>();

export const SharedStore = signalStore(
  { providedIn: 'root' },
  withState(initialSharedState),
  withComputed((store) => ({
    gardens: computed(() => store.gardenTypes()),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);
    const notifier = inject(Notifier);

    const handleError = (error: any) => {
      notifier.notify(
        'Oops... Something went wrong, please check your fields and try again',
        'error',
        'Close'
      );
    };
    return {
      getSpotTypes() {
        http
          .get<{ spotTypes: SpotType[] }>('pet-friendly-spots-types/list')
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
          .get<{ township: Township[] }>('township')
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
      getTownshipsByCity(id: number | string) {
        const url = `township/${id}`;
        http
          .post<{ township_by_city: Township[] }>(url, { grd_id: id })
          .pipe( takeUntil(destroyed$))
          .subscribe({
            next: (response) => {
              patchState(store, (state) => ({
                townshipsByCity: response.township_by_city,
              }));
            },
            error: handleError,
          });
      },
      getCityandState(){
        http
        .get<{ city: City[]; state: Country[] }>('countryandcities')
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
      addTownship(params: { ops_ime: string; grd_id: number }) {
        http
          .post<{ success: string }>('township', params)
          .pipe(take(1), takeUntil(destroyed$))
          .subscribe({
            next: (result) => {
              this.getTownships();
              notifier.notify(result.success, 'success', 'Close');
            },
            error: handleError,
          });
      },
      addCity(params: { drz_id: number; grd_ime: string }) {
        http
          .post<{ success: string }>('countryandcities', params)
          .pipe(take(1), takeUntil(destroyed$))
          .subscribe({
            next: (result) => {
              this.getCityandState();
              notifier.notify(result.success, 'success', 'Close');
            },
            error: handleError,
          });
      },
      getGardenTypes() {
        http
          .get<{ gardenTypes: GardenType[] }>('gardenTypes')
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
      // store.getGardenTypes();
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
