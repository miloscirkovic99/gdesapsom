import { TestBed } from '@angular/core/testing';
import { NgcCookieConsentService, NgcStatusChangeEvent } from 'ngx-cookieconsent';
import { Subject } from 'rxjs';

import { ConsentService } from './consent.service';

describe('ConsentService', () => {
  let service: ConsentService;
  let statusChange$: Subject<NgcStatusChangeEvent>;
  let revokeChoice$: Subject<void>;
  let cookieConsent: { clearStatus: jest.Mock; open: jest.Mock };

  const setStatusCookie = (value: string | null) => {
    document.cookie = value
      ? `cookieconsent_status=${value};path=/`
      : 'cookieconsent_status=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
  };

  const configure = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: NgcCookieConsentService,
          useValue: {
            statusChange$: statusChange$.asObservable(),
            revokeChoice$: revokeChoice$.asObservable(),
            ...cookieConsent,
          },
        },
      ],
    });
    service = TestBed.inject(ConsentService);
    service.init();
  };

  beforeEach(() => {
    setStatusCookie(null);
    localStorage.setItem('analyticsAccepted', 'true');
    statusChange$ = new Subject();
    revokeChoice$ = new Subject();
    cookieConsent = { clearStatus: jest.fn(), open: jest.fn() };
  });

  it('denies analytics and marketing until the user answers', () => {
    configure();

    expect(service.state()).toEqual({ analytics: 'denied', marketing: 'denied' });
    expect(service.analyticsGranted()).toBe(false);
    expect(service.hasAnswered()).toBe(false);
  });

  it('grants analytics only for a stored explicit allow', () => {
    setStatusCookie('allow');
    configure();

    expect(service.analyticsGranted()).toBe(true);
    expect(service.state().marketing).toBe('denied');
  });

  it('keeps analytics denied for a stored deny', () => {
    setStatusCookie('deny');
    configure();

    expect(service.analyticsGranted()).toBe(false);
    expect(service.hasAnswered()).toBe(true);
  });

  it('treats a legacy "dismiss" as unanswered and asks again', () => {
    setStatusCookie('dismiss');
    configure();

    expect(service.analyticsGranted()).toBe(false);
    expect(service.hasAnswered()).toBe(false);
    expect(cookieConsent.clearStatus).toHaveBeenCalled();
    expect(cookieConsent.open).toHaveBeenCalled();
  });

  it('ignores and removes the legacy localStorage flag', () => {
    configure();

    expect(service.analyticsGranted()).toBe(false);
    expect(localStorage.getItem('analyticsAccepted')).toBeNull();
  });

  it('follows allow / deny answers from the banner', () => {
    configure();

    statusChange$.next({ status: 'allow', chosenBefore: false });
    expect(service.analyticsGranted()).toBe(true);

    statusChange$.next({ status: 'deny', chosenBefore: true });
    expect(service.analyticsGranted()).toBe(false);
    expect(service.hasAnswered()).toBe(true);
  });

  it('a dismiss from the banner never counts as consent', () => {
    configure();

    statusChange$.next({ status: 'dismiss', chosenBefore: false });

    expect(service.analyticsGranted()).toBe(false);
    expect(service.hasAnswered()).toBe(false);
  });

  it('drops consent when the choice is revoked', () => {
    setStatusCookie('allow');
    configure();

    revokeChoice$.next();

    expect(service.analyticsGranted()).toBe(false);
  });

  it('openPreferences clears the stored choice and re-opens the banner', () => {
    setStatusCookie('allow');
    configure();

    service.openPreferences();

    expect(cookieConsent.clearStatus).toHaveBeenCalled();
    expect(cookieConsent.open).toHaveBeenCalled();
    expect(service.analyticsGranted()).toBe(false);
  });
});
