import { parseStoredList, pushRecent, searchKey } from './recent-list';

const isString = (entry: unknown): entry is string => typeof entry === 'string';

describe('pushRecent', () => {
  it('puts the new item first', () => {
    expect(pushRecent(['a', 'b'], 'c', (x) => x, 5)).toEqual(['c', 'a', 'b']);
  });

  it('moves an existing item to the front instead of duplicating it', () => {
    expect(pushRecent(['a', 'b', 'c'], 'b', (x) => x, 5)).toEqual(['b', 'a', 'c']);
  });

  it('keeps at most max entries', () => {
    expect(pushRecent(['a', 'b', 'c'], 'd', (x) => x, 3)).toEqual(['d', 'a', 'b']);
  });

  it('compares by key', () => {
    const list = [{ id: 1, name: 'old' }];
    expect(pushRecent(list, { id: 1, name: 'new' }, (s) => String(s.id), 5)).toEqual([{ id: 1, name: 'new' }]);
  });
});

describe('searchKey', () => {
  it('ignores case and surrounding space', () => {
    expect(searchKey(' Dorćol ')).toBe(searchKey('dorćol'));
  });
});

describe('parseStoredList', () => {
  it('returns [] for missing or broken values', () => {
    expect(parseStoredList(null, isString)).toEqual([]);
    expect(parseStoredList('{not json', isString)).toEqual([]);
    expect(parseStoredList('{"a":1}', isString)).toEqual([]);
  });

  it('drops entries of the wrong shape', () => {
    expect(parseStoredList('["a", 1, "b"]', isString)).toEqual(['a', 'b']);
  });
});
