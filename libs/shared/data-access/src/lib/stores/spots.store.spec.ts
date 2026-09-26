import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@ngneat/transloco';
import { APP_CONFIG } from '../config/app-config';
import { ContactFormService } from '../contact/contact-form.service';
import { Notifier } from '../platform/notifier';
import { SpotsStore } from './spots.store';

function setup({ production }: { production: boolean }) {
  const notifier = { notify: jest.fn() };
  const contactForm = { sendEmail: jest.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: APP_CONFIG, useValue: { apiUrl: 'https://api.test/', production, useCatalogMocks: false } },
      { provide: Notifier, useValue: notifier },
      { provide: ContactFormService, useValue: contactForm },
      // Keys come back untranslated, which is enough to assert on.
      { provide: TranslocoService, useValue: { translate: (key: string) => key } },
    ],
  });
  // Injecting the store fires its onInit requests; the tests only answer the ones they care about.
  const store = TestBed.inject(SpotsStore);
  const httpMock = TestBed.inject(HttpTestingController);
  return { store, httpMock, notifier, contactForm };
}

describe('SpotsStore', () => {
  describe('suggestSpot', () => {
    it('confirms, calls onSuccess and emails the admin in production', () => {
      const { store, httpMock, notifier, contactForm } = setup({ production: true });
      const onSuccess = jest.fn();

      store.suggestSpot({ iuo_ime: 'Kafić Test' }, onSuccess);
      httpMock.expectOne({ method: 'POST', url: 'pet-friendly-spots/pending' }).flush({});

      expect(notifier.notify).toHaveBeenCalledWith('success_add', 'success', 'close');
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(contactForm.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Novi objekat Kafić Test', showSnackbar: false }),
      );
    });

    it('does not email outside production', () => {
      const { store, httpMock, contactForm } = setup({ production: false });

      store.suggestSpot({ iuo_ime: 'Kafić Test' });
      httpMock.expectOne({ method: 'POST', url: 'pet-friendly-spots/pending' }).flush({});

      expect(contactForm.sendEmail).not.toHaveBeenCalled();
    });

    it('reports a failure and calls onError', () => {
      const { store, httpMock, notifier } = setup({ production: true });
      const onError = jest.fn();

      store.suggestSpot({ iuo_ime: 'X' }, undefined, onError);
      httpMock
        .expectOne({ method: 'POST', url: 'pet-friendly-spots/pending' })
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(notifier.notify).toHaveBeenCalledWith('error_global', 'error', 'close');
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSpot', () => {
    it('runs onSuccess (the admin closes its dialog there) before the success message', () => {
      const { store, httpMock, notifier } = setup({ production: false });
      const calls: string[] = [];
      notifier.notify.mockImplementation(() => calls.push('notify'));

      store.updateSpot({ iuo_id: 1 }, () => calls.push('onSuccess'));
      httpMock.expectOne({ method: 'POST', url: 'pet-friendly-spots/update' }).flush({});

      expect(calls).toEqual(['onSuccess', 'notify']);
      expect(notifier.notify).toHaveBeenCalledWith('spot_updated_success', 'success', 'close');
    });
  });
});
