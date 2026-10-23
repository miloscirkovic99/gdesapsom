import { HttpClient } from '@angular/common/http';
import { TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { I18N_ASSETS_BASE_URL, TranslocoHttpLoader, translationStateKey } from './provide-app-transloco';
import { StaticTranslocoLoader } from './static-transloco-loader';

describe('translation loaders', () => {
  const get = jest.fn();

  beforeEach(() => {
    get.mockReset().mockReturnValue(of({ from: 'http' }));
    TestBed.configureTestingModule({
      providers: [
        TranslocoHttpLoader,
        StaticTranslocoLoader,
        { provide: HttpClient, useValue: { get } },
        { provide: I18N_ASSETS_BASE_URL, useValue: '' },
      ],
    });
  });

  it('the prerenderer serves the bundled file and leaves it in the page state', async () => {
    const translation = await firstValueFrom(TestBed.inject(StaticTranslocoLoader).getTranslation('rs'));

    expect(translation['skip_to_content']).toBeTruthy();
    expect(TestBed.inject(TransferState).get(translationStateKey('rs'), null)).toBe(translation);
  });

  it('the browser takes the prerendered translation once, without a request', async () => {
    TestBed.inject(TransferState).set(translationStateKey('rs'), { from: 'state' });
    const loader = TestBed.inject(TranslocoHttpLoader);

    expect(await firstValueFrom(loader.getTranslation('rs'))).toEqual({ from: 'state' });
    expect(get).not.toHaveBeenCalled();

    // A later load (language switched back) fetches the file as before.
    expect(await firstValueFrom(loader.getTranslation('rs'))).toEqual({ from: 'http' });
    expect(get).toHaveBeenCalledWith('/assets/i18n/rs.json');
  });

  it('a page without prerendered state loads over HTTP', async () => {
    expect(await firstValueFrom(TestBed.inject(TranslocoHttpLoader).getTranslation('en'))).toEqual({ from: 'http' });
    expect(get).toHaveBeenCalledWith('/assets/i18n/en.json');
  });
});
