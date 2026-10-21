import { TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular/toast-controller';
import { TranslocoService } from '@ngneat/transloco';
import { ToastNotifier } from './toast-notifier';

jest.mock('@ionic/angular/toast-controller', () => ({ ToastController: class {} }));

describe('ToastNotifier', () => {
  let create: jest.Mock;
  let present: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    present = jest.fn();
    create = jest.fn().mockResolvedValue({ present });
    TestBed.configureTestingModule({
      providers: [
        ToastNotifier,
        { provide: ToastController, useValue: { create } },
        { provide: TranslocoService, useValue: { translate: (key: string) => (key === 'close_sheet' ? 'Zatvori' : key) } },
      ],
    });
  });

  afterEach(() => jest.useRealTimers());

  it('shows successes in the success colour with a Close button whatever the action text', async () => {
    TestBed.inject(ToastNotifier).notify('Sačuvano', 'success', 'Nazad');
    await Promise.resolve();

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Sačuvano',
        color: 'success',
        positionAnchor: 'app-tab-bar',
        buttons: [{ text: 'Zatvori', role: 'cancel' }],
      }),
    );
    expect(present).toHaveBeenCalled();
  });

  it('shows errors in the danger colour, longer, without a button when there is no action', async () => {
    TestBed.inject(ToastNotifier).notify('Greška', 'error');
    await Promise.resolve();

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'danger', duration: 4000, buttons: [] }),
    );
  });

  it('shows the same message once when several calls fail together, and again later', () => {
    const notifier = TestBed.inject(ToastNotifier);

    notifier.notify('Učitavanje nije uspelo.', 'error', 'Nazad');
    notifier.notify('Učitavanje nije uspelo.', 'error', 'Nazad');
    notifier.notify('Drugačija poruka', 'error', 'Nazad');
    expect(create).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(5000);
    notifier.notify('Drugačija poruka', 'error', 'Nazad');
    expect(create).toHaveBeenCalledTimes(3);
  });
});
