import { formatDistance } from './format-distance';

describe('formatDistance', () => {
  it('is null without a distance', () => {
    expect(formatDistance(undefined, 'rs')).toBeNull();
    expect(formatDistance(null, 'rs')).toBeNull();
    expect(formatDistance(Number.NaN, 'rs')).toBeNull();
  });

  it('rounds short distances to 10 m', () => {
    expect(formatDistance(847, 'rs')).toBe('850 m');
  });

  it('shows kilometres with the language decimal separator', () => {
    expect(formatDistance(2440, 'rs')).toBe('2,4 km');
    expect(formatDistance(2440, 'en')).toBe('2.4 km');
  });
});
