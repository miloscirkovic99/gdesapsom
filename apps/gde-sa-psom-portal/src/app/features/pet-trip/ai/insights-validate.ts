import { COST_CATEGORIES, type CostCategory } from '../domain/costs';
import type { Insights, InsightsRequest } from './insights.models';

/**
 * The browser's own check of the AI explanation before it is rendered. The
 * server runs the same rules (validateInsights in insights.POST.js); the
 * handler spec feeds both the same replies, so the two cannot drift apart
 * unnoticed. Anything that fails is dropped, and a failing summary drops the
 * whole explanation: the page then shows only the computed results.
 *
 * Checks: the expected shape and lengths, steps only for open items of this
 * report, known cost categories, no links, and no number that does not
 * appear in the request (a date or amount the model made up).
 */
const LIMITS = { steps: 8, savings: 4, summary: 700, text: 300, comparison: 500 };

const CATEGORIES: readonly CostCategory[] = COST_CATEGORIES;

const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|rs|eu|org|net|hr|hu|gov)\b)/i;

const digitRuns = (text: string): string[] => text.match(/\d+/g) ?? [];

const SR_2 = new Intl.NumberFormat('sr-Latn-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SR_0 = new Intl.NumberFormat('sr-Latn-RS', { maximumFractionDigits: 0 });

export function allowedNumbers(request: InsightsRequest): Set<string> {
  const allowed = new Set<string>(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  const visit = (value: unknown): void => {
    if (value === null || value === undefined) return;
    if (typeof value === 'number') {
      for (const shown of [String(value), value.toFixed(2), String(Math.round(value)), SR_2.format(value), SR_0.format(value)]) {
        for (const run of digitRuns(shown)) allowed.add(run);
      }
    } else if (typeof value === 'string') {
      for (const run of digitRuns(value)) {
        allowed.add(run);
        allowed.add(String(Number(run)));
      }
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach(visit);
    }
  };
  visit(request);
  return allowed;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const text = value.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text && text.length <= max ? text : null;
}

function safeText(value: unknown, max: number, allowed: Set<string>): string | null {
  const text = cleanText(value, max);
  if (!text || LINK.test(text)) return null;
  const unknownNumber = digitRuns(text).some((run) => !allowed.has(run) && !allowed.has(String(Number(run))));
  return unknownNumber ? null : text;
}

export function validateInsights(output: unknown, request: InsightsRequest): Insights | null {
  if (!output || typeof output !== 'object') return null;
  const raw = output as Record<string, unknown>;
  const allowed = allowedNumbers(request);
  const summary = safeText(raw['summary'], LIMITS.summary, allowed);
  if (!summary) return null;

  const open = new Set(request.readiness.items.filter((item) => item.status !== 'confirmed').map((item) => item.key));
  const steps: Insights['steps'] = [];
  for (const step of Array.isArray(raw['steps']) ? raw['steps'] : []) {
    if (steps.length >= LIMITS.steps || !step || typeof step !== 'object') continue;
    const id = (step as Record<string, unknown>)['requirementId'];
    const text = safeText((step as Record<string, unknown>)['text'], LIMITS.text, allowed);
    if (typeof id !== 'string' || !open.has(id) || steps.some((entry) => entry.requirementId === id) || !text) continue;
    steps.push({ requirementId: id, text });
  }

  const savings: Insights['savings'] = [];
  for (const tip of Array.isArray(raw['savings']) ? raw['savings'] : []) {
    if (savings.length >= LIMITS.savings || !tip || typeof tip !== 'object') continue;
    const category = (tip as Record<string, unknown>)['category'];
    const text = safeText((tip as Record<string, unknown>)['text'], LIMITS.text, allowed);
    if (typeof category === 'string' && CATEGORIES.includes(category as CostCategory) && text) {
      savings.push({ category: category as CostCategory, text });
    }
  }

  const comparisonText = raw['comparison'];
  const comparison =
    request.costs.scenarios.length > 1 && typeof comparisonText === 'string' && comparisonText.trim()
      ? (safeText(comparisonText, LIMITS.comparison, allowed) ?? '')
      : '';

  return { summary, steps, savings, comparison, aiGenerated: true };
}
