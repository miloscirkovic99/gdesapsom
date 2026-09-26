import { readingMinutes } from './reading-time';

describe('readingMinutes', () => {
  it('counts words of the text, not the markup', () => {
    const words = Array.from({ length: 600 }, () => 'reč').join(' ');
    expect(readingMinutes(`<p><strong>${words}</strong></p>`)).toBe(3);
  });

  it('is at least one minute', () => {
    expect(readingMinutes('<p>Kratko.</p>')).toBe(1);
    expect(readingMinutes(null)).toBe(1);
  });
});
