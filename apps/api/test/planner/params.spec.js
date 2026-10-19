const { validatePlannerInput } = require('../../lib/planner/params');

const TODAY = '2026-11-10';
const dan = { mode: 'dan', grad: 'beograd', datum: '2026-11-14', velicina: 'srednji', energija: 'visoka', osetljiv_na_vrucinu: 'false', tip_dana: 'aktivan' };
const zim = { mode: 'zimovanje', destinacija: 'kopaonik', broj_noci: '3', velicina: 'veliki', dlaka: 'duga', neko_skija: true, pas_sme_sam: '0' };

describe('validatePlannerInput', () => {
  it('normalizes a valid "dan" request', () => {
    expect(validatePlannerInput(dan, { today: TODAY })).toEqual({
      ok: true,
      params: { ...dan, osetljiv_na_vrucinu: false },
    });
  });

  it('normalizes a valid "zimovanje" request', () => {
    expect(validatePlannerInput(zim, { today: TODAY })).toEqual({
      ok: true,
      params: { ...zim, broj_noci: 3, neko_skija: true, pas_sme_sam: false },
    });
  });

  it('never keeps the dog\'s name or any other unknown field', () => {
    const result = validatePlannerInput({ ...dan, ime: 'Žućko', ime_psa: 'Žućko', sql: "' OR 1=1" }, { today: TODAY });
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result.params)).not.toContain('Žućko');
    expect(Object.keys(result.params).sort()).toEqual(Object.keys(dan).sort());
  });

  it('rejects values outside the whitelists', () => {
    expect(validatePlannerInput({ ...dan, grad: 'nis' }, { today: TODAY }).errors).toEqual(['grad']);
    expect(validatePlannerInput({ ...dan, velicina: 'ogroman', energija: 1 }, { today: TODAY }).errors).toEqual(['velicina', 'energija']);
    expect(validatePlannerInput({ ...zim, broj_noci: 8 }, { today: TODAY }).errors).toEqual(['broj_noci']);
    expect(validatePlannerInput({ ...zim, broj_noci: '2.5' }, { today: TODAY }).errors).toEqual(['broj_noci']);
    expect(validatePlannerInput({ ...zim, pas_sme_sam: 'mozda' }, { today: TODAY }).errors).toEqual(['pas_sme_sam']);
    expect(validatePlannerInput({ mode: 'nedelja' }, { today: TODAY })).toEqual({ ok: false, errors: ['mode'] });
  });

  it('accepts dates from today to 9 days ahead, and only real ones', () => {
    const at = (datum) => validatePlannerInput({ ...dan, datum }, { today: TODAY }).ok;
    expect(at('2026-11-10')).toBe(true);
    expect(at('2026-11-19')).toBe(true);
    expect(at('2026-11-20')).toBe(false);
    expect(at('2026-11-09')).toBe(false);
    expect(at('2026-02-30')).toBe(false);
    expect(at('14.11.2026')).toBe(false);
  });
});
