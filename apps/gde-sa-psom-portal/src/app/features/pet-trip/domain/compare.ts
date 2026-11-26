import type { CostBreakdown, CostCategory } from './costs';
import { COST_MESSAGES } from './costs.messages';
import type { Lang } from './lang';
import type { MoneyRange } from './money';

/**
 * Side-by-side comparison of two or three scenarios. One is called cheapest
 * only when the inputs support it:
 * - every scenario has all of its essential costs (no lower-bound totals),
 *   except a shared cost missing in the same way everywhere;
 * - optional costs (food, activities, other) were entered for all of them or
 *   for none, so one is not cheaper just because a cost was left out;
 * - its whole range is below the next one's: overlapping estimates are a tie.
 */
export type ComparisonVerdict = 'single' | 'cheapest' | 'too-close' | 'not-comparable';

export interface ScenarioRef {
  id: string;
  label: string;
}

export interface Comparison {
  verdict: ComparisonVerdict;
  cheapestId: string | null;
  /** How much less the cheapest costs than the next one. */
  saving: MoneyRange | null;
  /** Why no scenario can be called cheapest. */
  blockers: string[];
  /** True but not blocking: different trip lengths, estimated amounts. */
  notes: string[];
}

const OPTIONAL: readonly CostCategory[] = ['food', 'activities', 'other'];

/**
 * Lines computed from the shared settings only (the vet's prices). When such a
 * line is the same in every scenario, missing parts of it are missing
 * everywhere by the same amount and cannot make one scenario look cheaper.
 */
const SHARED: readonly CostCategory[] = ['vet-prep'];

function isSameEverywhere(breakdowns: readonly CostBreakdown[], category: CostCategory): boolean {
  const lines = breakdowns.map((breakdown) => breakdown.lines.find((entry) => entry.category === category));
  const [first] = lines;
  return (
    !!first &&
    lines.every(
      (entry) =>
        !!entry &&
        entry.detail === first.detail &&
        entry.amount?.min === first.amount?.min &&
        entry.amount?.max === first.amount?.max &&
        !!entry.partial === !!first.partial,
    )
  );
}

const midpoint = (range: MoneyRange): number => (range.min + range.max) / 2;

export function compareScenarios(
  scenarios: readonly ScenarioRef[],
  breakdowns: readonly CostBreakdown[],
  lang: Lang,
): Comparison {
  const label = (id: string) => scenarios.find((scenario) => scenario.id === id)?.label ?? id;
  if (breakdowns.length < 2) {
    return { verdict: 'single', cheapestId: null, saving: null, blockers: [], notes: [] };
  }

  const { categories, compare: t } = COST_MESSAGES[lang];
  const blockers: string[] = [];
  const notes: string[] = [];
  const sameEverywhere = SHARED.filter((category) => isSameEverywhere(breakdowns, category));
  for (const breakdown of breakdowns) {
    const missing = breakdown.unknown.filter((category) => !sameEverywhere.includes(category));
    if (missing.length) {
      const names = missing.map((category) => categories[category].toLowerCase()).join(', ');
      blockers.push(t.missing(label(breakdown.scenarioId), names));
    }
  }
  for (const category of sameEverywhere) {
    if (breakdowns[0].unknown.includes(category)) notes.push(t.sharedMissing(categories[category]));
  }
  for (const category of OPTIONAL) {
    const entered = breakdowns.filter((breakdown) => hasAmount(breakdown, category));
    if (entered.length && entered.length < breakdowns.length) {
      blockers.push(t.optionalUneven(categories[category], entered.map((breakdown) => label(breakdown.scenarioId))));
    }
  }

  const nights = [...new Set(breakdowns.map((breakdown) => breakdown.nights))];
  if (nights.length > 1) notes.push(t.differentLengths(nights));
  if (breakdowns.some((breakdown) => breakdown.lines.some((entry) => entry.basis === 'estimate'))) {
    notes.push(t.estimates);
  }

  if (blockers.length) {
    return { verdict: 'not-comparable', cheapestId: null, saving: null, blockers, notes };
  }

  const ranked = [...breakdowns].sort((a, b) => midpoint(a.total) - midpoint(b.total));
  const [first, second] = ranked;
  if (first.total.max < second.total.min) {
    return {
      verdict: 'cheapest',
      cheapestId: first.scenarioId,
      saving: { min: second.total.min - first.total.max, max: second.total.max - first.total.min },
      blockers,
      notes,
    };
  }
  return { verdict: 'too-close', cheapestId: null, saving: null, blockers, notes };
}

function hasAmount(breakdown: CostBreakdown, category: CostCategory): boolean {
  return breakdown.lines.some((entry) => entry.category === category && entry.amount !== null);
}
