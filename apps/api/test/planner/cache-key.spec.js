const { createHash } = require('crypto');
const { canonicalJson, plannerCacheKey, temperatureBucket } = require('../../lib/planner/cache-key');

const sha256Hex = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const params = { mode: 'dan', grad: 'beograd', datum: '2026-11-14', velicina: 'srednji', energija: 'visoka', osetljiv_na_vrucinu: false, tip_dana: 'aktivan' };

describe('planner cache key', () => {
  it('does not depend on key order', () => {
    const shuffled = Object.fromEntries(Object.entries(params).reverse());
    expect(plannerCacheKey(shuffled, 12, sha256Hex)).toBe(plannerCacheKey(params, 12, sha256Hex));
    expect(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: 2 }], c: null } })).toBe('{"a":{"c":null,"d":[2,{"y":2,"z":1}]},"b":1}');
  });

  it('rounds the temperature to 5 °C', () => {
    expect([12.4, 12.5, 23.4, -2.4, -2.6, -0.4, null].map(temperatureBucket)).toEqual([10, 15, 25, 0, -5, 0, null]);
    expect(plannerCacheKey(params, 11, sha256Hex)).toBe(plannerCacheKey(params, 8, sha256Hex));
    expect(plannerCacheKey(params, 11, sha256Hex)).not.toBe(plannerCacheKey(params, 13, sha256Hex));
  });

  it('changes with any parameter', () => {
    expect(plannerCacheKey({ ...params, velicina: 'veliki' }, 12, sha256Hex)).not.toBe(plannerCacheKey(params, 12, sha256Hex));
    expect(plannerCacheKey({ ...params, datum: '2026-11-15' }, 12, sha256Hex)).not.toBe(plannerCacheKey(params, 12, sha256Hex));
  });

  it('is a 64-character SHA-256 hex digest', () => {
    expect(plannerCacheKey(params, null, sha256Hex)).toMatch(/^[0-9a-f]{64}$/);
  });
});
