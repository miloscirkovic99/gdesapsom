import type { Lang } from './lang';

/**
 * Calendar dates as ISO strings (YYYY-MM-DD). The arithmetic runs on UTC
 * midnights, so neither a time zone nor a daylight-saving change can move a
 * deadline by a day. Travel rules count calendar days, not hours, except the
 * tapeworm window, which the report states in hours next to the dates.
 */
export type IsoDate = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

/** True for a real calendar date in YYYY-MM-DD form (2026-02-30 is not one). */
export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function toUtcMs(date: IsoDate): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function fromUtcMs(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/**
 * Same day `months` later; a day the target month lacks becomes its last day
 * (31 January + 1 month = 28/29 February).
 */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const [year, month, day] = date.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return fromUtcMs(target.getTime());
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** The latest of the dates given; null when none is. */
export function latest(...dates: (IsoDate | null | undefined)[]): IsoDate | null {
  return dates.reduce<IsoDate | null>((max, date) => (date && (!max || date > max) ? date : max), null);
}

/** The visitor's calendar date (their time zone, not UTC). */
export function todayIso(now: Date = new Date()): IsoDate {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

const MONTHS_GENITIVE = [
  'januara', 'februara', 'marta', 'aprila', 'maja', 'juna',
  'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra',
];

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "3. decembra 2026." — the way Serbian writes a date in running text. */
export function formatDateSr(date: IsoDate): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${day}. ${MONTHS_GENITIVE[month - 1]} ${year}.`;
}

/** "3 December 2026" */
export function formatDateEn(date: IsoDate): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS_EN[month - 1]} ${year}`;
}

export function formatDate(date: IsoDate, lang: Lang): string {
  return lang === 'en' ? formatDateEn(date) : formatDateSr(date);
}
