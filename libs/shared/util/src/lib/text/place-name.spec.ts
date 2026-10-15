import { foldPlaceName, placeLocative } from './place-name';

describe('foldPlaceName', () => {
  it.each([
    ['Novi Sad', 'novi sad'],
    ['  NOVI   Sad ', 'novi sad'],
    ['Niš', 'nis'],
    ['Čačak', 'cacak'],
    ['Aranđelovac', 'arandjelovac'],
    ['Kafić', 'kafic'],
  ])('folds %p to %p', (value, folded) => {
    expect(foldPlaceName(value)).toBe(folded);
  });

  it.each([null, undefined, ''])('returns an empty key for %p', (value) => {
    expect(foldPlaceName(value)).toBe('');
  });
});

describe('placeLocative', () => {
  it.each([
    ['Beograd', 'u Beogradu'],
    ['Novi Sad', 'u Novom Sadu'],
    ['novi sad', 'u Novom Sadu'],
    ['Nis', 'u Nišu'],
    ['Kragujevac', 'u Kragujevcu'],
    ['Šabac', 'u Šapcu'],
    ['Divčibare', 'na Divčibarama'],
    ['Zlatibor', 'na Zlatiboru'],
  ])('gives the locative of %p', (name, locative) => {
    expect(placeLocative(name)).toBe(locative);
  });

  it('returns null for a place it does not know, rather than a wrong case', () => {
    expect(placeLocative('Mesto koje ne postoji')).toBeNull();
    expect(placeLocative(null)).toBeNull();
  });
});
