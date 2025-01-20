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


// Define the initial state type
type SpotsState = {
  spotsList: any[];
  totalResult: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  random:any;
  allowed:any;
  spotTypes:any;
};

// Create the signal state
const initialSpotsState = signalState<SpotsState>({
  spotsList: [],
  totalResult: 0,
  limit: 10,
  offset: 0,
  isLoading: false,
  random:[],
  allowed:[],
  spotTypes:[]
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
        http.post<any>(`pet-friendly-spots/paginated`, { limit, offset }).subscribe({
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
      search(ugo_id:any, ops_id:any,sta_id:any){
        patchState(store, { isLoading: true });

        const limit=store.limit()
        const offset=store.offset()
        http
          .post<any>(`pet-friendly-spots/search-query`, {ops_id,ugo_id,sta_id, limit, offset })
          .subscribe((response) => {
            patchState(store, (state) => ({
              
              spotsList: [...state.spotsList, ...response.spotsList], // Append new data
              totalResult: response?.totalResults,
              offset: state.spotsList.length + response.spotsList.length, // Update offset
              isLoading: false,
            }));

            
          });
      },
      randomSpots(){
        http.get<any>('pet-friendly-spots/random').subscribe((response)=>{
          patchState(store, (state) => ({
            isLoading: false,
            random:[...state.random,...response.randomSpots]
          }));
        })
      },
      allowedPetTypes(){
        http.get<any>('allowed-pet-types').subscribe((response)=>{
          console.log(response);
          
          patchState(store, (state) => ({
            isLoading: false,
            allowed:response.allowed
          }));
        })
      },
      spotTypes(){
        // http.get<any>('pet-friendly-spots-types/list').subscribe((response)=>{
        //   console.log(response);
          
        //   patchState(store, (state) => ({
        //     isLoading: false,
        //     spotTypes:response.spotTypes
        //   }));
        // })
      }
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
  }),
);
