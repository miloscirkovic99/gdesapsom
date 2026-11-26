import { addDays, addMonths, isIsoDate, type IsoDate } from '../../pet-trip/domain/dates';
import { MAX_DOGS } from '../../pet-trip/domain/trip.models';
import { numberOf } from './text';
import { DOG_NOUNS } from './vocabulary';

/**
 * Dates, trip length and number of dogs, as a message writes them:
 * "20.12.", "20. decembra", "od 10. do 20. jula", "za dve nedelje",
 * "sutra", "ovog vikenda", "nedelju dana", "sa 2 psa", "on 20 December".
 *
 * A date without a year is the next such day from today. Only dates that
 * exist and are not in the past come back; anything unclear stays null, for
 * the AI or the planner to fill in.
 */
export interface TripFacts {
  departureDate: IsoDate | null;
  returnDate: IsoDate | null;
  nights: number | null;
  dogs: number | null;
}

/**
 * Per month: Serbian stems that take a case ending ("decembra", "maju") and
 * English names and abbreviations, which are matched exactly.
 */
const MONTHS: readonly { stem: string; exact: readonly string[] }[] = [
  { stem: 'januar', exact: ['january', 'jan'] },
  { stem: 'februar', exact: ['february', 'feb'] },
  { stem: 'mart', exact: ['march', 'mar'] },
  { stem: 'april', exact: ['apr'] },
  { stem: 'maj', exact: ['may'] },
  { stem: 'jun', exact: ['june'] },
  { stem: 'jul', exact: ['july'] },
  { stem: 'avgust', exact: ['august', 'aug', 'avg'] },
  { stem: 'septemb', exact: ['september', 'sep', 'sept'] },
  { stem: 'oktob', exact: ['october', 'oct', 'okt'] },
  { stem: 'novemb', exact: ['november', 'nov'] },
  { stem: 'decemb', exact: ['december', 'dec'] },
];

/** Month number (1-12) of a folded word: "decembra" → 12, "jula" → 7, "may" → 5. */
export function monthOf(token: string): number | null {
  for (let index = 0; index < MONTHS.length; index++) {
    const { stem, exact } = MONTHS[index];
    if (exact.includes(token)) return index + 1;
    // "jula", "maju" but not "junak"; "septembra", "decembar".
    const extra = token.length - stem.length;
    if (token.startsWith(stem) && extra >= 0 && extra <= (stem.length <= 3 ? 1 : 2)) return index + 1;
  }
  return null;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** The date, or the same day a year later when it is already past; null when it does not exist or is past. */
function nextDate(day: number, month: number, year: number | null, today: IsoDate): IsoDate | null {
  const thisYear = Number(today.slice(0, 4));
  const fullYear = year === null ? thisYear : year < 100 ? 2000 + year : year;
  let date = `${fullYear}-${pad(month)}-${pad(day)}`;
  if (!isIsoDate(date)) return null;
  if (year === null && date < today) {
    date = `${fullYear + 1}-${pad(month)}-${pad(day)}`;
    if (!isIsoDate(date)) return null;
  }
  return date < today ? null : date;
}

/** Day of the week, 0 = Sunday. */
function weekday(date: IsoDate): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** The coming Saturday, or today on a Saturday. */
function nextSaturday(today: IsoDate): IsoDate {
  return addDays(today, (6 - weekday(today) + 7) % 7);
}

/** Absolute dates in the order they appear: "20.12.", "20/12/2026", "20. decembra", "December 20". */
function absoluteDates(text: string, today: IsoDate): IsoDate[] {
  const found: { at: number; date: IsoDate }[] = [];
  const add = (at: number, date: IsoDate | null) => {
    if (date) found.push({ at, date });
  };

  // 20.12. / 20.12.2026 / 20/12 — not 20:30, not 7.5 kg, not a phone number.
  for (const match of text.matchAll(/(?<![\d.,])(\d{1,2})\s?[./-]\s?(\d{1,2})(?:\s?[./-]\s?(\d{4}|\d{2}))?(?![\d,])(?!\s*(?:(?:kg|km|m|h|g|l|e|eur|din)\b|%))/g)) {
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) add(match.index ?? 0, nextDate(Number(match[1]), month, match[3] ? Number(match[3]) : null, today));
  }
  // 20. decembra (2026) / 20 dec / 20th of December
  for (const match of text.matchAll(/(?<![\d.])(\d{1,2})\s*(?:\.|st|nd|rd|th)?\s*(?:of\s+)?([a-z]{3,})\.?(?:\s+(\d{4}))?/g)) {
    const month = monthOf(match[2]);
    if (month) add(match.index ?? 0, nextDate(Number(match[1]), month, match[3] ? Number(match[3]) : null, today));
  }
  // December 20 (2026)
  for (const match of text.matchAll(/\b([a-z]{3,})\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?(?![\d.])/g)) {
    const month = monthOf(match[1]);
    if (month) add(match.index ?? 0, nextDate(Number(match[2]), month, match[3] ? Number(match[3]) : null, today));
  }

  found.sort((a, b) => a.at - b.at);
  return [...new Set(found.map((entry) => entry.date))];
}

/** "sutra", "za 2 nedelje", "ovog vikenda", "in 3 weeks": a departure counted from today. */
function relativeDeparture(tokens: readonly string[], today: IsoDate): IsoDate | null {
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token === 'danas' || token === 'today') return today;
    if (token === 'sutra' || token === 'tomorrow') return addDays(today, 1);
    if (token === 'prekosutra') return addDays(today, 2);
    if (token.startsWith('vikend') || token === 'weekend') {
      const next = /^(sledec|naredn|next)/.test(tokens[index - 1] ?? '');
      return addDays(nextSaturday(today), next ? 7 : 0);
    }
    if (token !== 'za' && token !== 'in') continue;
    const counted = numberOf(tokens[index + 1]);
    // "za nedelju dana", "in a month": one unit.
    const amount = counted ?? (/^(nedelju|sedmicu|mesec|a|one)$/.test(tokens[index + 1] ?? '') ? 1 : null);
    const unit = counted !== null || /^(a|one)$/.test(tokens[index + 1] ?? '') ? tokens[index + 2] : tokens[index + 1];
    if (!amount || !unit) continue;
    if (/^(dan|day)/.test(unit)) return addDays(today, amount);
    if (/^(nedelj|sedmic|week)/.test(unit)) return addDays(today, amount * 7);
    if (/^(mesec|month)/.test(unit)) return addMonths(today, amount);
  }
  return null;
}

/** "7 dana", "nedelju dana", "5 noćenja", "dve nedelje", "for a week". */
function tripLength(tokens: readonly string[]): number | null {
  for (let index = 0; index < tokens.length; index++) {
    // "za dve nedelje" is when, not how long.
    if (tokens[index - 1] === 'za' || tokens[index - 1] === 'in') continue;
    const amount = numberOf(tokens[index]);
    const unit = tokens[index + 1] ?? '';
    if (amount && amount <= 90) {
      if (/^(noc|nocenj|night)/.test(unit)) return amount;
      if (/^(dan|day)/.test(unit)) return amount;
      if (/^(nedelj|sedmic|week)/.test(unit)) return amount * 7;
    }
    if (/^(nedelju|sedmicu)$/.test(tokens[index]) && /^dan/.test(unit)) return 7;
    if (tokens[index] === 'mesec' && /^dan/.test(unit)) return 30;
    if ((tokens[index] === 'a' || tokens[index] === 'one') && /^week/.test(unit)) return 7;
  }
  return null;
}

/** "sa 2 psa", "dva psa", "three dogs"; a single "pas" says nothing about the number. */
function dogCount(tokens: readonly string[]): number | null {
  for (let index = 0; index < tokens.length - 1; index++) {
    const amount = numberOf(tokens[index]);
    if (amount && DOG_NOUNS.has(tokens[index + 1])) return Math.min(amount, MAX_DOGS);
  }
  return null;
}

export function tripFacts(tokens: readonly string[], foldedText: string, today: IsoDate): TripFacts {
  const dates = absoluteDates(foldedText, today);
  let departure: IsoDate | null = dates[0] ?? relativeDeparture(tokens, today);
  let returnDate: IsoDate | null = dates[1] ?? null;

  // "od 10. do 20. jula": the first day takes the month of the second.
  const range = /(?<![\d.])(\d{1,2})\.?\s*(?:do|-|–|to|until)\s*(\d{1,2})\.?\s*([a-z]{3,})/.exec(foldedText);
  const month = range ? monthOf(range[3]) : null;
  if (range && month) {
    const end = nextDate(Number(range[2]), month, null, today);
    const start = end ? nextDate(Number(range[1]), month, Number(end.slice(0, 4)), today) : null;
    if (start && end && start <= end) {
      departure = start;
      returnDate = end;
    }
  }

  if (returnDate && departure && returnDate < departure) returnDate = null;
  return { departureDate: departure, returnDate, nights: tripLength(tokens), dogs: dogCount(tokens) };
}
