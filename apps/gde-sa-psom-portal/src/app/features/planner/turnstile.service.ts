import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

/** The part of Cloudflare's `window.turnstile` the planner uses (explicit rendering). */
interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
      language?: string;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

type TurnstileWindow = Window & { turnstile?: TurnstileApi; gspTurnstileReady?: () => void };

/** Must be loaded from exactly this URL; proxying or caching it breaks Turnstile. */
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=gspTurnstileReady';

/**
 * Cloudflare Turnstile for the planner form. The script is added to the page
 * the first time the form needs it, so no other page loads it. Browser only:
 * call it from afterNextRender.
 */
@Injectable({ providedIn: 'root' })
export class TurnstileService {
  readonly #document = inject(DOCUMENT);
  #loading: Promise<TurnstileApi> | null = null;

  load(): Promise<TurnstileApi> {
    if (this.#loading) return this.#loading;

    const win = this.#document.defaultView as TurnstileWindow | null;
    if (!win) return Promise.reject(new Error('Turnstile needs a browser'));
    if (win.turnstile) return (this.#loading = Promise.resolve(win.turnstile));

    this.#loading = new Promise<TurnstileApi>((resolve, reject) => {
      win.gspTurnstileReady = () => (win.turnstile ? resolve(win.turnstile) : reject(new Error('Turnstile did not start')));
      const script = this.#document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        this.#loading = null;
        reject(new Error('Turnstile script failed to load'));
      };
      this.#document.head.appendChild(script);
    });
    return this.#loading;
  }

  /** Renders the widget; `onToken` gets each new token, and null when it expires or fails. */
  async render(container: HTMLElement, siteKey: string, onToken: (token: string | null) => void): Promise<string> {
    const turnstile = await this.load();
    return turnstile.render(container, {
      sitekey: siteKey,
      action: 'planner',
      language: 'sr',
      callback: (token) => onToken(token),
      'expired-callback': () => onToken(null),
      'error-callback': () => onToken(null),
    });
  }

  /** A token is good for one validation: get a fresh one after every submit. */
  reset(widgetId: string): void {
    (this.#document.defaultView as TurnstileWindow | null)?.turnstile?.reset(widgetId);
  }

  remove(widgetId: string): void {
    (this.#document.defaultView as TurnstileWindow | null)?.turnstile?.remove(widgetId);
  }
}
