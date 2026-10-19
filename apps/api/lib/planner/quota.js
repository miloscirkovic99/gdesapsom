/**
 * Weekly plan quota in a sliding 7-day window: 3 plans per device and 15 per
 * network, counted in planner_quota (device_hash, ip_hash, plan_id, created_at).
 *
 * Reserve first, count second. A request inserts its own row and only then
 * counts, so two requests racing for the last slot both see each other and at
 * worst both are refused; neither order lets the limit be exceeded. For that
 * the row has to be visible to the other request before the count, which is
 * why `store.commit` runs between the two (MARS wraps each script in one
 * transaction, and an uncommitted row is invisible to other connections).
 *
 * A refused request deletes its row; so does a request whose plan fails.
 * Cached plans count like new ones.
 *
 * A reservation is identified by the id the new plan will get (`planId`,
 * generated before anything else), so no auto-increment value has to be read
 * back; a cached plan re-points it to the cached plan's id.
 *
 * @typedef {{
 *   insert(row: { deviceHash: string, ipHash: string, at: number, planId: string }): string,
 *   countDevice(deviceHash: string, sinceMs: number): number,
 *   countNetwork(ipHash: string, sinceMs: number): number,
 *   oldestDevice(deviceHash: string, sinceMs: number): number | null,
 *   oldestNetwork(ipHash: string, sinceMs: number): number | null,
 *   remove(id: string): void,
 *   attach(id: string, planId: string): void,
 *   commit?(): void,
 * }} QuotaStore
 */
const { DAY_MS } = require('./time');
const { LIMITS } = require('./config');

const WINDOW_MS = LIMITS.windowDays * DAY_MS;

/**
 * @param {QuotaStore} store
 * @returns {{ ok: true, id: string, remaining: number, nextAt: number | null }
 *         | { ok: false, reason: 'device' | 'network', nextAt: number }}
 */
function reserve(store, { deviceHash, ipHash, now, planId }) {
  const since = now - WINDOW_MS;
  const id = store.insert({ deviceHash, ipHash, at: now, planId });
  if (store.commit) store.commit();

  const device = store.countDevice(deviceHash, since);
  const network = store.countNetwork(ipHash, since);

  if (device > LIMITS.perDevice || network > LIMITS.perNetwork) {
    release(store, id);
    const reason = device > LIMITS.perDevice ? 'device' : 'network';
    const oldest = reason === 'device' ? store.oldestDevice(deviceHash, since) : store.oldestNetwork(ipHash, since);
    return { ok: false, reason, nextAt: (oldest === null ? now : oldest) + WINDOW_MS };
  }

  const remaining = Math.max(0, LIMITS.perDevice - device);
  return { ok: true, id, remaining, nextAt: remaining > 0 ? null : nextFreeSlot(store, deviceHash, since, now) };
}

/** Undo a reservation: the plan failed or the request was refused. */
function release(store, id) {
  store.remove(id);
  if (store.commit) store.commit();
}

/** Tie the reservation to the plan it paid for. */
function confirm(store, id, planId) {
  store.attach(id, planId);
}

/** What the device has left, without reserving anything (for the form). */
function status(store, { deviceHash, now }) {
  const since = now - WINDOW_MS;
  const used = deviceHash ? store.countDevice(deviceHash, since) : 0;
  const remaining = Math.max(0, LIMITS.perDevice - used);
  return { remaining, nextAt: remaining > 0 ? null : nextFreeSlot(store, deviceHash, since, now) };
}

function nextFreeSlot(store, deviceHash, since, now) {
  const oldest = store.oldestDevice(deviceHash, since);
  return (oldest === null ? now : oldest) + WINDOW_MS;
}

module.exports = { reserve, release, confirm, status, WINDOW_MS };
