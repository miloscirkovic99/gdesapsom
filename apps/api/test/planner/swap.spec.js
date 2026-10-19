const { swapStop } = require('../../lib/planner/swap');
const { place, WEEK } = require('./fixtures');

const DATE = '2026-11-14';
const context = { params: { mode: 'dan', velicina: 'srednji' }, weather: { tMax: 15, rainy: false, cold: false }, date: DATE, today: '2026-11-13' };
const stop = (vreme, id) => ({ vreme, lokacija_id: id, zasto: 'x', savet_za_psa: 'y' });

const candidates = [
  place(1, 'park', 44.80, 20.40),
  place(2, 'kafic', 44.81, 20.41, { radno_vreme: WEEK }),
  place(3, 'restoran', 44.82, 20.42, { radno_vreme: WEEK }),
  place(4, 'kafic', 44.90, 20.60, { radno_vreme: WEEK }), // far away
  place(5, 'kafic', 44.815, 20.415, { radno_vreme: WEEK }), // between the neighbours
  place(6, 'kafic', 44.811, 20.411, { max_velicina: 'mali' }), // too small for the dog
];
const stored = { plan: { naslov: 'P', stanice: [stop('09:00', 1), stop('10:30', 2), stop('13:00', 3)], napomene: [] } };

describe('swapStop', () => {
  it('replaces with the same category, nearest to the neighbouring stops', () => {
    const result = swapStop(stored, { index: 1 }, candidates, context);
    expect(result).toMatchObject({ ok: true, replaced: 2, by: 5 });
    expect(result.plan.stanice[1]).toMatchObject({ vreme: '10:30', lokacija_id: 5 });
    // The stored plan itself is not changed.
    expect(stored.plan.stanice[1].lokacija_id).toBe(2);
  });

  it('never offers a place already in the plan, one swapped away before, or one the dog cannot enter', () => {
    const once = swapStop(stored, { index: 1 }, candidates, context);
    // Without `exclude` the original café is a valid option again.
    expect(swapStop({ plan: once.plan }, { index: 1 }, candidates, context).by).toBe(2);

    const twice = swapStop({ plan: once.plan }, { index: 1, exclude: [2] }, candidates, context);
    expect(twice.by).toBe(4);
    expect(swapStop({ plan: twice.plan }, { index: 1, exclude: [2, 5] }, candidates, context)).toEqual({ ok: false, reason: 'no_alternative' });
  });

  it('a walk can be swapped for a park or a trail', () => {
    const withTrail = [...candidates, place(1000009, 'staza', 44.801, 20.401)];
    expect(swapStop(stored, { index: 0 }, withTrail, context).by).toBe(1000009);
  });

  it('reports a target that does not exist', () => {
    expect(swapStop(stored, { index: 7 }, candidates, context)).toEqual({ ok: false, reason: 'not_found' });
  });

  it('swaps a stay in a winter plan', () => {
    const winter = { plan: { naslov: 'Z', smestaj: [{ lokacija_id: 10, zasto: 'a' }, { lokacija_id: 11, zasto: 'b' }], dani: [], veterinar_id: null, napomene: [] } };
    const stays = [place(10, 'smestaj', 43.28, 20.81), place(11, 'smestaj', 43.29, 20.81), place(12, 'smestaj', 43.3, 20.8)];
    const result = swapStop(winter, { section: 'smestaj', index: 0 }, stays, { ...context, params: { mode: 'zimovanje', velicina: 'srednji' }, date: null });
    expect(result).toMatchObject({ ok: true, by: 12 });
    expect(result.plan.smestaj[0]).toEqual({ lokacija_id: 12, zasto: 'Druga opcija smeštaja koji prima pse.' });
  });
});
