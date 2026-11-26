import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { environment } from '../../../../env/env.dev';
import type { IsoDate } from '../../pet-trip/domain/dates';
import type { Lang } from '../../pet-trip/domain/lang';
import { deviceId } from '../../../shared/utils/device-id';
import type { AiParseRequest, AiParseResult, AiQuotaReason, AiStatus } from './assistant-ai.models';
import { validateAiIntent } from './assistant-ai.validate';

/**
 * Whether the assistant may ask the AI about messages it cannot read on its
 * own. Optional env key `assistantAi` (the env files are gitignored, so
 * older copies lack it): missing means off, and the assistant works with its
 * own reading only. Turn it on once the MARS handler, its tables and the
 * settings are in place (docs/assistant/README.md).
 */
export const ASSISTANT_AI_ENABLED = new InjectionToken<boolean>('ASSISTANT_AI_ENABLED', {
  providedIn: 'root',
  factory: () => (environment as { assistantAi?: boolean }).assistantAi === true,
});

const STATUSES: readonly AiStatus[] = ['ok', 'cached', 'disabled', 'quota', 'busy', 'unavailable', 'invalid'];
const REASONS: readonly AiQuotaReason[] = ['device', 'network', 'global'];

const count = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;

/**
 * POST assistant/parse: the AI turns one message into search filters. Called
 * only for messages the assistant's own reading did not understand; the
 * same message is answered from memory within a visit, and the server keeps
 * its own cache. After "disabled" or a used-up device limit it stops asking
 * for the rest of the visit. Every failure (handler not deployed: the SPA
 * answers with HTML; timeout; unknown reply) is a status, never an exception.
 */
@Injectable({ providedIn: 'root' })
export class AssistantAiApi {
  readonly #http = inject(HttpClient);
  readonly #enabled = inject(ASSISTANT_AI_ENABLED);
  readonly #memory = new Map<string, AiParseResult>();
  #off = false;

  /** False once the server said no for this visit, or when the site has the AI switched off. */
  get available(): boolean {
    return this.#enabled && !this.#off;
  }

  async parse(message: string, lang: Lang, today: IsoDate): Promise<AiParseResult> {
    const request: AiParseRequest = { v: 1, lang, today, message };
    const payload = JSON.stringify(request);
    const remembered = this.#memory.get(payload);
    if (remembered) return remembered;
    if (!this.available) return { status: 'disabled', intent: null, remaining: null, reason: null };

    const result = await firstValueFrom(
      this.#http.post<unknown>('assistant/parse', { payload, device: deviceId() }).pipe(
        map((body) => this.#read(body, today)),
        catchError(() => of<AiParseResult>({ status: 'unavailable', intent: null, remaining: null, reason: null })),
      ),
    );
    if (result.intent) this.#memory.set(payload, result);
    if (result.status === 'disabled' || (result.status === 'quota' && result.reason !== 'global') || result.remaining === 0) {
      this.#off = true;
    }
    return result;
  }

  #read(body: unknown, today: IsoDate): AiParseResult {
    const raw = (body ?? {}) as Record<string, unknown>;
    const status = STATUSES.includes(raw['status'] as AiStatus) ? (raw['status'] as AiStatus) : 'unavailable';
    const remaining = count(raw['remaining']);
    const reason = status === 'quota' && REASONS.includes(raw['reason'] as AiQuotaReason) ? (raw['reason'] as AiQuotaReason) : null;
    if (status !== 'ok' && status !== 'cached') return { status, intent: null, remaining, reason };
    const intent = validateAiIntent(raw['intent'], today);
    return intent ? { status, intent, remaining, reason } : { status: 'invalid', intent: null, remaining, reason };
  }
}
