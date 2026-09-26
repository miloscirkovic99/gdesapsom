import { Preferences } from '@capacitor/preferences';
import { PreferencesSessionStore } from './preferences-session-store';

jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
}));

const prefs = Preferences as jest.Mocked<typeof Preferences>;

describe('PreferencesSessionStore', () => {
  beforeEach(() => jest.clearAllMocks());

  it('serves the sid from memory after load()', async () => {
    prefs.get.mockResolvedValue({ value: 'abc' });
    const store = new PreferencesSessionStore();

    expect(store.getSid()).toBeNull();
    await store.load();

    expect(prefs.get).toHaveBeenCalledWith({ key: 'sid' });
    expect(store.getSid()).toBe('abc');
  });

  it('writes through to Preferences and updates memory at once', () => {
    const store = new PreferencesSessionStore();

    store.setSid('xyz');
    expect(store.getSid()).toBe('xyz');
    expect(prefs.set).toHaveBeenCalledWith({ key: 'sid', value: 'xyz' });

    store.clear();
    expect(store.getSid()).toBeNull();
    expect(prefs.remove).toHaveBeenCalledWith({ key: 'sid' });
  });
});
