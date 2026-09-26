import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Subject, take, takeUntil } from 'rxjs';
import { TranslocoService } from '@ngneat/transloco';
import { ContactFormService } from '../contact/contact-form.service';
import { Notifier } from '../platform/notifier';
import { Park, SuggestParkPayload } from '../models/places.models';

// Define the initial state type
type ParksState = {
  parks: Park[];
  pendingParks: Park[];
  /** Load state of the public (accepted) list; the admin pending list is not tracked. */
  parksStatus: 'idle' | 'loading' | 'loaded' | 'error';
};

// Create the signal state
const initialParksState: ParksState = {
  parks: [],
  pendingParks: [],
  parksStatus: 'idle',
};
const destroyed$ = new Subject<void>();
// Create the SignalStore with `withStorageSync`
export const ParksStore = signalStore(
  { providedIn: 'root' },
  withState(initialParksState),
  withMethods((store) => {
    const http = inject(HttpClient);
    const translocoService = inject(TranslocoService);
    const notifier = inject(Notifier);
    const contactFormService=inject(ContactFormService)

    const handleError = (error: any) => {
      const translatedButton = translocoService.translate('close');

      notifier.notify(
        'Oops... Something went wrong, please check your fields and try again',
        'error',
        translatedButton
      );
    };
    return {
      petParks(par_accepted = 1) {
        const isPublicList = par_accepted == 1;
        if (isPublicList) patchState(store, { parksStatus: 'loading' });
        http
          .post<{ petFriendlyParks: Park[] }>('pet-friendly-parks/list', { par_accepted: par_accepted })
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (response) => {
              // Each call returns the whole list, so it replaces what is there:
              // reloading (retry, pull-to-refresh, revisiting the admin page)
              // must not duplicate rows, and pending parks never belong in `parks`.
              if (isPublicList) {
                patchState(store, { parks: response.petFriendlyParks, parksStatus: 'loaded' });
              } else {
                patchState(store, { pendingParks: response.petFriendlyParks });
              }
            },
            error: (error) => {
              if (isPublicList) patchState(store, { parksStatus: 'error' });
              handleError(error);
            },
          });
      },
      /** Admin: accept or decline a suggested park. */
      updatePark(form: { par_id: number; par_accepted: 0 | 1; par_declined?: 0 | 1 }) {

        http
          .put('pet-friendly-parks/create', form)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: (result) => {
            },
            error: handleError,
          });
      },
      addPark(form: SuggestParkPayload) {
        http
          .post<unknown>('pet-friendly-parks/create', form)
          .pipe(takeUntil(destroyed$))
          .subscribe({
            next: () => {
              const translatedButton = translocoService.translate('close');
              const translatedMessage =
                translocoService.translate('success_add');
              notifier.notify(translatedMessage, 'success', translatedButton);
              const data={
                from: 'noreply@gdesapsom.com',
                subject: `Novi park ${form.par_ime}`,
                message: `${form.par_lokacija} ${form.par_ime}  check on: gdesapsom.com`,
                showSnackbar: false,
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
