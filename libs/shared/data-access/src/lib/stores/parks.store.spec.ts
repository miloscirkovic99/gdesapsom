import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@ngneat/transloco';
import { ContactFormService } from '../contact/contact-form.service';
import { Park } from '../models/places.models';
import { Notifier } from '../platform/notifier';
import { ParksStore } from './parks.store';

const park = (par_id: number, par_accepted = 1) => ({ par_id, par_ime: `Park ${par_id}`, par_accepted }) as Park;

describe('ParksStore', () => {
  let store: InstanceType<typeof ParksStore>;
  let httpMock: HttpTestingController;

  const answerList = (par_accepted: number, parks: Park[]) =>
    httpMock
      .expectOne((r) => r.url === 'pet-friendly-parks/list' && r.body.par_accepted === par_accepted)
      .flush({ petFriendlyParks: parks });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Notifier, useValue: { notify: jest.fn() } },
        { provide: ContactFormService, useValue: { sendEmail: jest.fn() } },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
      ],
    });
    store = TestBed.inject(ParksStore);
    httpMock = TestBed.inject(HttpTestingController);
    answerList(1, [park(1), park(2)]); // onInit
  });

  it('loads the public list on init', () => {
    expect(store.parks().map((p) => p.par_id)).toEqual([1, 2]);
    expect(store.parksStatus()).toBe('loaded');
  });

  it('replaces the public list on reload instead of appending', () => {
    store.petParks();
    answerList(1, [park(1), park(2), park(3)]);

    expect(store.parks().map((p) => p.par_id)).toEqual([1, 2, 3]);
  });

  it('keeps pending parks out of the public list', () => {
    store.petParks(0);
    answerList(0, [park(9, 0)]);
    store.petParks(0);
    answerList(0, [park(9, 0)]);

    expect(store.pendingParks().map((p) => p.par_id)).toEqual([9]);
    expect(store.parks().map((p) => p.par_id)).toEqual([1, 2]);
  });
});
