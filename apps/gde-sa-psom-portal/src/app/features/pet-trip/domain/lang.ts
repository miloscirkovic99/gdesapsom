/**
 * The planner's two languages: Serbian (Latin script) and English. The
 * domain takes the language as an argument and returns finished text, so the
 * report, the costs and the AI request are always in the language on screen.
 */
export type Lang = 'sr' | 'en';

/** Prose that has to exist in both languages: rule texts, notes. */
export type Localized = Readonly<Record<Lang, string>>;

/** A name or title. A plain string reads the same in both languages ("Bajakovo", "Air Serbia"). */
export type Label = string | Localized;

export function localize(text: Label, lang: Lang): string {
  return typeof text === 'string' ? text : text[lang];
}

/** Transloco's 'rs' / 'en' to the planner's language. */
export function tripLang(translocoLang: string | null | undefined): Lang {
  return translocoLang?.startsWith('en') ? 'en' : 'sr';
}

/** BCP 47 locale for numbers and amounts. */
export const LOCALE: Readonly<Record<Lang, string>> = { sr: 'sr-Latn-RS', en: 'en-GB' };

/** "A, B i C" / "A, B and C". */
export function joinList(items: readonly string[], lang: Lang): string {
  if (items.length < 2) return items.join('');
  const last = items[items.length - 1];
  return `${items.slice(0, -1).join(', ')} ${lang === 'en' ? 'and' : 'i'} ${last}`;
}
