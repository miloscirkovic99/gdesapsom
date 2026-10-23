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

/** `localStorage`, or null while the build-time prerenderer runs (Node has none). */
const storage = (): Storage | null => (typeof localStorage === 'undefined' ? null : localStorage);

export class LocalStorageSessionStore extends SessionStore {
  getSid(): string | null {
    return storage()?.getItem(SID_KEY) ?? null;
  }

  setSid(sid: string): void {
    storage()?.setItem(SID_KEY, sid);
  }

  clear(): void {
    storage()?.removeItem(SID_KEY);
  }
}
