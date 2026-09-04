import {
  ItemCategory,
  SearchCategory,
  toItemCategory,
  toSearchCategory,
  toSlug,
} from './analytics.taxonomy';

describe('analytics taxonomy', () => {
  describe('toItemCategory', () => {
    it.each([
      ['Kafić', ItemCategory.cafe],
      ['kafic', ItemCategory.cafe],
      ['Kafeterija', ItemCategory.cafe],
      ['Restoran', ItemCategory.restaurant],
      ['Splav', ItemCategory.restaurant],
      ['Pab', ItemCategory.bar],
      ['Bar', ItemCategory.bar],
      ['Hotel', ItemCategory.accommodation],
      ['Motel', ItemCategory.accommodation],
      ['Apartman', ItemCategory.accommodation],
      ['Teretana', ItemCategory.activity],
      ['Ostalo', ItemCategory.other],
    ])('maps backend label %s to %s', (label, expected) => {
      expect(toItemCategory(label)).toBe(expected);
    });

    it('is case and whitespace insensitive', () => {
      expect(toItemCategory('  HOTEL ')).toBe(ItemCategory.accommodation);
    });

    it('never leaks unknown backend strings', () => {
      expect(toItemCategory('Smeštaj')).toBe(ItemCategory.other);
      expect(toItemCategory(null)).toBe(ItemCategory.other);
      expect(toItemCategory('')).toBe(ItemCategory.other);
    });
  });

  describe('toSearchCategory', () => {
    it('treats no filter as "all"', () => {
      expect(toSearchCategory(null)).toBe(SearchCategory.all);
      expect(toSearchCategory(undefined)).toBe(SearchCategory.all);
    });

    it('otherwise behaves like toItemCategory', () => {
      expect(toSearchCategory('Restoran')).toBe(SearchCategory.restaurant);
    });
  });

  describe('toSlug', () => {
    it('produces stable ASCII snake_case tokens', () => {
      expect(toSlug('Saveti za Šetnju')).toBe('saveti_za_setnju');
      expect(toSlug('Putovanja & Đubre')).toBe('putovanja_dubre');
      expect(toSlug('  Ishrana  ')).toBe('ishrana');
    });

    it('returns null for empty input', () => {
      expect(toSlug('')).toBeNull();
      expect(toSlug('   ')).toBeNull();
      expect(toSlug(null)).toBeNull();
    });
  });
});
