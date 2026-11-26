import type { City, Township } from '@gde/shared/data-access';
import { buildGazetteer, type Gazetteer } from './gazetteer';

/** A slice of the real `countryandcities` and `township` lookups. */
export const SAMPLE_CITIES: City[] = [
  { grd_id: 1, grd_ime: 'Beograd' },
  { grd_id: 2, grd_ime: 'Novi Sad' },
  { grd_id: 3, grd_ime: 'Niš' },
  { grd_id: 4, grd_ime: 'Kragujevac' },
  { grd_id: 5, grd_ime: 'Zlatibor' },
  { grd_id: 6, grd_ime: 'Ada' },
  { grd_id: 7, grd_ime: 'Čačak' },
  { grd_id: 8, grd_ime: 'Sremski Karlovci' },
  { grd_id: 9, grd_ime: 'Šabac' },
];

export const SAMPLE_TOWNSHIPS: Township[] = [
  { id: 1, ime: 'Vračar', grd_id: 1, city_name: 'Beograd' },
  { id: 2, ime: 'Stari grad', grd_id: 1, city_name: 'Beograd' },
  { id: 3, ime: 'Novi Beograd', grd_id: 1, city_name: 'Beograd' },
  { id: 4, ime: 'Zemun', grd_id: 1, city_name: 'Beograd' },
  { id: 5, ime: 'Čukarica', grd_id: 1, city_name: 'Beograd' },
  { id: 6, ime: 'Palilula', grd_id: 1, city_name: 'Beograd' },
  { id: 7, ime: 'Voždovac', grd_id: 1, city_name: 'Beograd' },
  { id: 8, ime: 'Savski venac', grd_id: 1, city_name: 'Beograd' },
  { id: 20, ime: 'Novi Sad', grd_id: 2, city_name: 'Novi Sad' },
  { id: 21, ime: 'Petrovaradin', grd_id: 2, city_name: 'Novi Sad' },
  { id: 30, ime: 'Medijana', grd_id: 3, city_name: 'Niš' },
  { id: 31, ime: 'Palilula', grd_id: 3, city_name: 'Niš' },
  { id: 40, ime: 'Kragujevac', grd_id: 4, city_name: 'Kragujevac' },
  { id: 50, ime: 'Zlatibor', grd_id: 5, city_name: 'Zlatibor' },
  { id: 60, ime: 'Ada', grd_id: 6, city_name: 'Ada' },
  { id: 70, ime: 'Čačak', grd_id: 7, city_name: 'Čačak' },
  { id: 80, ime: 'Sremski Karlovci', grd_id: 8, city_name: 'Sremski Karlovci' },
  { id: 90, ime: 'Šabac', grd_id: 9, city_name: 'Šabac' },
];

export function sampleGazetteer(): Gazetteer {
  return buildGazetteer(SAMPLE_CITIES, SAMPLE_TOWNSHIPS);
}

/** A Thursday. */
export const TODAY = '2026-11-26';

/** The value, or a failing test when it is missing. */
export function required<T>(value: T | null | undefined, what = 'value'): T {
  if (value === null || value === undefined) throw new Error(`Expected ${what}`);
  return value;
}
