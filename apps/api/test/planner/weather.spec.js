const { cacheTtlMs, forecastCacheKey, forecastRequest, summarizeDay } = require('../../lib/planner/weather');
const { metForecast } = require('./fixtures');

describe('MET Norway request', () => {
  it('sends at most 4 decimals and the configured User-Agent', () => {
    const request = forecastRequest(44.812345678, 20.46119999, 'gdesapsom.com planer@gdesapsom.com');
    expect(request.url).toBe('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=44.8123&lon=20.4612');
    expect(request.headers['User-Agent']).toBe('gdesapsom.com planer@gdesapsom.com');
    expect(forecastCacheKey(44.812345678, 20.46119999)).toBe('met:44.8123,20.4612');
  });

  it('refuses to call without a User-Agent', () => {
    expect(() => forecastRequest(44.8, 20.4, '')).toThrow('MET_NO_USER_AGENT');
  });

  it('caches until Expires, but at least an hour', () => {
    const now = Date.parse('2026-11-14T10:00:00Z');
    expect(cacheTtlMs('Sat, 14 Nov 2026 10:20:00 GMT', now)).toBe(60 * 60 * 1000);
    expect(cacheTtlMs('Sat, 14 Nov 2026 13:00:00 GMT', now)).toBe(3 * 60 * 60 * 1000);
    expect(cacheTtlMs(null, now)).toBe(60 * 60 * 1000);
  });
});

describe('summarizeDay', () => {
  it('takes 08–20 h Belgrade time (UTC+1 in winter)', () => {
    // Hour h UTC is h+1 local: the warm hours at 06:00 UTC (07 local) and 20:00 UTC (21 local) are outside.
    const forecast = metForecast('2026-11-14', { temp: (h) => (h === 6 || h === 20 ? 40 : h) });
    const day = summarizeDay(forecast, '2026-11-14');
    expect(day.tMin).toBe(7);
    expect(day.tMax).toBe(19);
    expect(day.hot).toBe(false);
  });

  it('flags rain, cold and heat', () => {
    expect(summarizeDay(metForecast('2026-11-14', { temp: 3, precipitation: 0.2 }), '2026-11-14')).toMatchObject({ cold: true, rainy: true, precipitationMm: 2.6 });
    expect(summarizeDay(metForecast('2026-11-14', { temp: 8, symbol: 'lightsnow' }), '2026-11-14')).toMatchObject({ rainy: true, cold: false });
    expect(summarizeDay(metForecast('2026-07-14', { temp: 29 }), '2026-07-14')).toMatchObject({ hot: true });
  });

  it('is null when the forecast does not reach the day', () => {
    expect(summarizeDay(metForecast('2026-11-14'), '2026-11-30')).toBeNull();
    expect(summarizeDay({}, '2026-11-14')).toBeNull();
  });
});
