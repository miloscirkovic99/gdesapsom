/**
 * Every SQL statement of the planner, always with `?` parameters.
 *
 * `db` is { query(sql, ...args) → plain row objects, commit?() }; the
 * handlers build it from MARS (lib/planner/runtime.js), the tests from a
 * local MariaDB.
 *
 * Times are written as UTC 'YYYY-MM-DD HH:MM:SS[.mmm]' strings and read back
 * as milliseconds computed in SQL (TIMESTAMPDIFF from the epoch), so neither
 * the session time zone nor the driver's date conversion can shift them.
 */
const { num, utcDateTime } = require('../http-helpers');
const { CITIES, DESTINATIONS, LIMITS } = require('./config');
const { DAY_MS } = require('./time');
const { PLACE_COLUMNS } = require('./places');

const EPOCH_MS = (column) => `TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', ${column}) DIV 1000`;
const PLACE_SELECT = `SELECT ${PLACE_COLUMNS.join(', ')} FROM planner_mesta`;

/** At most this many rows per candidate query; a city has far fewer places. */
const MAX_CANDIDATE_ROWS = 2000;

const first = (rows) => (rows && rows.length ? rows[0] : null);

/** A JSON column: MariaDB hands it over as text. */
function parseJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** lib/planner/quota.js `QuotaStore` over planner_quota. */
function quotaStore(db) {
  const msOrNull = (rows) => {
    const row = first(rows);
    return row ? num(row.ms) : null;
  };
  return {
    insert({ deviceHash, ipHash, at, planId }) {
      db.query(
        'INSERT INTO planner_quota (device_hash, ip_hash, plan_id, created_at) VALUES (?, ?, ?, ?)',
        deviceHash,
        ipHash,
        planId,
        utcDateTime(at, true),
      );
      return planId;
    },
    countDevice(deviceHash, sinceMs) {
      return num(first(db.query('SELECT COUNT(*) AS n FROM planner_quota WHERE device_hash = ? AND created_at > ?', deviceHash, utcDateTime(sinceMs, true))).n) || 0;
    },
    countNetwork(ipHash, sinceMs) {
      return num(first(db.query('SELECT COUNT(*) AS n FROM planner_quota WHERE ip_hash = ? AND created_at > ?', ipHash, utcDateTime(sinceMs, true))).n) || 0;
    },
    oldestDevice(deviceHash, sinceMs) {
      return msOrNull(db.query(`SELECT ${EPOCH_MS('MIN(created_at)')} AS ms FROM planner_quota WHERE device_hash = ? AND created_at > ?`, deviceHash, utcDateTime(sinceMs, true)));
    },
    oldestNetwork(ipHash, sinceMs) {
      return msOrNull(db.query(`SELECT ${EPOCH_MS('MIN(created_at)')} AS ms FROM planner_quota WHERE ip_hash = ? AND created_at > ?`, ipHash, utcDateTime(sinceMs, true)));
    },
    remove(id) {
      db.query('DELETE FROM planner_quota WHERE plan_id = ?', id);
    },
    attach(id, planId) {
      if (id !== planId) db.query('UPDATE planner_quota SET plan_id = ? WHERE plan_id = ?', planId, id);
    },
    commit: db.commit ? () => db.commit() : undefined,
  };
}

/** Last reservation from this network, for the cooldown when process memory does not survive between requests. */
function lastNetworkRequestMs(db, ipHash) {
  const row = first(db.query(`SELECT ${EPOCH_MS('MAX(created_at)')} AS ms FROM planner_quota WHERE ip_hash = ?`, ipHash));
  return row ? num(row.ms) : null;
}

function readPlan(row) {
  if (!row) return null;
  return {
    id: row.id,
    params: parseJson(row.params),
    result: parseJson(row.result),
    mode: row.mode,
    provider: row.provider,
    createdAt: num(row.created_ms),
  };
}

const PLAN_SELECT = `SELECT id, params, result, mode, provider, ${EPOCH_MS('created_at')} AS created_ms FROM planner_plans`;

/** The newest plan with these parameters made after `sinceMs`, or null. */
function findCachedPlan(db, paramsHash, sinceMs) {
  return readPlan(first(db.query(`${PLAN_SELECT} WHERE params_hash = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1`, paramsHash, utcDateTime(sinceMs))));
}

function getPlan(db, id) {
  return readPlan(first(db.query(`${PLAN_SELECT} WHERE id = ?`, id)));
}

/**
 * @param {{ id: string, paramsHash: string, params: object, result: object, mode: string,
 *           provider: string, model: string|null, tokensIn: number, tokensOut: number, costUsd: number, at: number }} plan
 */
function insertPlan(db, plan) {
  db.query(
    `INSERT INTO planner_plans (id, params_hash, params, result, mode, provider, model, tokens_in, tokens_out, cost_usd, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    plan.id,
    plan.paramsHash,
    JSON.stringify(plan.params),
    JSON.stringify(plan.result),
    plan.mode,
    plan.provider,
    plan.model,
    plan.tokensIn,
    plan.tokensOut,
    plan.costUsd,
    utcDateTime(plan.at),
  );
}

/** USD the providers cost between two instants (the day in Belgrade, for the budget). */
function spentBetween(db, fromMs, toMs) {
  const row = first(db.query('SELECT COALESCE(SUM(cost_usd), 0) AS spent FROM planner_plans WHERE created_at >= ? AND created_at < ?', utcDateTime(fromMs), utcDateTime(toMs)));
  return row ? num(row.spent) || 0 : 0;
}

/**
 * Raw candidate rows for the parameters:
 * - "dan": the city's parks, cafés, restaurants and bars with coordinates;
 * - "zimovanje": the destination's stays, restaurants and trails, and every
 *   vet with coordinates (selectCandidates keeps the nearest).
 */
function loadCandidateRows(db, params) {
  if (params.mode === 'dan') {
    return db.query(
      `${PLACE_SELECT} WHERE grad = ? AND kategorija IN ('park', 'kafic', 'restoran', 'bar') AND lat IS NOT NULL AND lng IS NOT NULL ORDER BY id LIMIT ${MAX_CANDIDATE_ROWS}`,
      CITIES[params.grad].name,
    );
  }
  return db.query(
    `${PLACE_SELECT}
     WHERE (destinacija_id = (SELECT id FROM destinacija WHERE slug = ?) AND kategorija IN ('smestaj', 'restoran', 'staza'))
        OR (kategorija = 'veterinar' AND lat IS NOT NULL AND lng IS NOT NULL)
     ORDER BY id LIMIT ${MAX_CANDIDATE_ROWS}`,
    params.destinacija,
  );
}

/** Rows of the places with these ids; ids that are gone (deleted, hidden) are simply missing. */
function loadPlaceRows(db, ids) {
  const list = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (!list.length) return [];
  return db.query(`${PLACE_SELECT} WHERE id IN (${list.map(() => '?').join(', ')})`, ...list);
}

/** Cached MET Norway answer for one point: { body, lastModified, expiresAt } or null. */
function weatherGet(db, key) {
  const row = first(db.query(`SELECT body, last_modified, ${EPOCH_MS('expires_at')} AS expires_ms FROM planner_weather_cache WHERE cache_key = ?`, key));
  return row ? { body: row.body, lastModified: row.last_modified || null, expiresAt: num(row.expires_ms) } : null;
}

function weatherPut(db, key, { body, lastModified, expiresAt, fetchedAt }) {
  db.query(
    `INSERT INTO planner_weather_cache (cache_key, body, last_modified, expires_at, fetched_at) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE body = VALUES(body), last_modified = VALUES(last_modified), expires_at = VALUES(expires_at), fetched_at = VALUES(fetched_at)`,
    key,
    body,
    lastModified,
    utcDateTime(expiresAt),
    utcDateTime(fetchedAt),
  );
}

/** A 304 from MET: the cached body stays, only its expiry moves. */
function weatherExtend(db, key, expiresAt, fetchedAt) {
  db.query('UPDATE planner_weather_cache SET expires_at = ?, fetched_at = ? WHERE cache_key = ?', utcDateTime(expiresAt), utcDateTime(fetchedAt), key);
}

function countFeedback(db, planId) {
  return num(first(db.query('SELECT COUNT(*) AS n FROM planner_feedback WHERE plan_id = ?', planId)).n) || 0;
}

function insertFeedback(db, { planId, rating, comment, venueId, at }) {
  db.query('INSERT INTO planner_feedback (plan_id, rating, comment, venue_id, created_at) VALUES (?, ?, ?, ?, ?)', planId, rating, comment, venueId, utcDateTime(at));
}

/**
 * The daily job: quota rows older than 8 days (the window is 7) and weather
 * answers that expired more than a day ago. Plans stay, their links are shared.
 */
function cleanup(db, nowMs) {
  const quotaBefore = utcDateTime(nowMs - LIMITS.quotaRetentionDays * DAY_MS, true);
  const weatherBefore = utcDateTime(nowMs - DAY_MS);
  const quota = num(first(db.query('SELECT COUNT(*) AS n FROM planner_quota WHERE created_at < ?', quotaBefore)).n) || 0;
  db.query('DELETE FROM planner_quota WHERE created_at < ?', quotaBefore);
  const weather = num(first(db.query('SELECT COUNT(*) AS n FROM planner_weather_cache WHERE expires_at < ?', weatherBefore)).n) || 0;
  db.query('DELETE FROM planner_weather_cache WHERE expires_at < ?', weatherBefore);
  return { quota, weather };
}

/** Which planner tables and views answer a query (for the selftest). */
function tablesPresent(db) {
  const out = {};
  for (const table of ['destinacija', 'planner_mesta', 'planner_plans', 'planner_feedback', 'planner_quota', 'planner_weather_cache']) {
    try {
      db.query(`SELECT 1 FROM ${table} LIMIT 1`);
      out[table] = true;
    } catch {
      out[table] = false;
    }
  }
  return out;
}

/** Candidate rows of every city and destination, for the eval export. */
function loadAllCandidateRows(db) {
  const areas = {};
  for (const grad of Object.keys(CITIES)) areas[grad] = loadCandidateRows(db, { mode: 'dan', grad });
  for (const destinacija of Object.keys(DESTINATIONS)) areas[destinacija] = loadCandidateRows(db, { mode: 'zimovanje', destinacija });
  return areas;
}

module.exports = {
  quotaStore,
  lastNetworkRequestMs,
  findCachedPlan,
  getPlan,
  insertPlan,
  spentBetween,
  loadCandidateRows,
  loadAllCandidateRows,
  loadPlaceRows,
  weatherGet,
  weatherPut,
  weatherExtend,
  countFeedback,
  insertFeedback,
  cleanup,
  tablesPresent,
  parseJson,
};
