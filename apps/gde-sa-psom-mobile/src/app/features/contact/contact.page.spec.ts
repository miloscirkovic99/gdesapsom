import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular/nav-controller';
import { TranslocoService } from '@ngneat/transloco';
import { of, Subject, throwError } from 'rxjs';
import { Notifier } from '@gde/shared/data-access/core';
import { ExternalLinkService } from '../../core/platform/external-link.service';
import { ContactApi } from './contact.api';
import { ContactPage } from './contact.page';

// The template is replaced below; the Ionic and Capacitor modules only have to load.
jest.mock('@ionic/angular/ion-back-button', () => ({ IonBackButton: class {} }));
jest.mock('@ionic/angular/ion-button', () => ({ IonButton: class {} }));
jest.mock('@ionic/angular/ion-buttons', () => ({ IonButtons: class {} }));
jest.mock('@ionic/angular/ion-content', () => ({ IonContent: class {} }));
jest.mock('@ionic/angular/ion-header', () => ({ IonHeader: class {} }));
jest.mock('@ionic/angular/ion-icon', () => ({ IonIcon: class {} }));
jest.mock('@ionic/angular/ion-input', () => ({ IonInput: class {} }));
jest.mock('@ionic/angular/ion-spinner', () => ({ IonSpinner: class {} }));
jest.mock('@ionic/angular/ion-textarea', () => ({ IonTextarea: class {} }));
jest.mock('@ionic/angular/ion-title', () => ({ IonTitle: class {} }));
jest.mock('@ionic/angular/ion-toolbar', () => ({ IonToolbar: class {} }));
jest.mock('@ionic/angular/nav-controller', () => ({ NavController: class {} }));
jest.mock('ionicons', () => ({ addIcons: jest.fn() }));
jest.mock('ionicons/icons', () => ({ checkmark: '' }));
jest.mock('../../core/platform/external-link.service', () => ({ ExternalLinkService: class {} }));

describe('ContactPage', () => {
  let send: jest.Mock;
  let notify: jest.Mock;

  function create(): ContactPage {
    TestBed.configureTestingModule({
      providers: [
        { provide: ContactApi, useValue: { send } },
        { provide: Notifier, useValue: { notify } },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
        { provide: NavController, useValue: { navigateBack: jest.fn() } },
        { provide: ExternalLinkService, useValue: { openWeb: jest.fn() } },
      ],
    });
    TestBed.overrideComponent(ContactPage, { set: { template: '', imports: [] } });
    return TestBed.createComponent(ContactPage).componentInstance;
  }

  function fill(page: ContactPage, email = ' ime@gmail.com ', subject = 'Pitanje', message = 'Zdravo!'): void {
    page.form.setValue({ email, subject, message });
  }

  beforeEach(() => {
    jest.useFakeTimers();
    send = jest.fn();
    notify = jest.fn();
  });

  afterEach(() => jest.useRealTimers());

  it('sends nothing while a field is invalid, and shows the errors', () => {
    const page = create();
    fill(page, 'ime@gmail', '', 'Zdravo!');

    page.submit();

    expect(send).not.toHaveBeenCalled();
    expect(page.form.controls.email.touched).toBe(true);
    expect(page.errorKey('email')).toBe('mobile_contact_email_invalid');
    expect(page.errorKey('subject')).toBe('required');
  });

  it('sends the trimmed message and then shows where the reply goes', () => {
    send.mockReturnValue(of({}));
    const page = create();
    fill(page);

    page.submit();

    expect(send).toHaveBeenCalledWith({ from: 'ime@gmail.com', subject: 'Pitanje', message: 'Zdravo!' });
    expect(page.sending()).toBe(false);
    expect(page.sentTo()).toBe('ime@gmail.com');
    expect(page.form.getRawValue()).toEqual({ email: '', subject: '', message: '' });
  });

  it('sends once while a message is on its way', () => {
    const pending = new Subject<unknown>();
    send.mockReturnValue(pending);
    const page = create();
    fill(page);

    page.submit();
    page.submit();

    expect(send).toHaveBeenCalledTimes(1);
    expect(page.sending()).toBe(true);
  });

  it('keeps the message and reports a failure', () => {
    send.mockReturnValue(throwError(() => new Error('offline')));
    const page = create();
    fill(page);

    page.submit();

    expect(notify).toHaveBeenCalledWith('mobile_contact_error', 'error', 'close');
    expect(page.sending()).toBe(false);
    expect(page.sentTo()).toBeNull();
    expect(page.form.controls.message.value).toBe('Zdravo!');
  });

  it('opens an empty form again after a message went out', () => {
    send.mockReturnValue(of({}));
    const page = create();
    fill(page);
    page.submit();

    page.writeAnother();

    expect(page.sentTo()).toBeNull();
  });
});
