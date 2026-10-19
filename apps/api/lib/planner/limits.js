/**
 * Small guards around a planner request: the in-memory cooldown per network,
 * the daily AI budget, and the hashed identities that are all the database
 * ever sees of a visitor.
 */
const { LIMITS } = require('./config');
const { belgradeLocal, belgradeMidnightUtc, DAY_MS } = require('./time');

/**
 * At most one request per key in `seconds`. Lives in the memory of one
 * process: a restart or a second instance starts from zero, which is fine for
 * a guard against double clicks and scripted bursts (the weekly quota is the
 * real limit, and it is in the database).
 */
function createCooldown({ seconds = LIMITS.cooldownSeconds, maxKeys = 10000 } = {}) {
  const lastSeen = new Map();

  return {
    /** @returns {{ ok: true } | { ok: false, retryAfterSeconds: number }} */
    hit(key, nowMs) {
      const windowMs = seconds * 1000;
      const previous = lastSeen.get(key);
      if (previous !== undefined && nowMs - previous < windowMs) {
        return { ok: false, retryAfterSeconds: Math.ceil((windowMs - (nowMs - previous)) / 1000) };
      }
      if (lastSeen.size >= maxKeys) {
        for (const [entry, at] of lastSeen) if (nowMs - at >= windowMs) lastSeen.delete(entry);
        if (lastSeen.size >= maxKeys) lastSeen.clear();
      }
      lastSeen.set(key, nowMs);
      return { ok: true };
    },
  };
}

/** PLANNER_DAILY_BUDGET_USD as a number; a missing or broken value means no paid model. */
function parseBudget(value) {
  const budget = Number(value);
  return Number.isFinite(budget) && budget >= 0 ? budget : 0;
}

/** [from, to) in UTC ms of "today" in Belgrade, for summing today's cost_usd. */
function belgradeDayRange(nowMs) {
  const from = belgradeMidnightUtc(belgradeLocal(nowMs).date);
  const tomorrow = belgradeLocal(from + DAY_MS + 3 * 60 * 60 * 1000).date;
  return { from, to: belgradeMidnightUtc(tomorrow) };
}

/** Whether the paid step of the cascade may run. */
function budgetAllows(spentTodayUsd, budgetUsd) {
  return Number(spentTodayUsd) < budgetUsd;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function isUuidV4(value) {
  return typeof value === 'string' && UUID_V4.test(value.toLowerCase());
}

/**
 * The stored identities: HMAC-SHA256 under PLANNER_HMAC_SECRET with a
 * purpose prefix, so the same secret never yields the same hash for a device
 * id and an address.
 *
 * @param {(message: string) => string} hmacHex HMAC-SHA256(PLANNER_HMAC_SECRET, message) as 64 hex chars
 */
function identityHashes(hmacHex, { deviceId, networkKey }) {
  return { deviceHash: hmacHex(`device:${deviceId}`), ipHash: hmacHex(`net:${networkKey}`) };
}

module.exports = { createCooldown, parseBudget, belgradeDayRange, budgetAllows, isUuidV4, identityHashes };
