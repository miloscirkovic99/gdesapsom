const { validatePlan } = require('../../lib/planner/validate');
const { belgradeCandidates, kopaonikCandidates } = require('./fixtures');

const DATE = '2026-11-14'; // Saturday
const danContext = (weather = { tMax: 15, tMin: 5, rainy: false, cold: false }) => ({
  params: { mode: 'dan', velicina: 'srednji' },
  candidates: belgradeCandidates(),
  weather,
  date: DATE,
});

const stop = (vreme, id) => ({ vreme, lokacija_id: id, zasto: 'Lepo mesto.', savet_za_psa: 'Ponesi vodu za {{ime}}.' });
const goodDay = () => ({
  naslov: 'Subota u gradu',
  stanice: [stop('09:00', 1000001), stop('10:30', 11), stop('13:00', 21), stop('17:30', 1000002)],
  napomene: ['Ponesi kesice.'],
});

describe('validatePlan: dan', () => {
  it('accepts a plan that follows the rules and returns only schema fields', () => {
    const result = validatePlan({ ...goodDay(), extra: 'x' }, danContext());
    expect(result.ok).toBe(true);
    expect(Object.keys(result.plan)).toEqual(['naslov', 'stanice', 'napomene']);
    expect(result.plan.stanice[0].savet_za_psa).toContain('{{ime}}');
  });

  it('rejects an id that was not among the candidates', () => {
    const plan = goodDay();
    plan.stanice[1].lokacija_id = 999;
    expect(validatePlan(plan, danContext())).toMatchObject({ ok: false, errors: ['stanice[1].lokacija_id:unknown'] });
  });

  it('rejects times that do not rise', () => {
    const plan = goodDay();
    plan.stanice[2].vreme = '10:30';
    expect(validatePlan(plan, danContext()).errors).toContain('stanice[2].vreme:not_rising');
  });

  it('rejects more than 5 stops and fewer than 3', () => {
    const many = goodDay();
    many.stanice = [stop('08:00', 1000001), stop('09:00', 11), stop('10:00', 12), stop('12:00', 21), stop('14:00', 22), stop('19:00', 31)];
    expect(validatePlan(many, danContext()).errors).toContain('stanice:too_many');

    const few = goodDay();
    few.stanice = few.stanice.slice(0, 2);
    expect(validatePlan(few, danContext()).errors).toContain('stanice:too_few');
  });

  it('above 28 °C refuses a walk between 11 and 17 h, but allows it before and after', () => {
    const hot = danContext({ tMax: 31, tMin: 20, rainy: false, cold: false });
    const plan = goodDay();
    plan.stanice[3].vreme = '16:59';
    expect(validatePlan(plan, hot).errors).toContain('stanice[3]:walk_in_heat');

    plan.stanice[3].vreme = '17:00';
    expect(validatePlan(plan, hot).ok).toBe(true);

    // At exactly 28 °C the rule does not apply yet.
    plan.stanice[3].vreme = '15:00';
    expect(validatePlan(plan, danContext({ tMax: 28, tMin: 18 })).ok).toBe(true);
  });

  it('refuses a stop at a time the place is closed', () => {
    const plan = goodDay();
    plan.stanice[1].vreme = '08:30'; // Saturday opens at 09:00
    expect(validatePlan(plan, danContext()).errors).toContain('stanice[1]:closed');
  });

  it('refuses a stay or a vet as a day stop, and repeated stops', () => {
    const ctx = { ...danContext(), candidates: [...belgradeCandidates(), ...kopaonikCandidates()] };
    const plan = goodDay();
    plan.stanice[0].lokacija_id = 101;
    expect(validatePlan(plan, ctx).errors).toContain('stanice[0].lokacija_id:category');

    const repeated = goodDay();
    repeated.stanice[3].lokacija_id = 1000001;
    expect(validatePlan(repeated, danContext()).errors).toContain('stanice:repeated');
  });

  it('rejects missing texts and non-objects', () => {
    const plan = goodDay();
    plan.stanice[0].zasto = '   ';
    expect(validatePlan(plan, danContext()).errors).toContain('stanice[0].zasto');
    expect(validatePlan('[]', danContext())).toEqual({ ok: false, errors: ['not_an_object'] });
  });
});

describe('validatePlan: zimovanje', () => {
  const ctx = () => ({ params: { mode: 'zimovanje', broj_noci: 2 }, candidates: kopaonikCandidates(), weather: { tMax: -2, cold: true }, date: null });
  const goodWinter = () => ({
    naslov: 'Kopaonik sa psom',
    smestaj: [
      { lokacija_id: 101, zasto: 'Pas sme sam u sobi.' },
      { lokacija_id: 102, zasto: 'Blizu staza.' },
    ],
    dani: [
      { dan: 1, stanice: [stop('10:00', 1000301), stop('13:00', 201)] },
      { dan: 2, stanice: [stop('10:00', 1000302), stop('13:00', 202)] },
    ],
    veterinar_id: 2000002,
    napomene: [],
  });

  it('accepts a valid winter plan', () => {
    expect(validatePlan(goodWinter(), ctx())).toMatchObject({ ok: true });
  });

  it('needs 2–3 stays that are stays', () => {
    const one = goodWinter();
    one.smestaj = one.smestaj.slice(0, 1);
    expect(validatePlan(one, ctx()).errors).toContain('smestaj:count');

    const wrong = goodWinter();
    wrong.smestaj[1].lokacija_id = 201;
    expect(validatePlan(wrong, ctx()).errors).toContain('smestaj[1].lokacija_id:category');
  });

  it('allows at most 4 stops a day and nights + 1 days', () => {
    const plan = goodWinter();
    plan.dani[0].stanice = [stop('09:00', 1000301), stop('11:00', 201), stop('13:00', 202), stop('15:00', 1000302), stop('17:00', 201)];
    expect(validatePlan(plan, ctx()).errors).toContain('dani[0].stanice:too_many');

    const long = goodWinter();
    long.dani = [1, 2, 3, 4].map((dan) => ({ dan, stanice: [stop('10:00', 1000301)] }));
    expect(validatePlan(long, ctx()).errors).toContain('dani:count');
  });

  it('accepts a missing vet but not an unknown one', () => {
    expect(validatePlan({ ...goodWinter(), veterinar_id: null }, ctx()).ok).toBe(true);
    expect(validatePlan({ ...goodWinter(), veterinar_id: 201 }, ctx()).errors).toContain('veterinar_id:unknown');
  });
});
