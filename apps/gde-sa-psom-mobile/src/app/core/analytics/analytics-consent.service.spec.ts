import { TestBed } from '@angular/core/testing';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { AnalyticsConsentService } from './analytics-consent.service';

jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: jest.fn() } }));
jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn() },
}));
jest.mock('@capacitor-firebase/analytics', () => ({
  FirebaseAnalytics: {
    setConsent: jest.fn(),
    setEnabled: jest.fn(),
    resetAnalyticsData: jest.fn(),
  },
  ConsentType: { AnalyticsStorage: 'ANALYTICS_STORAGE' },
  ConsentStatus: { Granted: 'GRANTED', Denied: 'DENIED' },
}));

const prefs = Preferences as jest.Mocked<typeof Preferences>;
const firebase = FirebaseAnalytics as jest.Mocked<typeof FirebaseAnalytics>;
const isNative = Capacitor.isNativePlatform as jest.Mock;

function setup(saved: string | null, native = true): AnalyticsConsentService {
  prefs.get.mockResolvedValue({ value: saved });
  isNative.mockReturnValue(native);
  TestBed.configureTestingModule({});
  return TestBed.inject(AnalyticsConsentService);
}

describe('AnalyticsConsentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firebase.setConsent.mockResolvedValue();
    firebase.setEnabled.mockResolvedValue();
    firebase.resetAnalyticsData.mockResolvedValue();
  });

  it('treats a first launch as no answer and keeps collection off', async () => {
    const consent = setup(null);

    await consent.load();

    expect(consent.consent()).toBeNull();
    expect(consent.granted()).toBe(false);
    expect(firebase.setConsent).toHaveBeenCalledWith({ type: 'ANALYTICS_STORAGE', status: 'DENIED' });
    expect(firebase.setEnabled).toHaveBeenCalledWith({ enabled: false });
    expect(firebase.resetAnalyticsData).not.toHaveBeenCalled();
  });

  it('re-applies a saved yes on every launch', async () => {
    const consent = setup('granted');

    await consent.load();

    expect(consent.granted()).toBe(true);
    expect(firebase.setConsent).toHaveBeenCalledWith({ type: 'ANALYTICS_STORAGE', status: 'GRANTED' });
    expect(firebase.setEnabled).toHaveBeenCalledWith({ enabled: true });
  });

  it('ignores an unknown saved value', async () => {
    const consent = setup('maybe');

    await consent.load();

    expect(consent.consent()).toBeNull();
    expect(firebase.setEnabled).toHaveBeenCalledWith({ enabled: false });
  });

  it('saves a yes and switches collection on', async () => {
    const consent = setup(null);
    await consent.load();
    jest.clearAllMocks();

    await consent.set('granted');

    expect(consent.granted()).toBe(true);
    expect(prefs.set).toHaveBeenCalledWith({ key: 'analyticsConsent', value: 'granted' });
    expect(firebase.setEnabled).toHaveBeenCalledWith({ enabled: true });
    expect(firebase.resetAnalyticsData).not.toHaveBeenCalled();
  });

  it('deletes the on-device analytics data when a yes is withdrawn', async () => {
    const consent = setup('granted');
    await consent.load();
    jest.clearAllMocks();

    await consent.set('denied');

    expect(consent.granted()).toBe(false);
    expect(prefs.set).toHaveBeenCalledWith({ key: 'analyticsConsent', value: 'denied' });
    expect(firebase.setConsent).toHaveBeenCalledWith({ type: 'ANALYTICS_STORAGE', status: 'DENIED' });
    expect(firebase.setEnabled).toHaveBeenCalledWith({ enabled: false });
    expect(firebase.resetAnalyticsData).toHaveBeenCalled();
  });

  it('has nothing to delete when the first answer is no', async () => {
    const consent = setup(null);
    await consent.load();

    await consent.set('denied');

    expect(firebase.resetAnalyticsData).not.toHaveBeenCalled();
  });

  it('never touches Firebase in a browser', async () => {
    const consent = setup('granted', false);

    await consent.load();
    await consent.set('denied');

    expect(firebase.setConsent).not.toHaveBeenCalled();
    expect(firebase.setEnabled).not.toHaveBeenCalled();
    expect(firebase.resetAnalyticsData).not.toHaveBeenCalled();
  });

  it('keeps the answer when Firebase is not configured', async () => {
    const consent = setup(null);
    firebase.setConsent.mockRejectedValue(new Error('Missing google_app_id'));

    await expect(consent.set('granted')).resolves.toBeUndefined();
    expect(consent.granted()).toBe(true);
  });
});
