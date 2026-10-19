/**
 * A throwaway MariaDB / MySQL database for the integration tests, queried
 * synchronously like MARS does, through the `mysql` command-line client.
 *
 * Each test file gets its own database (legacy stub + db/06 + seed) and drops
 * it afterwards. Without a reachable server the integration suites skip:
 *   MYSQL_TEST_ARGS="-h 127.0.0.1 -u root -psecret" npx jest -c apps/api/jest.config.js
 *
 * TEST ONLY: parameters are inlined as escaped literals here; the real
 * handlers pass them to MARS as `?` parameters.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..', '..');
const BASE_ARGS = (process.env.MYSQL_TEST_ARGS || '').split(/\s+/).filter(Boolean);

function run(args, input) {
  return execFileSync('mysql', [...BASE_ARGS, '--default-character-set=utf8mb4', ...args], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
}

let available = null;
function mariadbAvailable() {
  if (available === null) {
    try {
      run(['-e', 'SELECT 1']);
      available = true;
    } catch {
      available = false;
    }
  }
  return available;
}

function literal(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Not a finite number: ${value}`);
    return String(value);
  }
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** Replaces each `?` outside quoted strings with the next argument. */
function inline(sql, args) {
  let out = '';
  let quote = null;
  let next = 0;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (quote) {
      out += ch;
      if (ch === '\\') out += sql[++i] || '';
      else if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      out += ch;
    } else if (ch === '?') {
      if (next >= args.length) throw new Error(`Missing parameter ${next + 1} for: ${sql}`);
      out += literal(args[next++]);
    } else {
      out += ch;
    }
  }
  if (next !== args.length) throw new Error(`${args.length} parameters for ${next} placeholders: ${sql}`);
  return out;
}

const XML_ENTITIES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
const unescapeXml = (text) => text.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (_, name) => {
  if (name[0] === '#') return String.fromCodePoint(name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10));
  return XML_ENTITIES[name.toLowerCase()];
});

/** Rows of `mysql --xml` output, every value a string or null (as loosely typed as MARS rows). */
function parseXml(xml) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row>([\s\S]*?)<\/row>/g)) {
    const row = {};
    for (const field of rowMatch[1].matchAll(/<field name="([^"]+)"(\s+xsi:nil="true"\s*\/>|>([\s\S]*?)<\/field>|\s*\/>)/g)) {
      row[unescapeXml(field[1])] = field[2].includes('xsi:nil') ? null : unescapeXml(field[3] || '');
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Creates a fresh database and returns { name, db, drop }, where db is the
 * store's `{ query, commit }`. `db.statements` records every SQL text sent.
 */
function createTestDatabase() {
  const name = `gsp_api_test_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
  // The legacy tables take the database default, which in production need not
  // be the utf8mb4_unicode_ci of the new tables (MYSQL_TEST_CHARSET=utf8mb3
  // tries another).
  run(['-e', `CREATE DATABASE ${name} CHARACTER SET ${process.env.MYSQL_TEST_CHARSET || 'utf8mb4'}`]);
  const drop = () => run(['-e', `DROP DATABASE IF EXISTS ${name}`]);
  const load = (file) => run(['-D', name], fs.readFileSync(file, 'utf8'));
  try {
    load(path.join(__dirname, '..', 'fixtures', 'legacy-stub.sql'));
    load(path.join(ROOT, 'db', '06_planer_i_zimovanje.sql'));
    load(path.join(__dirname, '..', 'fixtures', 'seed.sql'));
  } catch (error) {
    drop();
    throw error;
  }

  const statements = [];
  const db = {
    statements,
    query(sql, ...args) {
      statements.push(sql);
      const output = run(['--xml', '-D', name, '-e', inline(sql, args)]);
      return parseXml(output);
    },
    commit() {},
  };
  return { name, db, drop };
}

module.exports = { mariadbAvailable, createTestDatabase, inline, parseXml };
