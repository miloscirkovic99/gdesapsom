import {
  appleMapsDirectionsUrl,
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
  parseCoordinates,
  wazeDirectionsUrl,
} from './maps-links';

describe('parseCoordinates', () => {
  it('parses the text columns the API returns', () => {
    expect(parseCoordinates('44.8125', '20.4612')).toEqual({ latitude: 44.8125, longitude: 20.4612 });
    expect(parseCoordinates(44.8, 20.4)).toEqual({ latitude: 44.8, longitude: 20.4 });
  });

  it.each([
    [null, null],
    ['', ''],
    ['44.8', null],
    ['abc', '20.4'],
    ['0', '0'],
    ['95', '20'],
  ])('returns null for %p, %p', (lat, lon) => {
    expect(parseCoordinates(lat, lon)).toBeNull();
  });
});

describe('directions links', () => {
  const c = { latitude: 44.8125, longitude: 20.4612 };

  it('builds each provider URL from the coordinates', () => {
    expect(googleMapsDirectionsUrl(c)).toBe('https://www.google.com/maps/dir/?api=1&destination=44.8125,20.4612');
    expect(wazeDirectionsUrl(c)).toBe('https://waze.com/ul?ll=44.8125,20.4612&navigate=yes');
    expect(appleMapsDirectionsUrl(c)).toBe('https://maps.apple.com/?daddr=44.8125,20.4612');
  });

  it('encodes a free-text search', () => {
    expect(googleMapsSearchUrl('Park Ušće, Beograd')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Park%20U%C5%A1%C4%87e%2C%20Beograd',
    );
  });
});
