/** Small pieces every new handler uses: CORS, errors, rows and column values. */

/**
 * The site calls the API from https://www.gdesapsom.com while the API answers
 * on https://gdesapsom.com, and the planner needs its cookie: a credentialed
 * cross-origin request needs the exact origin back, never "*".
 * PLANNER_ALLOWED_ORIGINS (comma-separated) adds origins, e.g. for a local
 * dev server. PLANNER_CORS=engine leaves CORS to MARS, for a host whose own
 * CORS headers already answer credentialed requests (two
 * Access-Control-Allow-Origin headers make the browser refuse the response).
 */
const DEFAULT_ORIGINS = ['https://www.gdesapsom.com', 'https://gdesapsom.com'];

function allowSiteOrigin(mars) {
  if (mars.env('PLANNER_CORS') === 'engine') return;
  const extra = String(mars.env('PLANNER_ALLOWED_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origin = mars.requestHeader('Origin');
  if (origin && [...DEFAULT_ORIGINS, ...extra].includes(origin)) {
    mars.header('Access-Control-Allow-Origin', origin);
    mars.header('Access-Control-Allow-Credentials', 'true');
    mars.header('Vary', 'Origin');
  }
}

/** Ends the script with `status` and the fields of `body` (exit() also rolls back the transaction). */
function fail(mars, status, body) {
  mars.status(status);
  for (const key of Object.keys(body)) mars.write(key, body[key]);
  mars.exit();
}

/** Writes every field of `body` as a top-level key of the JSON response. */
function respond(mars, body) {
  for (const key of Object.keys(body)) mars.write(key, body[key]);
}

/** db.query result (array-like of MARS rows) → a real array of the same rows. Rows are only ever read by column name. */
function rowsOf(result) {
  if (!result || typeof result !== 'object' || typeof result.length !== 'number') return [];
  const rows = [];
  for (let i = 0; i < result.length; i++) rows.push(result[i]);
  return rows;
}

/** The `db` the stores take ({ query, commit }), over MARS. */
function dbOf(mars) {
  return {
    query: (sql, ...args) => rowsOf(mars.query(sql, ...args)),
    commit: mars.hasCommit() ? () => mars.commit() : undefined,
  };
}

/** A DATE / DATETIME value as 'YYYY-MM-DD', whatever form the driver returns. */
function isoDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value));
  return match ? match[1] : null;
}

/** TINYINT(1) → true / false / null. */
function bool(value) {
  if (value === null || value === undefined || value === '') return null;
  return Number(value) === 1 || value === true;
}

/** DECIMAL / INT → number or null. */
function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** 'YYYY-MM-DD HH:MM:SS' in UTC, for DATETIME columns written by the handlers. */
function utcDateTime(ms, withMillis = false) {
  const iso = new Date(ms).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, withMillis ? 23 : 19)}`;
}

module.exports = { allowSiteOrigin, fail, respond, rowsOf, dbOf, isoDate, bool, num, utcDateTime, DEFAULT_ORIGINS };
