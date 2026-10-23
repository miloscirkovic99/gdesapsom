import type { Comparison } from '../domain/compare';
import type { CostBreakdown, CostScenario } from '../domain/costs';
import { daysBetween, type IsoDate } from '../domain/dates';
import type { Lang } from '../domain/lang';
import type { ReadinessReport } from '../domain/readiness';
import type { TripPlan } from '../domain/trip.models';
import type { InsightsRequest } from './insights.models';

/** The handler's limits (LIMITS in insights.POST.js); longer texts are cut here, not rejected there. */
const MAX_ITEMS = 30;
const MAX_TITLE = 160;
const MAX_DETAIL = 700;

function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/**
 * The facts the AI explanation is written from. Everything here is already on
 * the page; the request adds nothing the visitor has not seen.
 */
export function buildInsightsRequest(input: {
  trip: TripPlan;
  report: ReadinessReport;
  scenarios: readonly CostScenario[];
  breakdowns: readonly CostBreakdown[];
  comparison: Comparison;
  today: IsoDate;
  /** The page's language: the report texts are in it, and the explanation comes back in it. */
  lang: Lang;
}): InsightsRequest {
  const { trip, report, scenarios, breakdowns, comparison, today, lang } = input;
  const open = report.items.filter((item) => item.status !== 'confirmed');
  const done = report.items.filter((item) => item.status === 'confirmed');
  const items = [...open, ...done].slice(0, MAX_ITEMS);
  const base = breakdowns[0];

  return {
    v: 1,
    lang,
    trip: {
      destination: trip.destination,
      transport: trip.transport,
      nights: base?.nights ?? 0,
      travelers: trip.travelers,
      dogs: trip.dogs.length,
      daysUntilDeparture: trip.departureDate ? Math.max(-1, Math.min(1000, daysBetween(today, trip.departureDate))) : null,
    },
    readiness: {
      overall: report.overall,
      coverage: report.coverage,
      items: items.map((item) => ({
        key: item.key,
        status: item.status,
        title: clip(item.dogLabel ? `${item.title} (${item.dogLabel})` : item.title, MAX_TITLE),
        detail: clip(item.detail, MAX_DETAIL),
        from: item.window?.from ?? null,
        until: item.window?.until ?? null,
      })),
    },
    costs: {
      currency: base?.currency ?? 'EUR',
      scenarios: breakdowns.map((breakdown) => {
        const scenario = scenarios.find((entry) => entry.id === breakdown.scenarioId) as CostScenario;
        return {
          id: breakdown.scenarioId,
          destination: scenario.destination,
          transport: scenario.transport,
          nights: breakdown.nights,
          total: { ...breakdown.total },
          complete: breakdown.complete,
          unknown: [...breakdown.unknown],
          lines: breakdown.lines.map((line) => ({
            category: line.category,
            basis: line.basis,
            min: line.amount?.min ?? null,
            max: line.amount?.max ?? null,
          })),
        };
      }),
      comparison: { verdict: comparison.verdict, cheapestId: comparison.cheapestId },
    },
  };
}
