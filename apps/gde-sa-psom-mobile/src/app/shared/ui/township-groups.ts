import type { Township } from '@gde/shared/data-access';
import { foldPlaceName } from '@gde/shared/util';

/** "Vračar" for "Vračar, Beograd", where the city is already on screen. */
export function townshipShortName(t: Township): string {
  const city = t.city_name?.trim();
  if (!city) return t.ime;
  const suffix = `, ${city}`;
  return t.ime.length > suffix.length && t.ime.endsWith(suffix) ? t.ime.slice(0, -suffix.length) : t.ime;
}

/** The city a township belongs to: its `grd_id`, or its `city_name` when the id is missing. */
function cityKey(t: Township): string | null {
  if (t.grd_id != null) return `id:${t.grd_id}`;
  const name = foldPlaceName(t.city_name);
  return name ? `name:${name}` : null;
}

interface City {
  key: string;
  cityId: number | null;
  name: string;
  townships: Township[];
}

/** Townships by city, in list order (the API sorts them by id, so Beograd comes first). */
function citiesOf(townships: readonly Township[]): { cities: City[]; homeless: Township[] } {
  const byKey = new Map<string, City>();
  const homeless: Township[] = [];
  for (const t of townships) {
    const key = cityKey(t);
    if (!key) {
      homeless.push(t);
      continue;
    }
    let city = byKey.get(key);
    if (!city) {
      city = { key, cityId: t.grd_id != null ? Number(t.grd_id) : null, name: t.city_name ?? '', townships: [] };
      byKey.set(key, city);
    }
    city.townships.push(t);
  }
  return { cities: [...byKey.values()], homeless };
}

export function spansSeveralCities(townships: readonly Township[]): boolean {
  return citiesOf(townships).cities.length > 1;
}

export interface TownshipRow {
  id: number;
  name: string;
}

export interface TownshipGroup {
  /** `id:<grd_id>` for a city, 'other' for the towns that are one township each. */
  key: string;
  /** Null for the 'other' group. */
  city: string | null;
  /** Every township of the city, whatever the search shows: what "whole city" selects. */
  allIds: number[];
  /** The rows that match the search. */
  rows: TownshipRow[];
}

/**
 * Townships grouped for the picker: a group per city that has several
 * townships, in list order, then one group of the towns that are a single
 * township, by name. The search matches the full name ("Vračar, Beograd"),
 * so typing a city's name keeps all of it.
 */
export function groupTownships(townships: readonly Township[], query = ''): TownshipGroup[] {
  const needle = foldPlaceName(query);
  const matches = (t: Township) => !needle || foldPlaceName(t.ime).includes(needle);
  const { cities, homeless } = citiesOf(townships);
  const groups: TownshipGroup[] = [];
  const others: TownshipRow[] = [];

  for (const city of cities) {
    if (city.townships.length < 2) {
      others.push(...city.townships.filter(matches).map((t) => ({ id: Number(t.id), name: townshipShortName(t) })));
      continue;
    }
    const rows = city.townships.filter(matches).map((t) => ({ id: Number(t.id), name: townshipShortName(t) }));
    if (rows.length) {
      groups.push({ key: city.key, city: city.name, allIds: city.townships.map((t) => Number(t.id)), rows });
    }
  }

  others.push(...homeless.filter(matches).map((t) => ({ id: Number(t.id), name: t.ime })));
  if (others.length) {
    others.sort((a, b) => a.name.localeCompare(b.name, 'sr'));
    groups.push({ key: 'other', city: null, allIds: others.map((r) => r.id), rows: others });
  }
  return groups;
}

export interface ChosenCity {
  cityId: number | null;
  name: string;
  ids: number[];
}

export interface TownshipSelection {
  /** Cities whose every township is chosen, in list order. */
  cities: ChosenCity[];
  /** Chosen townships outside those cities. */
  rest: Township[];
}

/** A township choice as people think of it: "Beograd" rather than its 14 townships. Unknown ids are left out. */
export function summarizeTownships(ids: readonly number[], townships: readonly Township[]): TownshipSelection {
  const chosen = new Set(ids.map(Number));
  const selection: TownshipSelection = { cities: [], rest: [] };
  const { cities, homeless } = citiesOf(townships);

  for (const city of cities) {
    const picked = city.townships.filter((t) => chosen.has(Number(t.id)));
    if (!picked.length) continue;
    if (picked.length === city.townships.length) {
      selection.cities.push({ cityId: city.cityId, name: city.name, ids: picked.map((t) => Number(t.id)) });
    } else {
      selection.rest.push(...picked);
    }
  }
  selection.rest.push(...homeless.filter((t) => chosen.has(Number(t.id))));
  return selection;
}
