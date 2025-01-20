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
import { debounceTime, switchMap, take } from 'rxjs';

// Define the initial state type
type SpotsState = {
  spotsList: any[];
  totalResult: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  random: any;
  allowed: any;
  spotTypes: any;
  spotsSearchResult: any;
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

        const limit = store.limit();
        const offset = store.offset();
        http
          .post<any>(`pet-friendly-spots/paginated`, { limit, offset })
          .subscribe({
            next: (response) => {
              patchState(store, (state) => ({
                spotsList: [...state.spotsList, ...response.spotsList],
                totalResult: response?.totalResults,
                offset: state.spotsList.length + response.spotsList.length,
                isLoading: false,
              }));
              setTimeout(() => {
                AOS.refresh(); // Refresh AOS for new elements
              }, 500);
            },
            error: (error) => {
              console.error('Error loading data:', error);
              patchState(store, { isLoading: false }); // Stop loading indicator
            },
          });
      },
      searchByFilters(ops_id: any, ugo_id: any, sta_id: any) {
        patchState(store, { isLoading: true });
     

         http
           .post<any>(`pet-friendly-spots/search-query`, {
             ops_id,
             ugo_id,
             sta_id,
           })
           .subscribe((response) => { 
             patchState(store, (state) => ({
               spotsList: response.spotsList,
               totalResult: response.totalResults,
               isLoading: false,
             }));
             setTimeout(() => {
               AOS.refresh(); // Refresh AOS for new elements
             }, 500);
           });
      },
      searchByName(name:string){
        patchState(store, { isLoading: true });
        // .pipe(
        //   debounceTime(300), // Add a debounce of 300ms
        //   switchMap((name) =>
        // http.put<any>('pet-friendly-spots/search-query',{name}).pipe(debounceTime(300),switchMap((name)=>))
      },
      randomSpots() {
        http.get<any>('pet-friendly-spots/random').subscribe((response) => {
          patchState(store, (state) => ({
            isLoading: false,
            random: [...state.random, ...response.randomSpots],
          }));
        });
      },
      allowedPetTypes() {
        http.get<any>('allowed-pet-types').subscribe((response) => {

          patchState(store, (state) => ({
            isLoading: false,
            allowed: response.allowed,
          }));
        });
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadMore();
      store.randomSpots();
      store.allowedPetTypes();
    },
    onDestroy(store) {
      console.log('SpotsStore destroyed', store.spotsList());
    },
  })
);
