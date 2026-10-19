const { createHmac } = require('crypto');
const { belgradeDayRange, budgetAllows, createCooldown, identityHashes, isUuidV4, parseBudget } = require('../../lib/planner/limits');
const { isOpenAt, parseHours } = require('../../lib/planner/hours');
const { belgradeLocal } = require('../../lib/planner/time');

describe('cooldown: one request per 10 s per network', () => {
  it('refuses a second request inside 10 s and allows it after', () => {
    const cooldown = createCooldown({ seconds: 10 });
    const t = 1_000_000;
    expect(cooldown.hit('net-a', t)).toEqual({ ok: true });
    expect(cooldown.hit('net-a', t + 9_000)).toEqual({ ok: false, retryAfterSeconds: 1 });
    expect(cooldown.hit('net-b', t + 9_000)).toEqual({ ok: true });
    expect(cooldown.hit('net-a', t + 10_000)).toEqual({ ok: true });
  });

  it('stays bounded in memory', () => {
    const cooldown = createCooldown({ seconds: 10, maxKeys: 3 });
    ['a', 'b', 'c'].forEach((key) => cooldown.hit(key, 0));
    expect(cooldown.hit('d', 5_000)).toEqual({ ok: true });
    expect(cooldown.hit('d', 6_000).ok).toBe(false);
  });
});

describe('daily budget', () => {
  it('reads PLANNER_DAILY_BUDGET_USD, and anything broken means zero', () => {
    expect(parseBudget('0.30')).toBe(0.3);
    expect([undefined, '', 'abc', '-1'].map(parseBudget)).toEqual([0, 0, 0, 0]);
  });

  it('allows the paid model only while today is strictly under the budget', () => {
    expect(budgetAllows(0.29, 0.3)).toBe(true);
    expect(budgetAllows('0.300000', 0.3)).toBe(false);
  });

  it('"today" is the Belgrade day, also across the clock change', () => {
    // 23:30 UTC on 14 Nov is already 15 Nov in Belgrade (UTC+1).
    const winter = belgradeDayRange(Date.UTC(2026, 10, 14, 23, 30));
    expect(new Date(winter.from).toISOString()).toBe('2026-11-14T23:00:00.000Z');
    expect(winter.to - winter.from).toBe(24 * 3600 * 1000);

    // 25 Oct 2026 is the last Sunday of October: a 25-hour day.
    const changeover = belgradeDayRange(Date.UTC(2026, 9, 25, 12, 0));
    expect(new Date(changeover.from).toISOString()).toBe('2026-10-24T22:00:00.000Z');
    expect(changeover.to - changeover.from).toBe(25 * 3600 * 1000);
    expect(belgradeLocal(Date.UTC(2026, 6, 1, 22, 30)).date).toBe('2026-07-02');
  });
});

describe('identities', () => {
  const hmac = (message) => createHmac('sha256', 'test-secret').update(message).digest('hex');

  it('stores only HMACs, separated by purpose', () => {
    const { deviceHash, ipHash } = identityHashes(hmac, { deviceId: '0b1f9a4e-7c2d-4f4b-9a7e-1d2c3b4a5f60', networkKey: '203.0.113.7' });
    expect(deviceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(ipHash).not.toContain('203');
    expect(identityHashes(hmac, { deviceId: 'x', networkKey: 'x' }).deviceHash).not.toBe(identityHashes(hmac, { deviceId: 'x', networkKey: 'x' }).ipHash);
  });

  it('accepts only a UUID v4 as a device id', () => {
    expect(isUuidV4('0b1f9a4e-7c2d-4f4b-9a7e-1d2c3b4a5f60')).toBe(true);
    expect(isUuidV4('0b1f9a4e-7c2d-1f4b-9a7e-1d2c3b4a5f60')).toBe(false);
    expect(isUuidV4('../../etc/passwd')).toBe(false);
  });
});

describe('opening hours', () => {
  const hours = parseHours('{"pet":[["18:00","02:00"]],"sub":[["10:00","14:00"]],"ned":[]}');

  it('handles intervals past midnight', () => {
    expect(isOpenAt(hours, '2026-11-13', '23:30')).toBe(true); // Friday
    expect(isOpenAt(hours, '2026-11-14', '01:30')).toBe(true); // Saturday, from Friday night
    expect(isOpenAt(hours, '2026-11-14', '02:00')).toBe(false);
    expect(isOpenAt(hours, '2026-11-14', '12:00')).toBe(true);
    expect(isOpenAt(hours, '2026-11-15', '12:00')).toBe(false); // Sunday: closed
    expect(isOpenAt(hours, '2026-11-16', '12:00')).toBeNull(); // Monday: unknown
  });

  it('treats malformed JSON as unknown', () => {
    expect(parseHours('{"pon":"cele nedelje"}')).toBeNull();
    expect(parseHours('{"pon":[["8","23"]]}')).toBeNull();
    expect(parseHours('nije json')).toBeNull();
    expect(parseHours(null)).toBeNull();
  });
});
