import { TestBed } from '@angular/core/testing';
import { LocalStorageSessionStore, SessionStore } from './session-store';

describe('SessionStore', () => {
  afterEach(() => localStorage.clear());

  it('defaults to the localStorage implementation', () => {
    expect(TestBed.inject(SessionStore)).toBeInstanceOf(LocalStorageSessionStore);
  });

  it('keeps the sid under the key the portal has always used', () => {
    const store = new LocalStorageSessionStore();
    expect(store.getSid()).toBeNull();

    store.setSid('abc');
    expect(localStorage.getItem('sid')).toBe('abc');
    expect(store.getSid()).toBe('abc');

    store.clear();
    expect(localStorage.getItem('sid')).toBeNull();
    expect(store.getSid()).toBeNull();
  });
});
