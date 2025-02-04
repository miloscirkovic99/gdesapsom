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
import { Subject, takeUntil } from 'rxjs';
import { SnackbarService } from '../../core/services/snackbar.service';

// Define the initial state type
type ParksState = {
  parks: any[];
};

// Create the signal state
const initialParksState = signalState<ParksState>({
  parks: [],
});
const destroyed$ = new Subject<void>();
// Create the SignalStore with `withStorageSync`
export const ParksStore = signalStore(
  { providedIn: 'root' },
  withState(initialParksState),
  withComputed((store) => ({
    parks: computed(() => store.parks()),
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
      petParks() {
        http
          .get<any>('pet-friendly-parks/list')
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (response) => {
              patchState(store, (state) => ({
                parks: [...state.parks, ...response.petFriendlyParks],
              }));
            },
            error: handleError,
          });
      },
      addPark(form:any){
        http.post<any>('pet-friendly-parks/list',form.value).pipe(takeUntil(destroyed$)).subscribe(({
          next:()=>{
            snackbarService.openSnackbar(
              'You have successfully proposed a pet-friendly park.',
              'Close',
              'success-snackbar'
            );
          },
          error:handleError
        }))
      }
    };
  }),
  withHooks({
    onInit(store) {
      store.petParks();
    },
    onDestroy(store) {
      destroyed$.next(); // Ensures cleanup of ongoing HTTP requests
      destroyed$.complete();
    },
  })
);
