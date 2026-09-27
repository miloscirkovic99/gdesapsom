export type PluralForm = 'one' | 'few' | 'many';

/**
 * Serbian has three plural forms (1 proizvod, 2-4 proizvoda, 5+ proizvoda);
 * English has two. Returns the suffix for an i18n key such as
 * `food_count_one` / `food_count_few` / `food_count_many`.
 */
export function pluralForm(count: number, lang: string): PluralForm {
  const n = Math.abs(Math.trunc(count));

  if (lang.startsWith('en')) {
    return n === 1 ? 'one' : 'many';
  }

  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  return 'many';
}

export function pluralKey(base: string, count: number, lang: string): string {
  return `${base}_${pluralForm(count, lang)}`;
}
