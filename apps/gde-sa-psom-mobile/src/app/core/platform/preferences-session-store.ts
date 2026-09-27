import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { SessionStore } from '@gde/shared/data-access/core';

const SID_KEY = 'sid';

/**
 * `SessionStore` on Capacitor Preferences (SharedPreferences / UserDefaults),
 * which, unlike WebView localStorage, the OS does not clear under storage
 * pressure. The API interceptor reads the sid on every request, so reads come
 * from memory; `load()` fills it at startup (see app.config.ts).
 */
@Injectable({ providedIn: 'root' })
export class PreferencesSessionStore extends SessionStore {
  private sid: string | null = null;

  async load(): Promise<void> {
    this.sid = (await Preferences.get({ key: SID_KEY })).value;
  }

  getSid(): string | null {
    return this.sid;
  }

  setSid(sid: string): void {
    this.sid = sid;
    void Preferences.set({ key: SID_KEY, value: sid });
  }

  clear(): void {
    this.sid = null;
    void Preferences.remove({ key: SID_KEY });
  }
}
