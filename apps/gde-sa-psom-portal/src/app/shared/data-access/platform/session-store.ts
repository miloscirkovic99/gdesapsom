import { Injectable } from '@angular/core';

const SID_KEY = 'sid';

/**
 * Holds the admin session id (`sid`) that `ApiPrefixInterceptor` appends to
 * every request. Reads must be synchronous because the interceptor runs per
 * request; an app with async storage keeps an in-memory copy.
 *
 * Defaults to `localStorage`, which is what the portal has always used.
 */
@Injectable({ providedIn: 'root', useFactory: () => new LocalStorageSessionStore() })
export abstract class SessionStore {
  abstract getSid(): string | null;
  abstract setSid(sid: string): void;
  abstract clear(): void;
}

export class LocalStorageSessionStore extends SessionStore {
  getSid(): string | null {
    return localStorage.getItem(SID_KEY);
  }

  setSid(sid: string): void {
    localStorage.setItem(SID_KEY, sid);
  }

  clear(): void {
    localStorage.removeItem(SID_KEY);
  }
}
