/**
 * The handlers in apps/api/handlers, called the way MARS calls them (a
 * MARSModules object), against a real MariaDB. Skipped without a server.
 */
const { createTestDatabase, mariadbAvailable } = require('./support/mariadb');
const { callHandler, createFakeHttp } = require('./support/fake-world');

const describeDb = mariadbAvailable() ? describe : describe.skip;

const ENV = {
  PLANNER_HMAC_SECRET: 'test-secret-that-is-long-enough-1234567890',
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
  MET_NO_USER_AGENT: 'gdesapsom.com test',
  PLANNER_DAILY_BUDGET_USD: '0.30',
};
const ADMIN = { kor_email: 'admin@example.test', kor_admin: 1 };
const DAN = { mode: 'dan', grad: 'beograd', velicina: 'mali', energija: 'niska', osetljiv_na_vrucinu: 'false', tip_dana: 'opusten', turnstile_token: 'ok-token' };

describeDb('MARS handlers', () => {
  let database;
  let fake;
  const handler = (name) => require(`../handlers/${name}`);
  const call = (name, world = {}) => callHandler(handler(name), { db: database.db, http: fake.http, env: ENV, ip: '198.51.100.4', ...world });

  beforeAll(() => {
    database = createTestDatabase();
  });
  afterAll(() => database && database.drop());
  beforeEach(() => {
    fake = createFakeHttp();
    // Forecast for the next days, whatever today is when the test runs.
    const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
    fake.state.forecastDates = [day(0), day(1), day(2)];
    jest.resetModules();
  });

  const tomorrow = () => new Date(Date.now() + 86400000 + 3600000).toISOString().slice(0, 10);

  describe('winter/destinations.GET', () => {
    it('returns the winter snapshot of every destination, cacheable', () => {
      const out = call('winter-destinations');
      expect(out.status).toBe(200);
      expect(out.headers['Cache-Control']).toBe('public, max-age=300');
      const kopaonik = out.body.destinations.kopaonik;
      expect(kopaonik.stays.map((stay) => stay.name)).toEqual(['TEST Hotel Kopaonik', 'TEST Apartman Kopaonik', 'TEST Motel Kopaonik']);
      expect(kopaonik.stays[0]).toMatchObject({ id: 101, affiliateUrl: 'https://partner.example/101', dogFee: { amount: 10, currency: 'EUR', per: 'noc' } });
      expect(kopaonik.restaurants.map((r) => r.id)).toEqual([103]); // dogs inside only
      expect(kopaonik.trails).toHaveLength(2);
      expect(kopaonik.gondola).toEqual({ dogsAllowed: true, checkedAt: '2026-10-01' });
      expect(kopaonik.skiLifts).toEqual({ dogsAllowed: null, checkedAt: null });
      expect(kopaonik.vet).toMatchObject({ id: 2000001, name: 'TEST Vet Raška', phone: '036 000 000' });
      expect(out.body.destinations.tara).toMatchObject({ stays: [], restaurants: [], trails: [], vet: null });
    });
  });

  describe('planner.POST', () => {
    it('sets gsp_device as HttpOnly, Secure, SameSite=Lax for a year, and answers the site origin with credentials', () => {
      const out = call('planner-create', { params: { ...DAN, datum: tomorrow(), ime: 'Žućko' }, headers: { Origin: 'https://www.gdesapsom.com' } });
      expect(out.status).toBe(200);
      expect(out.cookies).toHaveLength(1);
      expect(out.cookies[0]).toMatch(/^gsp_device=[0-9a-f-]{36}; Path=\/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly$/);
      expect(out.headers).toMatchObject({
        'Access-Control-Allow-Origin': 'https://www.gdesapsom.com',
        'Access-Control-Allow-Credentials': 'true',
        'Cache-Control': 'no-store',
      });
      expect(out.body).toMatchObject({ mode: 'dan', source: 'rules', remaining: 2 });
      expect(out.exited).toBe(false);
    });

    it('sends no CORS headers to another origin, and none at all with PLANNER_CORS=engine', () => {
      const foreign = call('planner-quota', { headers: { Origin: 'https://evil.example' } });
      expect(foreign.headers['Access-Control-Allow-Origin']).toBeUndefined();
      const engine = call('planner-quota', { env: { ...ENV, PLANNER_CORS: 'engine' }, headers: { Origin: 'https://www.gdesapsom.com' } });
      expect(engine.headers['Access-Control-Allow-Origin']).toBeUndefined();
    });

    it('ends the script on an error status, so MARS rolls back what was not committed', () => {
      const out = call('planner-create', { params: { ...DAN, datum: tomorrow(), turnstile_token: 'forged' }, ip: '198.51.100.7' });
      expect(out).toMatchObject({ status: 403, body: { reason: 'captcha' }, exited: true });
    });

    it('answers 503, not an engine error, when the database fails', () => {
      const broken = { query: () => { throw new Error('gone'); }, commit() {} };
      const out = callHandler(handler('planner-create'), { db: broken, http: fake.http, env: ENV, ip: '198.51.100.9', params: { ...DAN, datum: tomorrow() } });
      expect(out).toMatchObject({ status: 503, body: { reason: 'unavailable' }, exited: true });
    });
  });

  describe('planner GET plan/:id, quota, swap, feedback', () => {
    it('work through the route parameter and the cookie', () => {
      const made = call('planner-create', { params: { ...DAN, datum: tomorrow() }, ip: '198.51.100.5' });
      const device = made.cookies[0].split(';')[0].split('=')[1];

      const plan = call('planner-plan', { params: { id: made.body.plan_id } });
      expect(plan.status).toBe(200);
      expect(plan.headers['Cache-Control']).toBe('public, max-age=300');
      expect(plan.body.plan).toEqual(made.body.plan);

      const quota = call('planner-quota', { headers: { Cookie: `other=1; gsp_device=${device}` } });
      expect(quota.body).toEqual({ remaining: 2, next_at: null });

      const swapped = call('planner-swap', { params: { plan_id: made.body.plan_id, index: '0', exclude: [] }, ip: '198.51.100.5' });
      expect(swapped.status).toBe(200);

      const feedback = call('planner-feedback', { params: { plan_id: made.body.plan_id, rating: '-1' }, ip: '198.51.100.5' });
      expect(feedback).toMatchObject({ status: 201, body: { ok: true } });
    });
  });

  describe('admin endpoints', () => {
    it('selftest: 401 without a session, 403 for a non-admin, a report without secrets for an admin', () => {
      expect(call('planner-selftest')).toMatchObject({ status: 401, exited: true });
      expect(call('planner-selftest', { session: { kor_email: 'user@example.test', kor_admin: 1 } })).toMatchObject({ status: 403 });

      const out = call('planner-selftest', { session: ADMIN, headers: { 'X-Forwarded-For': '203.0.113.9', 'User-Agent': 'test' } });
      expect(out.status).toBe(200);
      expect(out.body).toMatchObject({
        crypto: true,
        mars: { http: true, env: true, requestHeaders: true, remoteAddress: true, commit: true },
        network: { detected: true, kind: 'ipv4' },
        env: { PLANNER_HMAC_SECRET: true, GEMINI_API_KEY: false, PLANNER_HMAC_SECRET_LONG_ENOUGH: true, PLANNER_DAILY_BUDGET_USD: 0.3 },
        tables: { planner_plans: true, planner_mesta: true },
      });
      expect(out.body.system_prompt_chars).toBeGreaterThan(500);
      const text = JSON.stringify(out.body);
      for (const value of Object.values(ENV)) if (value.length > 4) expect(text).not.toContain(value);
      expect(text).not.toContain('203.0.113.9');
    });

    it('candidates-export: every area in the eval shape, opening hours as stored', () => {
      const out = call('planner-candidates-export', { session: ADMIN });
      expect(Object.keys(out.body.areas)).toEqual(['beograd', 'novi-sad', 'kopaonik', 'zlatibor', 'tara']);
      const kafic = out.body.areas.beograd.find((c) => c.id === 11);
      expect(kafic.radno_vreme).toEqual({ pon: [['08:00', '23:00']], sub: [['09:00', '23:00']], ned: [] });
      expect(out.body.areas['novi-sad'].map((c) => c.id)).toEqual([51]);
    });

    it('cleanup: needs the token or an admin', () => {
      const token = 'cleanup-token-cleanup-token-cleanup-token';
      const env = { ...ENV, PLANNER_CLEANUP_TOKEN: token };
      expect(call('planner-cleanup', { env, headers: { 'X-Cleanup-Token': 'wrong' } })).toMatchObject({ status: 401 });
      expect(call('planner-cleanup', { env, headers: { 'X-Cleanup-Token': token } })).toMatchObject({ status: 200, body: { deleted: { quota: 0, weather: 0 } } });
      expect(call('planner-cleanup-event', { env: ENV })).toMatchObject({ status: 200 });
    });
  });
});
