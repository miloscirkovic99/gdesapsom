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

// Define the initial state type
type SharedState = {
  townships: any[];
  spotTypes: any;
  gardenTypes: any;
};

// Create the signal state
const initialSharedState = signalState<SharedState>({
  townships: [],
  gardenTypes: [],
  spotTypes: [],
});
const destroyed$ = new Subject<void>();

export const SharedStore = signalStore(
  { providedIn: 'root' },
  withState(initialSharedState),
  withComputed((store) => ({
    townships: computed(() => store.townships()),
    spotTypes: computed(() => store.spotTypes()),
    gardens: computed(() => store.gardenTypes()),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);

    return {
      getTownships() {
        http
          .get<any>('pet-friendly-spots-types/list')
          .pipe(take(1), takeUntil(destroyed$))
          .subscribe({
            next: (response) => {
              patchState(store, (state) => ({
                spotTypes: response.spotTypes,
              }));
            },
            error: (err) => {
              console.error(err);
            },
          });
      },
      getCountryAndCites(){
       http
      .get<any>('township')
      .pipe(take(1), takeUntil(destroyed$))
      .subscribe((response: any) => {
        patchState(store, (state) => ({
            townships: response.township,
          }));
       
      });
      },
      getGardenTypes(){
        http
        .get<any>('gardenTypes')
        .pipe(take(1), takeUntil(destroyed$))
        .subscribe((response: any) => {
          patchState(store, (state) => ({
              gardenTypes: response.gardenTypes,
            }));
       
        });
      }
    };
  }),
    withHooks({
      onInit(store) {
        store.getGardenTypes();
        store.getCountryAndCites();
        store.getTownships();
      },
      onDestroy(store) {
        destroyed$.next(); // Ensures cleanup of ongoing HTTP requests
        destroyed$.complete();
      },
    })
);
