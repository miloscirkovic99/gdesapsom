/**
 * The generated MARS files (tools/build-mars-api.mjs) are current, need
 * nothing outside themselves, and behave like the handlers they come from.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createTestDatabase, mariadbAvailable } = require('./support/mariadb');
const { callHandler, createFakeHttp } = require('./support/fake-world');

const ROOT = path.join(__dirname, '..', '..', '..');
const API = path.join(__dirname, '..');

/** Evaluates a generated file the way MARS would: no require, no Node globals. */
function loadBundle(relativePath) {
  const code = fs.readFileSync(path.join(API, relativePath), 'utf8');
  const module = { exports: {} };
  vm.runInNewContext(code, { module });
  return module.exports;
}

describe('generated MARS handlers', () => {
  it('are up to date with apps/api/handlers, lib and the system prompt', () => {
    expect(() => execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build-mars-api.mjs'), '--check'], { stdio: 'pipe' })).not.toThrow();
  });

  it('carry the system prompt from docs/planer-sistemski-prompt.md', () => {
    const bundle = fs.readFileSync(path.join(API, 'v2', 'planner.POST.js'), 'utf8');
    const prompt = fs.readFileSync(path.join(ROOT, 'docs', 'planer-sistemski-prompt.md'), 'utf8').trim();
    const firstLine = prompt.split('\n')[0];
    expect(bundle).toContain(JSON.stringify(firstLine).slice(1, -1));
    expect(bundle).not.toMatch(/readFileSync|require\("(fs|path)"\)/);
  });

  it('export one function of MARSModules and load without require or process', () => {
    for (const file of ['v2/winter/destinations.GET.js', 'v2/planner.POST.js', 'v2/planner/plan/_id.GET.js', 'events/planner-cleanup.js']) {
      expect(typeof loadBundle(file)).toBe('function');
    }
  });
});

(mariadbAvailable() ? describe : describe.skip)('generated MARS handlers on MariaDB', () => {
  let database;
  beforeAll(() => {
    database = createTestDatabase();
  });
  afterAll(() => database && database.drop());

  const world = () => ({ db: database.db, http: createFakeHttp().http, env: { PLANNER_HMAC_SECRET: 'test-secret-that-is-long-enough-1234567890' }, ip: '198.51.100.40' });

  it('winter/destinations answers exactly like its handler', () => {
    const fromBundle = callHandler(loadBundle('v2/winter/destinations.GET.js'), world());
    const fromSource = callHandler(require('../handlers/winter-destinations'), world());
    expect(fromBundle).toEqual(fromSource);
    expect(fromBundle.body.destinations.kopaonik.stays.length).toBeGreaterThan(0);
  });

  it('planner/quota runs end to end from the bundle', () => {
    expect(callHandler(loadBundle('v2/planner/quota.GET.js'), world()).body).toEqual({ remaining: 3, next_at: null });
  });
});
