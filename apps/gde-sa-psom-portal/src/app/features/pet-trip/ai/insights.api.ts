import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../../../env/env.dev';
import type { InsightsRequest, InsightsResult, InsightsStatus, QuotaReason } from './insights.models';
import { validateInsights } from './insights-validate';

/**
 * Whether the page offers the AI explanation. Optional env key `petTripAi`
 * (the env files are gitignored, so older copies lack it): missing means off.
 * Turn it on only after the MARS handler, its tables and the API key are in
 * place (docs/pet-trip/README.md); until then the button would only ever
 * answer "nije dostupno".
 */
export const PET_TRIP_AI_ENABLED = new InjectionToken<boolean>('PET_TRIP_AI_ENABLED', {
  providedIn: 'root',
  factory: () => (environment as { petTripAi?: boolean }).petTripAi === true,
});

const STATUSES: readonly InsightsStatus[] = ['ok', 'cached', 'disabled', 'quota', 'busy', 'unavailable', 'invalid'];
const REASONS: readonly QuotaReason[] = ['device', 'network', 'global'];

/**
 * A random id for this browser, the key of the server's per-device limit. It
 * is created on the first click on "Objasni uz AI", never on page load, and
 * the server stores only a salted hash of it. "Počni ispočetka" leaves it:
 * clearing the draft must not reset the limit. Without storage (private
 * mode) every request gets a new id, and the per-network limit applies.
 */
export const DEVICE_ID_KEY = 'gsp_pet_trip_device';
const DEVICE_ID = /^[A-Za-z0-9_-]{16,64}$/;

function newDeviceId(): string {
  const random = globalThis.crypto;
  if (typeof random?.randomUUID === 'function') return random.randomUUID();
  const bytes = new Uint8Array(16);
  random.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function deviceId(): string {
  try {
    const saved = localStorage.getItem(DEVICE_ID_KEY);
    if (saved && DEVICE_ID.test(saved)) return saved;
    const created = newDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return newDeviceId();
  }
}

const count = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;

/**
 * POST pet-trip/insights. One call per click on "Objasni uz AI", never on its
 * own; the same facts within a visit are answered from memory, and the server
 * keeps its own cache. Every failure (handler not deployed: the SPA answers
 * with HTML; timeout; unknown reply) becomes a status, never an exception.
 */
@Injectable({ providedIn: 'root' })
export class PetTripInsightsApi {
  readonly #http = inject(HttpClient);
  readonly #memory = new Map<string, InsightsResult>();

  explain(request: InsightsRequest): Observable<InsightsResult> {
    const payload = JSON.stringify(request);
    const remembered = this.#memory.get(payload);
    if (remembered) return of(remembered);

    return this.#http.post<unknown>('pet-trip/insights', { payload, device: deviceId() }).pipe(
      map((body) => this.#read(body, request)),
      catchError(() => of<InsightsResult>({ status: 'unavailable', insights: null, remaining: null, limit: null, reason: null })),
      tap((result) => {
        if (result.insights) this.#memory.set(payload, result);
      }),
    );
  }

  #read(body: unknown, request: InsightsRequest): InsightsResult {
    const raw = (body ?? {}) as Record<string, unknown>;
    const status = STATUSES.includes(raw['status'] as InsightsStatus) ? (raw['status'] as InsightsStatus) : 'unavailable';
    const allowance = {
      remaining: count(raw['remaining']),
      limit: count(raw['limit']),
      reason: status === 'quota' && REASONS.includes(raw['reason'] as QuotaReason) ? (raw['reason'] as QuotaReason) : null,
    };
    if (status !== 'ok' && status !== 'cached') return { status, insights: null, ...allowance };
    const insights = validateInsights(raw['insights'], request);
    return insights ? { status, insights, ...allowance } : { status: 'invalid', insights: null, ...allowance };
  }
}
