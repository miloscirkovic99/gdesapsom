import { venueLinkType } from './link-type';

describe('venueLinkType', () => {
  it.each([
    'https://www.instagram.com/kafic_supa/',
    'https://m.facebook.com/kaficsupa',
    'https://fb.me/kafic',
    'https://www.tiktok.com/@kafic',
    'instagram.com/kafic_supa',
  ])('treats %s as a social profile', (url) => {
    expect(venueLinkType(url)).toBe('social');
  });

  it.each([
    'https://www.kafic-supa.rs',
    'kafic-supa.rs/meni',
    'https://notinstagram.com/x',
    'https://instagram.com.evil.example/x',
  ])('treats %s as the venue website', (url) => {
    expect(venueLinkType(url)).toBe('venue_website');
  });

  it.each([null, undefined, '', '   ', 'http://[bad'])('falls back to venue_website for %s', (url) => {
    expect(venueLinkType(url)).toBe('venue_website');
  });
});
