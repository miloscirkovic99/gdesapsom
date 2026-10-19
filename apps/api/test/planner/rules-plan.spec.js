const { rulesPlan } = require('../../lib/planner/rules-plan');
const { selectCandidates } = require('../../lib/planner/candidates');
const { validatePlan } = require('../../lib/planner/validate');
const { CITIES, DESTINATIONS } = require('../../lib/planner/config');
const { parseHours } = require('../../lib/planner/hours');
const { belgradeCandidates, kopaonikCandidates, place, WEEK_JSON } = require('./fixtures');

const DATE = '2026-11-14';

function danContext(weather = { tMax: 15, tMin: 6, rainy: false, cold: false }) {
  const params = { mode: 'dan', grad: 'beograd', datum: DATE, velicina: 'srednji', energija: 'srednja', osetljiv_na_vrucinu: false, tip_dana: 'mesovit' };
  const context = { params, weather, date: DATE, today: '2026-11-13', center: CITIES.beograd };
  return { ...context, candidates: selectCandidates(belgradeCandidates(), context) };
}

describe('plan without AI: dan', () => {
  it('goes walk → café → lunch → walk, each next stop nearest to the previous', () => {
    const ctx = danContext();
    const plan = rulesPlan(ctx.candidates, ctx);
    const kinds = plan.stanice.map((s) => ctx.candidates.find((c) => c.id === s.lokacija_id).kategorija);
    expect(kinds).toEqual(['park', 'kafic', 'restoran', 'park']);
    // Park 1000001 is the best-ranked walk (fenced); café 11 is the one near it; restaurant 21 near the café.
    expect(plan.stanice.map((s) => s.lokacija_id)).toEqual([1000001, 11, 21, 1000002]);
    expect(validatePlan(plan, ctx)).toMatchObject({ ok: true });
  });

  it('moves the walks out of the heat', () => {
    const ctx = danContext({ tMax: 32, tMin: 21, rainy: false, cold: false });
    const plan = rulesPlan(ctx.candidates, ctx);
    expect(plan.stanice.map((s) => s.vreme)).toEqual(['08:00', '10:30', '13:00', '18:30']);
    expect(validatePlan(plan, ctx).ok).toBe(true);
  });

  it('skips a place that is closed at that hour', () => {
    const ctx = danContext();
    ctx.candidates = ctx.candidates.map((c) => (c.id === 11 ? { ...c, radno_vreme: parseHours({ ...WEEK_JSON, sub: [['12:00', '20:00']] }) } : c));
    expect(rulesPlan(ctx.candidates, ctx).stanice.map((s) => s.lokacija_id)).toEqual([1000001, 12, 22, 1000002]);
  });

  it('writes {{ime}} instead of the name and states nothing that is not in the data', () => {
    const plan = rulesPlan(danContext().candidates, danContext());
    const text = JSON.stringify(plan);
    expect(text).toContain('{{ime}}');
    expect(text).toContain('bez AI asistenta');
    expect(text).not.toMatch(/\d+\s*(din|rsd|€|eur)/i);
  });
});

describe('plan without AI: zimovanje', () => {
  function winterContext(nights = 3) {
    const params = { mode: 'zimovanje', destinacija: 'kopaonik', broj_noci: nights, velicina: 'srednji', dlaka: 'kratka', neko_skija: true, pas_sme_sam: true };
    const context = { params, weather: { tMax: -3, tMin: -9, rainy: false, cold: true }, date: null, today: '2026-12-01', center: DESTINATIONS.kopaonik };
    return { ...context, candidates: selectCandidates(kopaonikCandidates(), context) };
  }

  it('takes the 3 best stays, one trail and one restaurant a day, and the nearest vet', () => {
    const ctx = winterContext(3);
    const plan = rulesPlan(ctx.candidates, ctx);

    expect(plan.smestaj).toHaveLength(3);
    // The stay that does not allow a dog alone in the room is out: someone skis and the dog may stay alone.
    expect(plan.smestaj.map((s) => s.lokacija_id)).not.toContain(103);
    expect(plan.smestaj[0].lokacija_id).toBe(101);
    expect(plan.dani).toHaveLength(3);
    for (const day of plan.dani) {
      const kinds = day.stanice.map((s) => ctx.candidates.find((c) => c.id === s.lokacija_id).kategorija);
      expect(kinds).toEqual(['staza', 'restoran']);
    }
    expect(plan.veterinar_id).toBe(2000002);
    expect(validatePlan(plan, ctx)).toMatchObject({ ok: true });
  });

  it('still makes a plan with what little there is', () => {
    const params = { mode: 'zimovanje', destinacija: 'tara', broj_noci: 2, velicina: 'mali', dlaka: 'duga', neko_skija: false, pas_sme_sam: false };
    const context = { params, weather: null, date: null, today: '2026-12-01', center: DESTINATIONS.tara };
    const candidates = selectCandidates([place(1, 'smestaj', 43.85, 19.43), place(2, 'smestaj', 43.86, 19.42)], context);
    const plan = rulesPlan(candidates, context);
    expect(plan.smestaj).toHaveLength(2);
    expect(plan.dani).toEqual([]);
    expect(plan.veterinar_id).toBeNull();
  });
});
