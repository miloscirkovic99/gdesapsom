import { foldPlaceName } from '@gde/shared/util';

/** Longest message the assistant reads; the input stops there too. */
export const MAX_MESSAGE_LENGTH = 300;

/**
 * A message split into words twice: as typed (for quoting it back) and
 * folded (lower case, no diacritics, `đ` as "dj"), with the same indexes, so
 * "na Dorćolu" is `raw: ['na', 'Dorćolu']`, `folded: ['na', 'dorcolu']`.
 * Digits stay words of their own: "20.12." is ['20', '12'].
 */
export interface Words {
  raw: string[];
  folded: string[];
}

export function words(text: string): Words {
  const raw = text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return { raw, folded: raw.map((word) => foldPlaceName(word)) };
}

/** The whole message folded the same way, for patterns that span words (dates). */
export function foldText(text: string): string {
  return foldPlaceName(text);
}

const CYRILLIC: Readonly<Record<string, string>> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj',
  м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č',
  џ: 'dž', ш: 'š',
};

/** Serbian Cyrillic in Latin script ("Врачар" → "Vračar"); Latin text is left as it is. */
export function latinize(text: string): string {
  return text.replace(/[Ѐ-ӿ]/g, (letter) => {
    const lower = letter.toLowerCase();
    const latin = CYRILLIC[lower];
    if (latin === undefined) return letter;
    return letter === lower ? latin : latin.charAt(0).toUpperCase() + latin.slice(1);
  });
}

/**
 * Serbian case endings (and the adjective suffix "-ski") that may follow a
 * stem: "Beograd" → "Beogradu", "Novi Sad" → "Novom Sadu", "Vračar" →
 * "Vračaru", "beogradski". Only these, so "nisam" is not a form of "Niš".
 */
export const CASE_ENDINGS: ReadonlySet<string> = new Set([
  '', 'a', 'e', 'i', 'o', 'u',
  'om', 'em', 'og', 'eg', 'oj', 'im', 'ih', 'ome', 'omu', 'emu', 'ega', 'ama', 'ima',
  'ju', 'ja', 'je', 'ji', 'jom', 'jem',
  'ski', 'ska', 'sko', 'ske', 'sku', 'skog', 'skom', 'skoj', 'skim', 'skih',
]);

const VOWEL_END = /[aeiou]+$/;
/** "Kragujevac" → "Kragujevcu", "Čačak" → "Čačku": the "a" before the last consonant drops. */
const FLEETING_A = /[^aeiou]a[ck]$/;

/**
 * Stems a word may be written with, plus a case ending: "beograd" →
 * ["beograd"], "zvezdara" → ["zvezdar"], "kragujevac" → ["kragujevac",
 * "kragujevc"]. Words of three letters or less keep their full form
 * ("ada" stays "ada", so "na Adi" is not the town of Ada).
 */
export function stemsOf(word: string): string[] {
  const stripped = word.replace(VOWEL_END, '');
  const base = stripped.length >= 3 && word.length > 3 ? stripped : word;
  const stems = [base];
  if (word.length >= 5 && FLEETING_A.test(word)) stems.push(word.slice(0, -2) + word.slice(-1));
  return stems;
}

/** True when `token` is `word` in some case form: one of its stems plus a case ending. */
export function isFormOf(token: string, word: string, stems: readonly string[] = stemsOf(word)): boolean {
  if (token === word) return true;
  return stems.some((stem) => token.startsWith(stem) && CASE_ENDINGS.has(token.slice(stem.length)));
}

/** Prepositions before a place: "u Nišu", "na Vračaru", "kod Kalemegdana", "near Belgrade". */
export const PLACE_PREPOSITIONS: ReadonlySet<string> = new Set([
  'u', 'na', 'iz', 'do', 'kod', 'ka', 'ko', 'prema', 'blizu', 'oko', 'pored', 'po', 'za', 'od', 'preko',
  'okolini', 'centru', 'in', 'near', 'around', 'at', 'to', 'from',
]);

/** Number words up to twenty, as dates and counts are written out ("dve nedelje", "tri psa"). */
export const NUMBER_WORDS: Readonly<Record<string, number>> = {
  jedan: 1, jedna: 1, jedno: 1, jednu: 1, jednog: 1, one: 1,
  dva: 2, dve: 2, dvoje: 2, two: 2,
  tri: 3, troje: 3, three: 3,
  cetiri: 4, cetvoro: 4, four: 4,
  pet: 5, petoro: 5, five: 5,
  sest: 6, six: 6,
  sedam: 7, seven: 7,
  osam: 8, eight: 8,
  devet: 9, nine: 9,
  deset: 10, ten: 10,
  jedanaest: 11, dvanaest: 12, trinaest: 13, cetrnaest: 14, fourteen: 14,
  petnaest: 15, fifteen: 15, dvadeset: 20, twenty: 20,
};

/** "3", "tri", "three" → 3; anything else → null. */
export function numberOf(token: string | undefined): number | null {
  if (!token) return null;
  if (/^\d{1,3}$/.test(token)) return Number(token);
  return NUMBER_WORDS[token] ?? null;
}
