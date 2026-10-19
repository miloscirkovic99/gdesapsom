/**
 * The planner's only contact with MARS Engine.
 *
 * Seen working in this repo's handlers: param(), db.query(), write(),
 * response.status(), response.header(), exit(), session().
 *
 * NOT VERIFIED — docs.marsengine.net could not be read when this was written
 * (2026-10): outbound HTTP, environment variables, request headers, the
 * client address, shared memory between requests, files, db.commit(). Each is
 * looked up defensively below, under the names the MARS docs index mentions
 * (Net Module, Environment Variables, HTTP Request, Filesystem, `shared`).
 * GET /api/v2/planner/selftest (admin) reports which ones were found; fix the
 * lookups here, nowhere else, if one is missing.
 */

const missing = (what) => new Error(`MARS: ${what} not available (see apps/api/lib/mars.js)`);

/** First defined value of a list of lookups; a lookup that throws counts as missing. */
function firstOf(lookups) {
  for (const lookup of lookups) {
    try {
      const value = lookup();
      if (value !== undefined && value !== null) return value;
    } catch {
      // Try the next spelling.
    }
  }
  return null;
}

/** UTF-8 text of whatever a file or HTTP API hands back (string, byte array, Java bytes). */
function asText(data) {
  if (data === null || data === undefined) return '';
  if (typeof data === 'string') return data;
  if (typeof data.toString === 'function' && !Array.isArray(data) && !(data instanceof Uint8Array)) {
    const text = data.toString();
    if (text !== '[object Object]') return text;
  }
  const bytes = Array.from(data, (b) => b & 255);
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    const size = b < 0x80 ? 1 : b < 0xe0 ? 2 : b < 0xf0 ? 3 : 4;
    let code = size === 1 ? b : b & (0xff >> (size + 1));
    for (let j = 1; j < size; j++) code = (code << 6) | (bytes[i + j] & 63);
    out += String.fromCodePoint(code);
    i += size;
  }
  return out;
}

/**
 * @param {object} m the MARSModules object a handler receives
 */
function createMars(m) {
  const request = m.request || {};

  function env(name) {
    return firstOf([
      () => (typeof m.env === 'function' ? m.env(name) : m.env && m.env[name]),
      () => m.process && m.process.env[name],
      () => (typeof process !== 'undefined' ? process.env[name] : undefined),
      () => (typeof m.getConfig === 'function' ? m.getConfig(name) : undefined),
      () => (typeof m.config === 'function' ? m.config(name) : undefined),
    ]);
  }

  function requestHeader(name) {
    const lower = name.toLowerCase();
    const value = firstOf([
      () => (typeof request.header === 'function' ? request.header(name) : undefined),
      () => (typeof request.getHeader === 'function' ? request.getHeader(name) : undefined),
      () => request.headers && (typeof request.headers.get === 'function' ? request.headers.get(name) : request.headers[lower] ?? request.headers[name]),
      () => (typeof m.header === 'function' ? m.header(name) : undefined),
    ]);
    return value === null ? null : String(value);
  }

  function remoteAddress() {
    return firstOf([
      () => request.ip,
      () => request.remoteAddress,
      () => request.remoteAddr,
      () => (typeof request.getRemoteAddr === 'function' ? request.getRemoteAddr() : undefined),
    ]);
  }

  /** Cookies from the Cookie header, parsed here so no MARS cookie API is needed. */
  function cookie(name) {
    const header = requestHeader('Cookie') || '';
    for (const part of header.split(';')) {
      const index = part.indexOf('=');
      if (index > 0 && part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
    }
    return null;
  }

  function setCookie(name, value, { maxAge, httpOnly = true, secure = true, sameSite = 'Lax', path = '/' }) {
    const attributes = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `Max-Age=${maxAge}`, `SameSite=${sameSite}`];
    if (secure) attributes.push('Secure');
    if (httpOnly) attributes.push('HttpOnly');
    m.response.header('Set-Cookie', attributes.join('; '));
  }

  /**
   * Synchronous HTTP call: { method, url, headers, body } → { status, body, headers }.
   * Throws on transport errors and timeouts, which the cascade treats as failures.
   */
  function http(req, timeoutMs) {
    const options = { method: req.method, url: req.url, headers: req.headers || {}, body: req.body, timeout: timeoutMs };
    const client = firstOf([
      () => (m.net && typeof m.net.request === 'function' ? (o) => m.net.request(o) : undefined),
      () => (m.http && typeof m.http.request === 'function' ? (o) => m.http.request(o) : undefined),
    ]);
    if (!client) throw missing('outbound HTTP');

    const response = client(options);
    if (response && typeof response.then === 'function') throw missing('synchronous HTTP (got a Promise)');
    const status = Number(firstOf([() => response.status, () => response.statusCode, () => response.code]));
    const body = asText(firstOf([() => response.body, () => response.text, () => response.data, () => response.content]) || '');
    const headers = firstOf([() => response.headers]) || {};
    return { status, body, headers };
  }

  function readFile(path) {
    const file = firstOf([
      () => (m.fs && typeof m.fs.read === 'function' ? m.fs.read(path) : undefined),
      () => (m.fs && typeof m.fs.load === 'function' ? m.fs.load(path) : undefined),
    ]);
    if (file === null) throw missing(`file ${path}`);
    return asText(typeof file === 'object' && 'data' in file ? file.data : file);
  }

  return {
    param: (...args) => m.param(...args),
    paramNames: () => m.param() || [],
    query: (sql, ...args) => m.db.query(sql, ...args),
    hasCommit: () => !!(m.db && typeof m.db.commit === 'function'),
    commit: () => {
      if (m.db && typeof m.db.commit === 'function') m.db.commit();
    },
    status: (code) => m.response.status(code),
    header: (name, value) => m.response.header(name, value),
    write: (key, value) => m.write(key, value),
    exit: () => m.exit(),
    session: (...args) => m.session(...args),
    env,
    requestHeader,
    remoteAddress,
    cookie,
    setCookie,
    http,
    readFile,
    /** Memory shared between requests (MARS `shared`), or null. */
    shared: () => (m.shared && typeof m.shared === 'object' ? m.shared : null),
    /** Which of the unverified lookups above found something, for GET planner/selftest. Calls nothing outside. */
    capabilities: () => ({
      http: !!((m.net && typeof m.net.request === 'function') || (m.http && typeof m.http.request === 'function')),
      env: firstOf([() => (typeof m.env === 'function' || (m.env && typeof m.env === 'object') ? true : null), () => (m.process && m.process.env ? true : null), () => (typeof process !== 'undefined' && process.env ? true : null), () => (typeof m.getConfig === 'function' || typeof m.config === 'function' ? true : null)]) === true,
      requestHeaders: requestHeader('Host') !== null || requestHeader('User-Agent') !== null,
      remoteAddress: remoteAddress() !== null,
      commit: !!(m.db && typeof m.db.commit === 'function'),
      files: !!(m.fs && (typeof m.fs.read === 'function' || typeof m.fs.load === 'function')),
      shared: !!(m.shared && typeof m.shared === 'object'),
    }),
  };
}

module.exports = { createMars, asText, firstOf };
