import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../../../env/env.dev';
import type { InsightsRequest, InsightsResult, InsightsStatus, QuotaReason } from './insights.models';
import { validateInsights } from './insights-validate';
import { DEVICE_ID_KEY, deviceId } from '../../../shared/utils/device-id';

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
 * The browser's random id (shared/utils/device-id.ts), created on the first
 * click on "Objasni uz AI". "Počni ispočetka" leaves it: clearing the draft
 * must not reset the limit.
 */
export { DEVICE_ID_KEY, deviceId };

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
