import { cleanApiText } from './api-text';

describe('cleanApiText', () => {
  it('trims the text', () => {
    expect(cleanApiText('  Kafić Supa  ')).toBe('Kafić Supa');
  });

  it.each([null, undefined, '', '   ', 'null', 'NULL', ' null ', 42, {}])('returns null for %p', (value) => {
    expect(cleanApiText(value)).toBeNull();
  });

  it('keeps text that only contains the word null', () => {
    expect(cleanApiText('null ili nešto drugo')).toBe('null ili nešto drugo');
  });
});
