import type { Lang, Localized } from './lang';

/**
 * Countries the trip form offers, as destination or transit. Being listed here
 * says nothing about coverage: which rules are known for a country is decided
 * by the ruleset (rules/ruleset.ts), and a country without rules gets a
 * partial report that says so.
 */
export type CountryCode =
  | 'RS'
  | 'HR'
  | 'HU'
  | 'SI'
  | 'AT'
  | 'DE'
  | 'IT'
  | 'GR'
  | 'BG'
  | 'RO'
  | 'ME'
  | 'BA'
  | 'MK';

export interface CountryInfo {
  code: CountryCode;
  /** "Hrvatska" / "Croatia" */
  name: Localized;
  /** Serbian only (English needs no case forms). "Hrvatske": after "do", "iz", "preko". */
  genitive: string;
  /** Serbian only. "u Hrvatskoj" */
  locative: string;
  inEu: boolean;
  /** Shares a road border with Serbia, so a car can enter it directly. */
  bordersSerbia: boolean;
}

export const COUNTRIES: readonly CountryInfo[] = [
  { code: 'RS', name: { sr: 'Srbija', en: 'Serbia' }, genitive: 'Srbije', locative: 'u Srbiji', inEu: false, bordersSerbia: false },
  { code: 'HR', name: { sr: 'Hrvatska', en: 'Croatia' }, genitive: 'Hrvatske', locative: 'u Hrvatskoj', inEu: true, bordersSerbia: true },
  { code: 'HU', name: { sr: 'Mađarska', en: 'Hungary' }, genitive: 'Mađarske', locative: 'u Mađarskoj', inEu: true, bordersSerbia: true },
  { code: 'RO', name: { sr: 'Rumunija', en: 'Romania' }, genitive: 'Rumunije', locative: 'u Rumuniji', inEu: true, bordersSerbia: true },
  { code: 'BG', name: { sr: 'Bugarska', en: 'Bulgaria' }, genitive: 'Bugarske', locative: 'u Bugarskoj', inEu: true, bordersSerbia: true },
  { code: 'GR', name: { sr: 'Grčka', en: 'Greece' }, genitive: 'Grčke', locative: 'u Grčkoj', inEu: true, bordersSerbia: false },
  { code: 'SI', name: { sr: 'Slovenija', en: 'Slovenia' }, genitive: 'Slovenije', locative: 'u Sloveniji', inEu: true, bordersSerbia: false },
  { code: 'AT', name: { sr: 'Austrija', en: 'Austria' }, genitive: 'Austrije', locative: 'u Austriji', inEu: true, bordersSerbia: false },
  { code: 'DE', name: { sr: 'Nemačka', en: 'Germany' }, genitive: 'Nemačke', locative: 'u Nemačkoj', inEu: true, bordersSerbia: false },
  { code: 'IT', name: { sr: 'Italija', en: 'Italy' }, genitive: 'Italije', locative: 'u Italiji', inEu: true, bordersSerbia: false },
  { code: 'ME', name: { sr: 'Crna Gora', en: 'Montenegro' }, genitive: 'Crne Gore', locative: 'u Crnoj Gori', inEu: false, bordersSerbia: true },
  { code: 'BA', name: { sr: 'Bosna i Hercegovina', en: 'Bosnia and Herzegovina' }, genitive: 'Bosne i Hercegovine', locative: 'u Bosni i Hercegovini', inEu: false, bordersSerbia: true },
  { code: 'MK', name: { sr: 'Severna Makedonija', en: 'North Macedonia' }, genitive: 'Severne Makedonije', locative: 'u Severnoj Makedoniji', inEu: false, bordersSerbia: true },
];

const BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

export function country(code: CountryCode): CountryInfo {
  const info = BY_CODE.get(code);
  if (!info) throw new Error(`Unknown country ${code}`);
  return info;
}

export function countryName(code: CountryCode, lang: Lang): string {
  return country(code).name[lang];
}

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && BY_CODE.has(value as CountryCode);
}

/** Destinations the form offers: every listed country except the departure country. */
export const DESTINATIONS: readonly CountryInfo[] = COUNTRIES.filter((info) => info.code !== 'RS');
