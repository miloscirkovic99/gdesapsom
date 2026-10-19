import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { REQUEST_PROTECTION } from '@gde/shared/data-access/core';
import { catchError, Observable, throwError } from 'rxjs';
import { PlannerLimit, PlannerParams, PlannerResult, SwapTarget } from './planner.models';

/**
 * A plan request runs up to three AI providers in turn on the server, and
 * each one spends a quota slot and money: it is never repeated by the HTTP
 * layer, may take longer than the default 30 s, and a 429 (quota) is an
 * answer, not an outage.
 */
const SPENDING_REQUEST = () =>
  new HttpContext().set(REQUEST_PROTECTION, { retry: false, timeoutMs: 45000, rateLimitIsFailure: false });

/** What went wrong with a plan request, in the terms the page shows. */
export type PlannerFailure =
  | { kind: 'limit'; limit: PlannerLimit }
  | { kind: 'captcha' }
  | { kind: 'invalid' }
  | { kind: 'not_found' }
  | { kind: 'unavailable' };

function toFailure(error: unknown): PlannerFailure {
  if (!(error instanceof HttpErrorResponse)) return { kind: 'unavailable' };
  switch (error.status) {
    case 429:
      return { kind: 'limit', limit: { reason: error.error?.reason ?? 'device', next_at: error.error?.next_at ?? null, retry_after: error.error?.retry_after } };
    case 403:
      return { kind: 'captcha' };
    case 400:
      return { kind: 'invalid' };
    case 404:
      return { kind: 'not_found' };
    default:
      return { kind: 'unavailable' };
  }
}

/**
 * The planner endpoints (`/api/v2/planner…`). Requests carry credentials:
 * the API sets the `gsp_device` cookie that the weekly quota counts.
 */
@Injectable({ providedIn: 'root' })
export class PlannerApiService {
  readonly #http = inject(HttpClient);

  create(params: PlannerParams, turnstileToken: string): Observable<PlannerResult> {
    return this.#http
      .post<PlannerResult>('planner', { ...params, turnstile_token: turnstileToken }, { withCredentials: true, context: SPENDING_REQUEST() })
      .pipe(catchError((error) => throwError(() => toFailure(error))));
  }

  get(planId: string): Observable<PlannerResult> {
    return this.#http
      .get<PlannerResult>(`planner/plan/${encodeURIComponent(planId)}`, { withCredentials: true })
      .pipe(catchError((error) => throwError(() => toFailure(error))));
  }

  /** The same plan with one entry replaced; saved as a new plan, so the link changes. */
  swap(planId: string, target: SwapTarget): Observable<PlannerResult> {
    return this.#http
      .post<PlannerResult>('planner/swap', { plan_id: planId, ...target }, { withCredentials: true })
      .pipe(catchError((error) => throwError(() => toFailure(error))));
  }

  /** Plans this device has left this week, as the server counts them; sets no cookie. */
  quota(): Observable<{ remaining: number; next_at: string | null }> {
    return this.#http.get<{ remaining: number; next_at: string | null }>('planner/quota', { withCredentials: true });
  }

  /** A thumb (rating 1 / -1) for the plan, or an error report about one place. */
  feedback(body: { plan_id: string; rating?: 1 | -1; venue_id?: number; comment?: string }): Observable<unknown> {
    return this.#http.post('planner/feedback', body, { withCredentials: true });
  }
}
