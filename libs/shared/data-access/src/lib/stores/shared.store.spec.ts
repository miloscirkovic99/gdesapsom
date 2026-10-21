import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@ngneat/transloco';
import { Notifier } from '../platform/notifier';
import { SharedStore } from './shared.store';

describe('SharedStore', () => {
  it('reports a failed request in the active language', () => {
    const notify = jest.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Notifier, useValue: { notify } },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
      ],
    });
    TestBed.inject(SharedStore);
    const httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne('township').flush('x', { status: 500, statusText: 'Server Error' });
    httpMock.expectOne('pet-friendly-spots-types/list').flush({ spotTypes: [] });
    httpMock.expectOne('countryandcities').flush({ city: [], state: [] });

    expect(notify).toHaveBeenCalledWith('error_load', 'error', 'close');
    httpMock.verify();
  });
});
