import { HttpClient } from '@angular/common/http';
import { inject, Injectable, isDevMode, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import {
  WINTER_DATA,
  WinterDestinationData,
  WinterSnapshot,
} from './winter-data';

/**
 * The winter data the pages show: the build-time snapshot first (what the
 * prerendered HTML and the hydration use), then, once the page is
 * interactive, the same data live from GET winter/destinations. A place
 * removed from the database disappears without waiting for the next build.
 *
 * The live answer replaces a destination only when it looks sane: a
 * destination that would lose more than half of at least four stays keeps
 * the snapshot (an API fault should not empty a page), and affiliate links
 * other than https are dropped.
 */
@Injectable({ providedIn: 'root' })
export class WinterLiveData {
  readonly #http = inject(HttpClient);
  readonly #snapshot = signal<WinterSnapshot>(inject(WINTER_DATA));
  #requested = false;

  readonly snapshot = this.#snapshot.asReadonly();

  /** Asks the API once per visit; call after hydration (afterNextRender). */
  refresh(): void {
    if (this.#requested) return;
    this.#requested = true;
    this.#http
      .get<unknown>('winter/destinations')
      .pipe(catchError(() => of(null)))
      .subscribe((body) => {
        const merged = mergeLive(this.#snapshot(), body);
        if (merged) this.#snapshot.set(merged);
        else if (isDevMode() && body !== null)
          console.warn('[winter] live data ignored: unexpected shape');
      });
  }
}

const isList = (value: unknown): value is unknown[] => Array.isArray(value);
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

function looksLikeDestination(value: unknown): value is WinterDestinationData {
  return (
    isObject(value) &&
    isList(value['stays']) &&
    isList(value['restaurants']) &&
    isList(value['trails']) &&
    isObject(value['gondola']) &&
    isObject(value['skiLifts']) &&
    (value['vet'] === null || isObject(value['vet'])) &&
    [...value['stays'], ...value['restaurants'], ...value['trails']].every(
      (item) =>
        isObject(item) &&
        typeof item['id'] === 'number' &&
        typeof item['name'] === 'string'
    )
  );
}

/** The snapshot with every destination the live answer can replace; null when nothing usable came back. */
export function mergeLive(
  current: WinterSnapshot,
  body: unknown
): WinterSnapshot | null {
  if (!isObject(body) || !isObject(body['destinations'])) return null;
  const live = body['destinations'];
  const destinations = { ...current.destinations };
  let changed = false;

  for (const slug of Object.keys(current.destinations)) {
    const next = live[slug];
    if (!looksLikeDestination(next)) continue;
    const before = current.destinations[slug].stays.length;
    if (before >= 4 && next.stays.length < before / 2) continue;
    destinations[slug] = {
      ...next,
      stays: next.stays.map((stay) => ({
        ...stay,
        affiliateUrl:
          typeof stay.affiliateUrl === 'string' &&
          /^https:\/\/[^\s"'<>]+$/.test(stay.affiliateUrl)
            ? stay.affiliateUrl
            : null,
      })),
    };
    changed = true;
  }
  if (!changed) return null;
  return {
    generatedAt:
      typeof body['generatedAt'] === 'string'
        ? body['generatedAt']
        : current.generatedAt,
    destinations,
  };
}
