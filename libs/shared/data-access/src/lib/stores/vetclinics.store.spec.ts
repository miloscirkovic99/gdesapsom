import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { TranslocoService } from '@ngneat/transloco';
import { Notifier } from '../platform/notifier';
import { VetClinicsStore } from './vetclinics.store';

describe('VetClinicsStore', () => {
  it('debounces searches so only the settled one reaches the API', fakeAsync(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Notifier, useValue: { notify: jest.fn() } },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
      ],
    });
    const store = TestBed.inject(VetClinicsStore);
    const httpMock = TestBed.inject(HttpTestingController);
    tick(300);
    httpMock.expectOne('veterinary-clinics/list').flush({ vetClinics: [], totalResults: 0, totalCount: 1 });

    store.loadVetclinics({ data: { word: 'v', resetOffset: true } });
    tick(100);
    store.loadVetclinics({ data: { word: 've', resetOffset: true } });
    tick(100);
    store.loadVetclinics({ data: { word: 'vet', resetOffset: true } });
    tick(300);

    const req = httpMock.expectOne('veterinary-clinics/list');
    expect(req.request.body.word).toBe('vet');
    req.flush({ vetClinics: [], totalResults: 0, totalCount: 1 });
    httpMock.verify();
  }));
});
