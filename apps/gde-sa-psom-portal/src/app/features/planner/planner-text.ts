import { pluralForm } from '@gde/shared/util';
import type { PlaceCategory } from './planner.models';

/**
 * Small pure helpers of the planner pages: the dog's name, dates, the quota
 * line and the Google Maps walking route.
 */

/** Said instead of the name when the visitor left the field empty. */
export const DEFAULT_DOG_NAME = 'tvoj pas';

/**
 * Replaces every {{ime}} with the dog's name, or "tvoj pas" without one;
 * capitalised where it starts a sentence. Plain text in, plain text out: the
 * template interpolates the result, so a name can never become markup.
 */
export function fillDogName(text: string, name: string | null | undefined): string {
  const dog = name?.trim() || DEFAULT_DOG_NAME;
  return text.replace(/\{\{\s*ime\s*\}\}/g, (_match, offset: number) => {
    const before = text.slice(0, offset).trimEnd();
    const startsSentence = before === '' || /[.!?:]$/.test(before);
    return startsSentence ? dog.charAt(0).toUpperCase() + dog.slice(1) : dog;
  });
}

/** '2026-11-28T10:00:00Z' → '28. 11. 2026.' in Belgrade time. */
export function formatLimitDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('sr-Latn-RS', {
    timeZone: 'Europe/Belgrade',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('day')}. ${part('month')}. ${part('year')}.`;
}

/** "Ostala su ti 2 plana ove nedelje" / "Ostao ti je 1 plan ove nedelje" / null at 0. */
export function remainingLine(remaining: number): string | null {
  if (remaining <= 0) return null;
  const form = pluralForm(remaining, 'sr');
  if (form === 'one') return `Ostao ti je ${remaining} plan ove nedelje`;
  if (form === 'few') return `Ostala su ti ${remaining} plana ove nedelje`;
  return `Ostalo ti je ${remaining} planova ove nedelje`;
}

/** Today in Belgrade, 'YYYY-MM-DD' (the API validates dates against the same day). */
export function belgradeToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' }).format(now);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().slice(0, 10);
}

export const CATEGORY_LABELS: Readonly<Record<PlaceCategory, string>> = {
  kafic: 'Kafić',
  restoran: 'Restoran',
  bar: 'Bar',
  smestaj: 'Smeštaj',
  park: 'Šetnja',
  staza: 'Staza',
  veterinar: 'Veterinar',
};

/**
 * Google Maps walking directions through the stops in order
 * (https://www.google.com/maps/dir/?api=1). Null with fewer than two stops
 * that have coordinates.
 */
export function walkingRouteUrl(points: readonly { lat: number | null; lng: number | null }[]): string | null {
  const located = points.filter((point) => point.lat !== null && point.lng !== null);
  if (located.length < 2) return null;
  const at = (point: { lat: number | null; lng: number | null }) => `${point.lat},${point.lng}`;

  const params = new URLSearchParams({
    api: '1',
    origin: at(located[0]),
    destination: at(located[located.length - 1]),
    travelmode: 'walking',
  });
  const waypoints = located.slice(1, -1).map(at);
  if (waypoints.length) params.set('waypoints', waypoints.join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
