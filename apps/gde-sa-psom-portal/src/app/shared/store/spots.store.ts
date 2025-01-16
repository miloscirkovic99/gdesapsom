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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { withStorageSync } from '@angular-architects/ngrx-toolkit';

// Define the initial state type
type SpotsState = {
  spotsList: any[];
  totalResult: number;
  limit: number;
  offset: number;
  isLoading: boolean;
};

// Create the signal state
const initialSpotsState = signalState<SpotsState>({
  spotsList: [],
  totalResult: 0,
  limit: 10,
  offset: 0,
  isLoading: false,
});

// Create the SignalStore with `withStorageSync`
export const SpotsStore = signalStore(
  { providedIn: 'root' },
  withState(initialSpotsState),
  withComputed((store) => ({
    spots: computed(() => store.spotsList()),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);
    return {
      loadMore() {
        patchState(store, { isLoading: true });

        const limit=store.limit()
        const offset=store.offset()
        http
          .post<any>('https://gdesapsom.com/api/v2/pet-friendly-spots/all', { limit, offset })
          .subscribe((response) => {
            patchState(store, (state) => ({
              
              spotsList: [...state.spotsList, ...response.spotsList], // Append new data
              totalResult: store.spotsList().length,
              offset: state.spotsList.length + response.spotsList.length, // Update offset
              isLoading: false,
            }));

            
          });
      },
    };
  }),
  withHooks({
    onInit(store) {
    store.loadMore()
    },
    onDestroy(store) {
      console.log('SpotsStore destroyed', store.spotsList());
    },
  }),
  // Synchronize state with localStorage
  // withStorageSync('spotsState')
);
