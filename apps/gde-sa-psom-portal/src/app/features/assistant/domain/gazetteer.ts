import type { City, Township } from '@gde/shared/data-access';
import { foldPlaceName } from '@gde/shared/util';
import type { PlaceRef } from './query.models';
import { isFormOf, latinize, PLACE_PREPOSITIONS, stemsOf } from './text';

/**
 * Finds the database's cities and townships in a message, in any case form:
 * "u Novom Sadu", "iz Kragujevca", "na Vračaru", "Novog Beograda".
 *
 * Built from the same lookups the hub pages read (`countryandcities`,
 * `township`), so a place the admin adds is understood at once. A
 * one-word name in a case form other than the nominative only counts after a
 * preposition ("u Nišu", not "nisu" = "they are not").
 */
export interface GazetteerHit {
  place: PlaceRef;
  /** Word indexes [start, end) of the name in the message. */
  start: number;
  end: number;
}

export interface Gazetteer {
  /** The place the words name: the longest name wins, a city over a township of the same name. */
  find(folded: readonly string[], skip?: ReadonlySet<number>): GazetteerHit | null;
  /** A place named on its own ("Novi Sad", "Stari grad"), as the AI or a chip gives it; `city` narrows a township. */
  lookup(name: string, city?: string | null): PlaceRef | null;
  /** The city named exactly (folded) `name`, for the hub cities' chips. */
  city(name: string): PlaceRef | null;
  readonly empty: boolean;
}

interface Entry {
  words: string[];
  stems: string[][];
  place: PlaceRef;
  /** Aliases are tried after real names of the same length. */
  rank: number;
  /** Any case form counts, also without a preposition ("beogradski kafići"). */
  free: boolean;
}

/**
 * Other names of places in the database: landmarks and neighbourhoods
 * people search by, English names and chat shorthand. Each points to a
 * folded city or township name; an alias whose place is missing from the
 * lookups is dropped. `stem: true` takes the last word as a stem
 * ("novosadsk" → "novosadski", "novosadskom"), which no other word starts
 * with, so it needs no preposition.
 */
interface Alias {
  form: string;
  city: string;
  township?: string;
  stem?: boolean;
}

const ALIASES: readonly Alias[] = [
  { form: 'belgrade', city: 'beograd' },
  { form: 'bg', city: 'beograd' },
  { form: 'beogradsk', city: 'beograd', stem: true },
  { form: 'ns', city: 'novi sad' },
  { form: 'novosadsk', city: 'novi sad', stem: true },
  { form: 'nish', city: 'nis' },
  { form: 'sapc', city: 'sabac', stem: true },
  { form: 'dorcol', city: 'beograd', township: 'stari grad' },
  { form: 'kalemegdan', city: 'beograd', township: 'stari grad' },
  { form: 'skadarlij', city: 'beograd', township: 'stari grad', stem: true },
  { form: 'knez mihailov', city: 'beograd', township: 'stari grad', stem: true },
  ...['ada', 'adi', 'adu', 'ade'].map((ada): Alias => ({ form: `${ada} ciganlij`, city: 'beograd', township: 'cukarica', stem: true })),
  { form: 'banovo brdo', city: 'beograd', township: 'cukarica' },
  { form: 'zarkovo', city: 'beograd', township: 'cukarica' },
  { form: 'senjak', city: 'beograd', township: 'savski venac' },
  { form: 'dedinje', city: 'beograd', township: 'savski venac' },
  { form: 'karaburma', city: 'beograd', township: 'palilula' },
  { form: 'bezanijsk kos', city: 'beograd', township: 'novi beograd', stem: true },
  { form: 'usce', city: 'beograd', township: 'novi beograd' },
  { form: 'mirijevo', city: 'beograd', township: 'zvezdara' },
  { form: 'konjarnik', city: 'beograd', township: 'zvezdara' },
  { form: 'banjica', city: 'beograd', township: 'vozdovac' },
  { form: 'liman', city: 'novi sad' },
  { form: 'strand', city: 'novi sad' },
  { form: 'grbavic', city: 'novi sad', stem: true },
  { form: 'detelinar', city: 'novi sad' },
];

const RANK_CITY = 2;
const RANK_TOWNSHIP = 1;
const RANK_ALIAS = 0;

/** "Vračar, Beograd" (some API rows) and "Vračar" are the same township. */
function townshipName(row: Township): string {
  return String(row.ime ?? '').split(',')[0].trim();
}

function entryFor(name: string, place: PlaceRef, rank: number, lastIsStem = false): Entry | null {
  const words = foldPlaceName(name).split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length) return null;
  const stems = words.map((word, index) => (lastIsStem && index === words.length - 1 ? [word] : stemsOf(word)));
  return { words, stems, place, rank, free: lastIsStem };
}

export function buildGazetteer(cities: readonly City[], townships: readonly Township[]): Gazetteer {
  const cityByKey = new Map<string, PlaceRef>();
  for (const city of cities) {
    const key = foldPlaceName(city.grd_ime);
    if (!key || cityByKey.has(key)) continue;
    cityByKey.set(key, { kind: 'city', name: city.grd_ime.trim(), cityIds: [Number(city.grd_id)], cityNames: [city.grd_ime.trim()], townshipIds: [] });
  }
  const cityById = new Map<number, PlaceRef>();
  for (const place of cityByKey.values()) cityById.set(place.cityIds[0], place);

  // Townships with the same name (Palilula in Belgrade and in Niš) are one place with both ids.
  const townshipByKey = new Map<string, PlaceRef>();
  for (const row of townships) {
    const name = townshipName(row);
    const key = foldPlaceName(name);
    const id = Number(row.id);
    if (!key || !Number.isFinite(id)) continue;
    const city =
      (row.grd_id != null ? cityById.get(Number(row.grd_id)) : undefined) ??
      (row.city_name ? cityByKey.get(foldPlaceName(row.city_name)) : undefined);
    if (city && !city.townshipIds.includes(id)) city.townshipIds.push(id);

    const existing = townshipByKey.get(key);
    const cityId = city?.cityIds[0] ?? (row.grd_id != null ? Number(row.grd_id) : null);
    const cityName = city?.name ?? row.city_name?.trim() ?? null;
    if (existing) {
      if (!existing.townshipIds.includes(id)) existing.townshipIds.push(id);
      if (cityId !== null && !existing.cityIds.includes(cityId)) existing.cityIds.push(cityId);
      if (cityName && !existing.cityNames.includes(cityName)) existing.cityNames.push(cityName);
    } else {
      townshipByKey.set(key, {
        kind: 'township',
        name,
        cityIds: cityId !== null ? [cityId] : [],
        cityNames: cityName ? [cityName] : [],
        townshipIds: [id],
      });
    }
  }

  const entries: Entry[] = [];
  for (const [key, place] of cityByKey) {
    const entry = entryFor(key, place, RANK_CITY);
    if (entry) entries.push(entry);
  }
  for (const [key, place] of townshipByKey) {
    // A township named like its own city ("Vršac" in Vršac) adds nothing to the city.
    const city = cityByKey.get(key);
    if (city && place.cityIds.every((id) => city.cityIds.includes(id))) continue;
    const entry = entryFor(key, place, RANK_TOWNSHIP);
    if (entry) entries.push(entry);
  }

  const townshipIn = (township: string, city: string): PlaceRef | null => {
    const place = townshipByKey.get(township);
    const cityPlace = cityByKey.get(city);
    if (!place) return null;
    if (!cityPlace || place.cityIds.length <= 1) return place;
    // The Belgrade Palilula, not the one in Niš.
    const ids = place.townshipIds.filter((id) => cityPlace.townshipIds.includes(id));
    return ids.length ? { ...place, townshipIds: ids, cityIds: cityPlace.cityIds, cityNames: cityPlace.cityNames } : place;
  };

  for (const alias of ALIASES) {
    const place = alias.township ? townshipIn(alias.township, alias.city) : (cityByKey.get(alias.city) ?? null);
    if (!place) continue;
    const entry = entryFor(alias.form, place, RANK_ALIAS, alias.stem);
    if (entry) entries.push(entry);
  }

  const matchAt = (entry: Entry, folded: readonly string[], start: number, skip?: ReadonlySet<number>): boolean => {
    if (start + entry.words.length > folded.length) return false;
    let inflected = false;
    for (let offset = 0; offset < entry.words.length; offset++) {
      const index = start + offset;
      if (skip?.has(index)) return false;
      const token = folded[index];
      const word = entry.words[offset];
      if (token === word) continue;
      if (!isFormOf(token, word, entry.stems[offset])) return false;
      inflected = true;
    }
    // "nisu" is not Niš, "u Nišu" is; two-word names ("Novom Sadu") are safe on their own.
    if (inflected && entry.words.length === 1 && !entry.free) return start > 0 && PLACE_PREPOSITIONS.has(folded[start - 1]);
    return true;
  };

  const find = (folded: readonly string[], skip?: ReadonlySet<number>): GazetteerHit | null => {
    let best: (GazetteerHit & { score: number }) | null = null;
    for (const entry of entries) {
      const score = entry.words.length * 10 + entry.rank;
      if (best && score <= best.score) continue;
      for (let start = 0; start < folded.length; start++) {
        if (matchAt(entry, folded, start, skip)) {
          best = { place: entry.place, start, end: start + entry.words.length, score };
          break;
        }
      }
    }
    return best ? { place: best.place, start: best.start, end: best.end } : null;
  };

  const lookup = (name: string, city?: string | null): PlaceRef | null => {
    const key = foldPlaceName(name);
    const cityKey = city ? foldPlaceName(city) : '';
    if (!key) return null;
    if (cityKey && townshipByKey.has(key)) return townshipIn(key, cityKey);
    const exact = cityByKey.get(key) ?? townshipByKey.get(key);
    if (exact) return exact;
    // A case form or an alias, as if it followed a preposition ("Novom Sadu", "Dorćol").
    const words = ['u', ...key.split(/[^a-z0-9]+/).filter(Boolean)];
    const hit = find(words);
    return hit && hit.start === 1 && hit.end === words.length ? hit.place : null;
  };

  return {
    find,
    lookup,
    city: (name) => cityByKey.get(foldPlaceName(name)) ?? null,
    empty: entries.length === 0,
  };
}

/** For when the lookups failed: categories and trips still work, places do not. */
export const EMPTY_GAZETTEER: Gazetteer = buildGazetteer([], []);

const ADMINISTRATIVE_PREFIX = /^(gradska\s+op[sš]tina|op[sš]tina|gradsko\s+naselje|naselje|grad)\s+/i;

/**
 * The plain names in an OpenStreetMap area name: "Beograd (Vračar)" →
 * ["Vračar", "Beograd"], "Gradska opština Vračar" → ["Vračar"],
 * "Grad Beograd" → ["Beograd"], "Градска општина Врачар" → ["Vračar"].
 */
export function addressNameCandidates(name: string): string[] {
  const latin = latinize(name).trim();
  const bracket = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(latin);
  const parts = bracket ? [bracket[2], bracket[1]] : [latin];
  return parts.map((part) => part.replace(ADMINISTRATIVE_PREFIX, '').trim()).filter(Boolean);
}

/**
 * The township (or else the city) of our lists that the reverse-geocoded
 * area names point to, most specific first. The city found among the names
 * narrows a township name that two cities share (Palilula).
 */
export function placeFromAddress(names: readonly string[], gazetteer: Gazetteer): PlaceRef | null {
  const candidates = names.flatMap(addressNameCandidates);
  const city = candidates.map((candidate) => gazetteer.city(candidate)).find((place) => place !== null) ?? null;
  for (const candidate of candidates) {
    const place = gazetteer.lookup(candidate, city?.name ?? null);
    if (place?.kind === 'township') return place;
  }
  return city;
}
