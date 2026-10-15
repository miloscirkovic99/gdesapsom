import { readFileSync } from 'fs';
import { join } from 'path';

const load = (lang: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(__dirname, '../../i18n', `${lang}.json`), 'utf8'));

/** A key missing from one file shows its raw name on the page in that language. */
describe('translation files', () => {
  const rs = load('rs');
  const en = load('en');

  it('have the same keys in Serbian and English', () => {
    expect(Object.keys(en).filter((key) => !(key in rs))).toEqual([]);
    expect(Object.keys(rs).filter((key) => !(key in en))).toEqual([]);
  });

  it('have no empty texts', () => {
    const empty = (file: Record<string, unknown>) =>
      Object.entries(file)
        .filter(([, value]) => typeof value !== 'string' || !value.trim())
        .map(([key]) => key);
    expect(empty(rs)).toEqual([]);
    expect(empty(en)).toEqual([]);
  });
});
