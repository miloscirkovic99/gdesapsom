import { convertToParamMap } from '@angular/router';
import type { SpotType, Township } from '@gde/shared/data-access';
import { categoryForSpotType, cityArea, spotTypeIdsByName } from './place-groups';
import {
  freshLink,
  linkKey,
  linkNeeds,
  placesQueryParams,
  readPlacesLink,
  resolvePlacesLink,
} from './place-links';

const TYPES: SpotType[] = [
  { id: 1, ime: 'Kafić' },
  { id: 2, ime: 'Restoran' },
  { id: 3, ime: 'Splav' },
  { id: 9, ime: 'Kafeterija' },
];

const TOWNSHIPS: Township[] = [
  { id: 1, grd_id: 1, ime: 'Vračar, Beograd', city_name: 'Beograd' },
  { id: 2, grd_id: 1, ime: 'Zemun, Beograd', city_name: 'Beograd' },
  { id: 20, grd_id: 3, ime: 'Novi Sad, Novi Sad', city_name: 'Novi Sad' },
  { id: 21, grd_id: 3, ime: 'Futog, Novi Sad', city_name: 'Novi Sad' },
];

describe('place groups', () => {
  it('finds the category of a venue type, without case or diacritics', () => {
    expect(categoryForSpotType('Kafeterija')?.slug).toBe('kafici');
    expect(categoryForSpotType('splav')?.slug).toBe('restorani');
    expect(categoryForSpotType('Teretana')).toBeNull();
    expect(categoryForSpotType(null)).toBeNull();
  });

  it('maps venue type names to ids', () => {
    expect(spotTypeIdsByName(['Kafic', 'Kafeterija', 'Pab'], TYPES)).toEqual([1, 9]);
  });

  it('finds a city by website slug, name or id, from the township list', () => {
    const novi = { cityId: 3, name: 'Novi Sad', townshipIds: [20, 21] };
    expect(cityArea('novi-sad', TOWNSHIPS)).toEqual(novi);
    expect(cityArea('NOVI SAD', TOWNSHIPS)).toEqual(novi);
    expect(cityArea('3', TOWNSHIPS)).toEqual(novi);
    expect(cityArea('Kraljevo', TOWNSHIPS)).toBeNull();
    expect(cityArea('', TOWNSHIPS)).toBeNull();
  });
});

describe('readPlacesLink', () => {
  it('reads categories, venue types, the city and the word', () => {
    const params = convertToParamMap({
      segment: 'venues',
      category: 'kafici,restorani',
      spotType: 'Hotel',
      city: 'novi-sad',
      word: ' bar ',
    });
    expect(readPlacesLink(params)).toEqual({
      word: 'bar',
      categories: ['kafici', 'restorani'],
      spotTypes: ['Hotel'],
      city: 'novi-sad',
    });
  });

  it('is null for a link that asks for no search', () => {
    expect(readPlacesLink(convertToParamMap({ segment: 'parks' }))).toBeNull();
  });

  it('takes an empty word as a search for everything', () => {
    expect(readPlacesLink(convertToParamMap({ word: '' }))).toEqual({
      word: null,
      categories: [],
      spotTypes: [],
      city: null,
    });
  });
});

describe('linkNeeds', () => {
  it('waits for the venue types and townships the link names', () => {
    expect(linkNeeds({ word: 'x', categories: [], spotTypes: [], city: null })).toEqual({
      spotTypes: false,
      townships: false,
    });
    expect(linkNeeds({ word: null, categories: ['kafici'], spotTypes: [], city: 'beograd' })).toEqual({
      spotTypes: true,
      townships: true,
    });
  });
});

describe('resolvePlacesLink', () => {
  it('turns a category and a city into venue types and townships', () => {
    const resolved = resolvePlacesLink(
      { word: null, categories: ['kafici'], spotTypes: ['Restoran', 'Kafić'], city: 'beograd' },
      TYPES,
      TOWNSHIPS,
    );
    expect(resolved.spotTypeIds).toEqual([1, 2, 9]);
    expect(resolved.townshipIds).toEqual([1, 2]);
    expect(resolved.city?.name).toBe('Beograd');
  });

  it('does not filter by a category or city it does not know', () => {
    const resolved = resolvePlacesLink(
      { word: 'x', categories: ['teretane'], spotTypes: [], city: 'Kraljevo' },
      TYPES,
      TOWNSHIPS,
    );
    expect(resolved).toEqual({ word: 'x', spotTypeIds: [], townshipIds: [], city: null });
  });
});

describe('linkKey', () => {
  it('is the same for the params Ionic hands back, whatever else the URL carries', () => {
    const link = { segment: 'venues', category: 'kafici' };
    expect(linkKey(convertToParamMap(link))).toBe(linkKey(convertToParamMap({ ...link, utm_source: 'x' })));
  });

  it('tells a fresh tap on the same link apart', () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(1).mockReturnValueOnce(2);
    const link = { segment: 'parks' };
    expect(linkKey(convertToParamMap(freshLink(link)))).not.toBe(linkKey(convertToParamMap(freshLink(link))));
  });
});

describe('placesQueryParams', () => {
  it('opens the venue list with what is given', () => {
    expect(placesQueryParams({ category: 'kafici', city: 'Novi Sad' })).toEqual({
      segment: 'venues',
      category: 'kafici',
      city: 'Novi Sad',
    });
    expect(placesQueryParams({ city: null })).toEqual({ segment: 'venues' });
  });
});
