import { TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular/toast-controller';
import { ToastNotifier } from './toast-notifier';

jest.mock('@ionic/angular/toast-controller', () => ({ ToastController: class {} }));

describe('ToastNotifier', () => {
  let create: jest.Mock;
  let present: jest.Mock;

  beforeEach(() => {
    present = jest.fn();
    create = jest.fn().mockResolvedValue({ present });
    TestBed.configureTestingModule({
      providers: [ToastNotifier, { provide: ToastController, useValue: { create } }],
    });
  });

  it('shows successes in the success colour with the action as a dismiss button', async () => {
    TestBed.inject(ToastNotifier).notify('Sačuvano', 'success', 'Nazad');
    await Promise.resolve();

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Sačuvano',
        color: 'success',
        positionAnchor: 'app-tab-bar',
        buttons: [{ text: 'Nazad', role: 'cancel' }],
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
});
