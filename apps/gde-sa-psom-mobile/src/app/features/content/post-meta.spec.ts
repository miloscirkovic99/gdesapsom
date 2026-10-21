import { formatPostDate, postTags } from './post-meta';

describe('formatPostDate', () => {
  it('writes the Serbian date with spaced dots', () => {
    expect(formatPostDate('2026-10-01 09:15:00', 'rs')).toBe('1. 10. 2026.');
  });

  it('writes the English date with a short month name', () => {
    expect(formatPostDate('2026-10-01 09:15:00', 'en')).toBe('Oct 1, 2026');
  });

  it('keeps the calendar day of a late-evening post', () => {
    expect(formatPostDate('2026-08-10 23:30:00', 'rs')).toBe('10. 8. 2026.');
    expect(formatPostDate('2026-08-10T23:30:00Z', 'en')).toBe('Aug 10, 2026');
  });

  it('is empty for a missing or malformed date', () => {
    expect(formatPostDate(null, 'rs')).toBe('');
    expect(formatPostDate('', 'en')).toBe('');
    expect(formatPostDate('juče', 'rs')).toBe('');
  });
});

describe('postTags', () => {
  it('splits and trims the comma-separated tags, skipping empty ones', () => {
    expect(postTags('izlet, kopaonik,, paraziti ,')).toEqual(['izlet', 'kopaonik', 'paraziti']);
  });

  it('is empty when the post has no tags', () => {
    expect(postTags(null)).toEqual([]);
    expect(postTags('  ')).toEqual([]);
  });
});
