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
import {
  catchError,
  debounceTime,
  finalize,
  map,
  of,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { SnackbarService } from '../../core/services/snackbar.service';
import { TranslocoService } from '@ngneat/transloco';
import { DialogService } from '../../core/services/dialog.service';

// Define the initial state type
type SpotsState = {
  spotsList: any[];
  totalResult: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  random: any[];
  allowed: any[];
  spotTypes: any[];
  spotsSearchResult: any[];
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
const destroyed$ = new Subject<void>();
// Create the SignalStore with `withStorageSync`
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
    const dialogService=inject(DialogService)
    const refreshAOS = () => setTimeout(() => AOS.refresh(), 500);

    const handleError = (error: any) => {
      console.error('Error loading data:', error);
      patchState(store, { isLoading: false });
    };

    return {
      loadData(
        ops_id?: any,
        ugo_id?: any,
        sta_id?: any,
        resetOffset: boolean = false
      ) {
        patchState(store, { isLoading: true });
        if (resetOffset) {
          patchState(store, { offset: 0, spotsList: [] });
        }
        const limit = store.limit();
        const offset = store.offset();

        http
          .post<any>('pet-friendly-spots/search-query', {
            ops_id,
            ugo_id,
            sta_id,
            offset,
            limit,
          })
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (response) => {
              patchState(store, (state) => ({
                spotsList: [...state?.spotsList, ...response?.spotsList],
                totalResult: response?.totalResults,
                offset: state.spotsList.length + response.spotsList.length,
                isLoading: false,
              }));
              refreshAOS();
            },
            error: (error) => {
              const translatedMessage =
                translocoService.translate('spots_error404');

              snackbarService.openSnackbar(translatedMessage, 'Close');

              patchState(store, { isLoading: false });
            },
          });
      },
      randomSpots() {
        http
          .get<any>('pet-friendly-spots/random')
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (response) => {
              patchState(store, (state) => ({
                random: [...state.random, ...response.randomSpots],
              }));
            },
            error: handleError,
          });
      },
     suggestSpot(form:any){
        http.post<any>('pet-friendly-spots/suggest',form.value).pipe(takeUntil(destroyed$)).subscribe(({
          next:(result)=>{
          console.log(result);
          form.reset();
          dialogService.closeDialog()
          },
          error:(err)=>{
            console.error(err);
            
          }
        }))
     },
      allowedPetTypes() {
        http
          .get<any>('allowed-pet-types')
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (response) => {
              patchState(store, (state) => ({
                allowed: response.allowed,
              }));
            },
            error: handleError,
          });
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadData();
      store.randomSpots();
      store.allowedPetTypes();
    },
    onDestroy(store) {
      destroyed$.next(); // Ensures cleanup of ongoing HTTP requests
      destroyed$.complete();
      console.log('SpotsStore destroyed', store.spotsList());
    },
  })
);
