import type { Township } from '@gde/shared/data-access';
import { groupTownships, spansSeveralCities, summarizeTownships, townshipShortName } from './township-groups';

/** Shaped like the API's `township` list: sorted by id, each with its city. */
const TOWNSHIPS: Township[] = [
  { id: 1, grd_id: 1, ime: 'Vračar, Beograd', city_name: 'Beograd' },
  { id: 2, grd_id: 1, ime: 'Voždovac, Beograd', city_name: 'Beograd' },
  { id: 15, grd_id: 2, ime: 'Medijana, Niš', city_name: 'Niš' },
  { id: 16, grd_id: 2, ime: 'Palilula, Niš', city_name: 'Niš' },
  { id: 20, grd_id: 4, ime: 'Vlasotince, Vlasotince', city_name: 'Vlasotince' },
  { id: 21, grd_id: 14, ime: 'Zlatibor, Zlatibor', city_name: 'Zlatibor' },
  { id: 22, grd_id: 9, ime: 'Subotica, Subotica', city_name: 'Subotica' },
];

describe('townshipShortName', () => {
  it('drops the city the name ends with', () => {
    expect(townshipShortName(TOWNSHIPS[0])).toBe('Vračar');
    expect(townshipShortName(TOWNSHIPS[4])).toBe('Vlasotince');
  });

  it('keeps names without a city, or that are only the city', () => {
    expect(townshipShortName({ id: 1, ime: 'Zemun' })).toBe('Zemun');
    expect(townshipShortName({ id: 1, ime: 'Beograd', city_name: 'Beograd' })).toBe('Beograd');
  });
});

describe('groupTownships', () => {
  it('gives each city with several townships a group, then the one-township towns by name', () => {
    expect(groupTownships(TOWNSHIPS)).toEqual([
      {
        key: 'id:1',
        city: 'Beograd',
        allIds: [1, 2],
        rows: [
          { id: 1, name: 'Vračar' },
          { id: 2, name: 'Voždovac' },
        ],
      },
      {
        key: 'id:2',
        city: 'Niš',
        allIds: [15, 16],
        rows: [
          { id: 15, name: 'Medijana' },
          { id: 16, name: 'Palilula' },
        ],
      },
      {
        key: 'other',
        city: null,
        allIds: [22, 20, 21],
        rows: [
          { id: 22, name: 'Subotica' },
          { id: 20, name: 'Vlasotince' },
          { id: 21, name: 'Zlatibor' },
        ],
      },
    ]);
  });

  it('searches the full name without case or diacritics, and keeps the whole city for "whole city"', () => {
    const groups = groupTownships(TOWNSHIPS, 'vozd');
    expect(groups).toEqual([{ key: 'id:1', city: 'Beograd', allIds: [1, 2], rows: [{ id: 2, name: 'Voždovac' }] }]);
    expect(groupTownships(TOWNSHIPS, 'nis').map((g) => g.rows.length)).toEqual([2]);
    expect(groupTownships(TOWNSHIPS, 'xyz')).toEqual([]);
  });
});

describe('spansSeveralCities', () => {
  it('is false for one city (the vets page passes the chosen city only)', () => {
    expect(spansSeveralCities(TOWNSHIPS.slice(0, 2))).toBe(false);
    expect(spansSeveralCities(TOWNSHIPS)).toBe(true);
  });
});

describe('summarizeTownships', () => {
  it('turns a complete city into the city, and leaves the rest as townships', () => {
    expect(summarizeTownships([1, 2, 15, 21], TOWNSHIPS)).toEqual({
      cities: [
        { cityId: 1, name: 'Beograd', ids: [1, 2] },
        { cityId: 14, name: 'Zlatibor', ids: [21] },
      ],
      rest: [TOWNSHIPS[2]],
    });
  });

  it('ignores ids it does not know', () => {
    expect(summarizeTownships([999], TOWNSHIPS)).toEqual({ cities: [], rest: [] });
  });
});
