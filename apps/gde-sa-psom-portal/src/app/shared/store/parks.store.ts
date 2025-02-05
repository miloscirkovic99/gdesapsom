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
import { DialogService } from '../../core/services/dialog.service';
import { TranslocoService } from '@ngneat/transloco';
import { ContactFormService } from '../components/contact-form/contact-form.service';

// Define the initial state type
type ParksState = {
  parks: any[];
  pendingParks: any[];
};

// Create the signal state
const initialParksState = signalState<ParksState>({
  parks: [],
  pendingParks: [],
});
const destroyed$ = new Subject<void>();
// Create the SignalStore with `withStorageSync`
export const ParksStore = signalStore(
  { providedIn: 'root' },
  withState(initialParksState),
  withComputed((store) => ({
    parks: computed(() => store.parks()),
    pendingParks: computed(() => store.pendingParks()),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);
    const dialogService = inject(DialogService);
    const translocoService = inject(TranslocoService);
    const snackbarService = inject(SnackbarService);
    const contactFormService=inject(ContactFormService)

    const handleError = (error: any) => {
      const translatedButton = translocoService.translate('close');

      snackbarService.openSnackbar(
        'Oops... Something went wrong, please check your fields and try again',
        translatedButton,
        'error-snackbar'
      );
    };
    return {
      petParks(par_accepted = 1) {
        http
          .post<any>('pet-friendly-parks/list', { par_accepted: par_accepted })
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (response) => {
              patchState(store, (state) => ({
                parks: [...state.parks, ...response.petFriendlyParks],
              }));

              if (par_accepted == 0) {
                patchState(store, (state) => ({
                  pendingParks: [
                    ...state.pendingParks,
                    ...response.petFriendlyParks,
                  ],
                }));
              }
            },
            error: handleError,
          });
      },
      updatePark(form: any) {

        http
          .put('pet-friendly-parks/create', form)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (result) => {
            },
            error: handleError,
          });
      },
      addPark(form: any) {
        http
          .post<any>('pet-friendly-parks/create', form)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: () => {
              dialogService.closeDialog();
              const translatedButton = translocoService.translate('close');
              const translatedMessage =
                translocoService.translate('success_add');
              snackbarService.openSnackbar(
                translatedMessage,
                translatedButton,
                'success-snackbar'
              );
              const data={
                email:'noreply@gdesapsom.com',
                subject:`Novi park ${form.par_ime}`,
                message:`${form.par_lokacija} ${form.par_ime}  check on: gdesapsom.com`
              }
              contactFormService.sendEmail(data)
            },
            error: handleError,
          });
      },
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
