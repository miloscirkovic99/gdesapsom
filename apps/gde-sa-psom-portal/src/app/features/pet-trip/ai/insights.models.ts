import type { ComparisonVerdict } from '../domain/compare';
import type { CountryCode } from '../domain/countries';
import type { CostBasis, CostCategory } from '../domain/costs';
import type { IsoDate } from '../domain/dates';
import type { Lang } from '../domain/lang';
import type { Currency } from '../domain/money';
import type { ItemStatus, OverallReadiness } from '../domain/readiness';
import type { TransportMode } from '../domain/trip.models';

/**
 * What the browser sends to POST pet-trip/insights. Only enums, numbers, ids
 * and the site's own report texts: no city, date of birth, or anything the
 * visitor typed as free text. The server checks every field again
 * (apps/api/v2/pet-trip/insights.POST.js, validateRequest).
 */
export interface InsightsRequest {
  v: 1;
  /** Language of the report texts and of the explanation to write. */
  lang: Lang;
  trip: {
    destination: CountryCode;
    transport: TransportMode;
    nights: number;
    travelers: number;
    dogs: number;
    daysUntilDeparture: number | null;
  };
  readiness: {
    overall: OverallReadiness;
    coverage: 'full' | 'partial' | 'none';
    items: {
      key: string;
      status: ItemStatus;
      title: string;
      detail: string;
      from: IsoDate | null;
      until: IsoDate | null;
    }[];
  };
  costs: {
    currency: Currency;
    scenarios: {
      id: string;
      destination: CountryCode;
      transport: TransportMode;
      nights: number;
      total: { min: number; max: number };
      complete: boolean;
      unknown: CostCategory[];
      lines: { category: CostCategory; basis: CostBasis; min: number | null; max: number | null }[];
    }[];
    comparison: { verdict: ComparisonVerdict; cheapestId: string | null };
  };
}

/** The AI explanation as it may be shown: already checked against the request. */
export interface Insights {
  summary: string;
  steps: { requirementId: string; text: string }[];
  savings: { category: CostCategory; text: string }[];
  comparison: string;
  aiGenerated: true;
}

export type InsightsStatus = 'ok' | 'cached' | 'disabled' | 'quota' | 'busy' | 'unavailable' | 'invalid';

/** Which limit a `quota` answer hit: this device, this network today, or the whole site today. */
export type QuotaReason = 'device' | 'network' | 'global';

export interface InsightsResult {
  status: InsightsStatus;
  insights: Insights | null;
  /** Explanations this device has left; null where the server has no per-device limit (dev). */
  remaining: number | null;
  limit: number | null;
  reason: QuotaReason | null;
}
