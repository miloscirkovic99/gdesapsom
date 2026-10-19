const { confirm, release, reserve, status, WINDOW_MS } = require('../../lib/planner/quota');

const NOW = Date.UTC(2026, 10, 20, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

/**
 * planner_quota with transaction visibility: a row is visible to other
 * requests only after its request commits, like an InnoDB row inserted inside
 * the MARS script transaction.
 */
function createDb() {
  const rows = [];
  let nextId = 1;
  const visible = (conn) => rows.filter((row) => row.committed || row.conn === conn);

  function storeFor(conn, hooks = {}) {
    const hook = (name) => hooks[name] && hooks[name]();
    return {
      insert({ deviceHash, ipHash, at, planId }) {
        const id = planId;
        nextId++;
        rows.push({ id, deviceHash, ipHash, at, planId, committed: false, conn });
        hook('afterInsert');
        return id;
      },
      commit() {
        rows.filter((row) => row.conn === conn).forEach((row) => (row.committed = true));
        hook('afterCommit');
      },
      countDevice(deviceHash, since) {
        const n = visible(conn).filter((row) => row.deviceHash === deviceHash && row.at > since).length;
        hook('afterCountDevice');
        return n;
      },
      countNetwork(ipHash, since) {
        return visible(conn).filter((row) => row.ipHash === ipHash && row.at > since).length;
      },
      oldestDevice(deviceHash, since) {
        const ats = visible(conn).filter((row) => row.deviceHash === deviceHash && row.at > since).map((row) => row.at);
        return ats.length ? Math.min(...ats) : null;
      },
      oldestNetwork(ipHash, since) {
        const ats = visible(conn).filter((row) => row.ipHash === ipHash && row.at > since).map((row) => row.at);
        return ats.length ? Math.min(...ats) : null;
      },
      remove(id) {
        const index = rows.findIndex((row) => row.id === id);
        if (index >= 0) rows.splice(index, 1);
      },
      attach(id, planId) {
        const row = rows.find((r) => r.id === id);
        if (row) row.planId = planId;
      },
    };
  }

  /** A committed row from an earlier request. */
  function seed(deviceHash, ipHash, at) {
    rows.push({ id: nextId++, deviceHash, ipHash, at, planId: 1, committed: true, conn: 'seed' });
  }

  return { rows, storeFor, seed };
}

let conn = 0;
/** One planner request: reserve, then the end of the MARS script commits whatever is left. */
function request(db, deviceHash, ipHash, at = NOW, hooks) {
  const id = `r${++conn}`;
  const result = reserve(db.storeFor(id, hooks), { deviceHash, ipHash, now: at, planId: `plan-${id}` });
  db.rows.filter((row) => row.conn === id).forEach((row) => (row.committed = true));
  return result;
}

describe('quota: 3 plans per device in a sliding week', () => {
  it('allows three, refuses the fourth with the device reason and the date a slot frees up', () => {
    const db = createDb();
    const results = [0, 1, 2, 3].map((i) => request(db, 'dev', `ip${i}`, NOW + i * 1000));

    expect(results.slice(0, 3).map((r) => r.ok && r.remaining)).toEqual([2, 1, 0]);
    expect(results[2].nextAt).toBe(NOW + WINDOW_MS);
    expect(results[3]).toEqual({ ok: false, reason: 'device', nextAt: NOW + WINDOW_MS });
    // The refused reservation is gone; only the three paid plans remain.
    expect(db.rows).toHaveLength(3);
  });

  it('slides: a plan older than 7 days no longer counts', () => {
    const db = createDb();
    db.seed('dev', 'net', NOW - 7 * DAY - 1);
    db.seed('dev', 'net', NOW - 6 * DAY);
    db.seed('dev', 'net', NOW - 1 * DAY);

    expect(request(db, 'dev', 'net')).toMatchObject({ ok: true, remaining: 0 });
    // The oldest plan still inside the window decides when the next one is allowed.
    expect(request(db, 'dev', 'net')).toEqual({ ok: false, reason: 'device', nextAt: NOW - 6 * DAY + WINDOW_MS });
  });

  it('a plan exactly 7 days old is outside the window', () => {
    const db = createDb();
    [1, 2, 3].forEach(() => db.seed('dev', 'net', NOW - 7 * DAY));
    expect(request(db, 'dev', 'net')).toMatchObject({ ok: true, remaining: 2 });
  });
});

describe('quota: 15 plans per network', () => {
  it('allows 15 from different devices on one network, refuses the 16th with the network reason', () => {
    const db = createDb();
    for (let i = 0; i < 15; i++) expect(request(db, `dev${i}`, 'net', NOW + i).ok).toBe(true);

    const refused = request(db, 'dev-new', 'net', NOW + 100);
    expect(refused).toEqual({ ok: false, reason: 'network', nextAt: NOW + WINDOW_MS });
    expect(db.rows).toHaveLength(15);
  });

  it('reports the device reason first when both limits are hit', () => {
    const db = createDb();
    for (let i = 0; i < 12; i++) db.seed(`other${i}`, 'net', NOW - DAY);
    for (let i = 0; i < 3; i++) db.seed('dev', 'net', NOW - DAY);
    expect(request(db, 'dev', 'net')).toMatchObject({ ok: false, reason: 'device' });
  });
});

describe('quota: failures and confirmation', () => {
  it('a failed plan releases its reservation, so it costs nothing', () => {
    const db = createDb();
    const first = request(db, 'dev', 'net');
    release(db.storeFor('x'), first.id);
    expect(db.rows).toHaveLength(0);
    expect(request(db, 'dev', 'net')).toMatchObject({ ok: true, remaining: 2 });
  });

  it('a confirmed reservation carries its plan id', () => {
    const db = createDb();
    const r = request(db, 'dev', 'net');
    expect(r.id).toMatch(/^plan-r\d+$/);
    confirm(db.storeFor('x'), r.id, 'cached-plan');
    expect(db.rows[0].planId).toBe('cached-plan');
  });

  it('status tells the form what is left without reserving', () => {
    const db = createDb();
    db.seed('dev', 'net', NOW - 2 * DAY);
    db.seed('dev', 'net', NOW - DAY);
    expect(status(db.storeFor('x'), { deviceHash: 'dev', now: NOW })).toEqual({ remaining: 1, nextAt: null });
    db.seed('dev', 'net', NOW);
    expect(status(db.storeFor('x'), { deviceHash: 'dev', now: NOW })).toEqual({ remaining: 0, nextAt: NOW - 2 * DAY + WINDOW_MS });
    expect(status(db.storeFor('x'), { deviceHash: null, now: NOW })).toEqual({ remaining: 3, nextAt: null });
  });
});

describe('quota: parallel requests for the last slot', () => {
  function withTwoUsed() {
    const db = createDb();
    db.seed('dev', 'net', NOW - DAY);
    db.seed('dev', 'net', NOW - DAY);
    return db;
  }

  it.each(['afterInsert', 'afterCommit', 'afterCountDevice'])('a rival running %s admits at most one of the two', (point) => {
    const db = withTwoUsed();
    let rival = null;
    const first = request(db, 'dev', 'net', NOW, {
      [point]: () => {
        if (!rival) rival = request(db, 'dev', 'net', NOW + 1);
      },
    });

    const admitted = [first, rival].filter((r) => r.ok);
    expect(admitted.length).toBeLessThanOrEqual(1);
    expect(db.rows.filter((row) => row.at >= NOW)).toHaveLength(admitted.length);
  });

  it('many interleaved requests never get past the limit', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const db = createDb();
      let state = seed;
      const random = () => ((state = (state * 1103515245 + 12345) % 2147483648) / 2147483648);
      const results = [];
      let pending = 8;

      const start = () => {
        if (pending === 0) return;
        pending--;
        const hooks = {};
        for (const point of ['afterInsert', 'afterCommit', 'afterCountDevice']) {
          if (random() < 0.4) hooks[point] = start;
        }
        results.push(request(db, 'dev', `net${seed}`, NOW + results.length, hooks));
      };
      while (pending > 0) start();

      const admitted = results.filter((r) => r.ok).length;
      expect(admitted).toBeLessThanOrEqual(3);
      expect(db.rows).toHaveLength(admitted);
    }
  });
});
