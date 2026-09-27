import { dataUrlBytes } from './photo';

describe('dataUrlBytes', () => {
  it('counts decoded bytes, not base64 characters', () => {
    // "hello" = 5 bytes = "aGVsbG8=" in base64
    expect(dataUrlBytes('data:text/plain;base64,aGVsbG8=')).toBe(5);
    // "hi" = 2 bytes = "aGk="
    expect(dataUrlBytes('data:text/plain;base64,aGk=')).toBe(2);
    // "abc" = 3 bytes, no padding
    expect(dataUrlBytes('data:text/plain;base64,YWJj')).toBe(3);
  });
});
