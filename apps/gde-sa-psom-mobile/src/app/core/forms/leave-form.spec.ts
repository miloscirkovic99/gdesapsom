import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AlertController } from '@ionic/angular/alert-controller';
import { NavController } from '@ionic/angular/nav-controller';
import { TranslocoService } from '@ngneat/transloco';
import { DiscardDialog, GuardedForm, leaveFormGuard } from './leave-form';

jest.mock('@ionic/angular/alert-controller', () => ({ AlertController: class {} }));
jest.mock('@ionic/angular/nav-controller', () => ({ NavController: class {} }));

describe('leaveFormGuard', () => {
  let role: string;
  let alerts: { create: jest.Mock };
  let nav: { navigateBack: jest.Mock; navigateForward: jest.Mock; navigateRoot: jest.Mock };
  let form: GuardedForm & { discard: jest.Mock };
  let dirty: boolean;

  beforeEach(() => {
    jest.useFakeTimers();
    role = 'cancel';
    dirty = true;
    alerts = {
      create: jest.fn(async () => ({
        present: jest.fn(),
        onDidDismiss: jest.fn(async () => ({ role })),
      })),
    };
    nav = {
      navigateBack: jest.fn().mockResolvedValue(true),
      navigateForward: jest.fn().mockResolvedValue(true),
      navigateRoot: jest.fn().mockResolvedValue(true),
    };
    form = {
      hasUnsavedInput: () => dirty,
      discard: jest.fn(() => (dirty = false)),
    };
    TestBed.configureTestingModule({
      providers: [
        DiscardDialog,
        { provide: AlertController, useValue: alerts },
        { provide: NavController, useValue: nav },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
      ],
    });
  });

  afterEach(() => jest.useRealTimers());

  function leaveTo(url: string): Promise<unknown> {
    const injector = TestBed.inject(EnvironmentInjector);
    return runInInjectionContext(injector, () =>
      Promise.resolve(
        leaveFormGuard(form, {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot, { url } as RouterStateSnapshot),
      ),
    );
  }

  it('lets an empty form go without asking', async () => {
    dirty = false;
    expect(await leaveTo('/tabs/home')).toBe(true);
    expect(alerts.create).not.toHaveBeenCalled();
  });

  it('stays when the user keeps editing', async () => {
    expect(await leaveTo('/tabs/more')).toBe(false);
    expect(form.discard).not.toHaveBeenCalled();
    expect(alerts.create).toHaveBeenCalledWith(expect.objectContaining({ header: 'mobile_leave_title' }));
  });

  it("asks the form's own question when it has one", async () => {
    Object.assign(form, { discardTitle: 'mobile_leave_message_title' });
    await leaveTo('/tabs/more');
    expect(alerts.create).toHaveBeenCalledWith(expect.objectContaining({ header: 'mobile_leave_message_title' }));
  });

  it('discards and goes back to More when the user agrees', async () => {
    role = 'destructive';
    expect(await leaveTo('/tabs/more')).toBe(true);
    expect(form.discard).toHaveBeenCalled();
    expect(nav.navigateBack).not.toHaveBeenCalled();
  });

  it('for another tab, takes the form off the More stack first and then opens the tab', async () => {
    role = 'destructive';
    expect(await leaveTo('/tabs/places/spots/41')).toBe(false);
    expect(form.discard).toHaveBeenCalled();

    await jest.runAllTimersAsync();
    expect(nav.navigateBack).toHaveBeenCalledWith('/tabs/more', { animated: false });
    expect(nav.navigateRoot).toHaveBeenCalledWith('/tabs/places/spots/41', { animated: false });
  });

  it('for another page of More, pushes it after leaving the form', async () => {
    role = 'destructive';
    expect(await leaveTo('/tabs/more/blog/saveti')).toBe(false);

    await jest.runAllTimersAsync();
    expect(nav.navigateForward).toHaveBeenCalledWith('/tabs/more/blog/saveti');
    expect(nav.navigateRoot).not.toHaveBeenCalled();
  });
});
