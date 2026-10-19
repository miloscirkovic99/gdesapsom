const { readFileSync } = require('fs');
const { join } = require('path');
const { buildUserMessage, CANDIDATE_HEADER, PLAN_SCHEMAS } = require('../../lib/planner/prompt');
const { belgradeCandidates } = require('./fixtures');

describe('prompt', () => {
  const params = { mode: 'dan', grad: 'beograd', datum: '2026-11-14', velicina: 'srednji', energija: 'visoka', osetljiv_na_vrucinu: true, tip_dana: 'aktivan' };
  const weather = { date: '2026-11-14', tMin: 4, tMax: 11, tAvg: 8, precipitationMm: 3.2, rainy: true, cold: false, hot: false };

  it('lists the profile, the forecast and one line per candidate', () => {
    const message = buildUserMessage({ params, weather, candidates: belgradeCandidates(), date: params.datum });
    const lines = message.split('\n');
    expect(lines.slice(0, 5)).toEqual([
      'REŽIM: dan',
      'GRAD: Beograd',
      'DATUM: 2026-11-14 (subota)',
      'PROFIL PSA: veličina srednji; energija visoka; osetljiv na vrućinu: da; tip dana: aktivan',
      'PROGNOZA: 2026-11-14: 4–11 °C (prosek 8 °C), padavine 3.2 mm, kišovito ili sneg',
    ]);
    expect(lines[5]).toBe(CANDIDATE_HEADER);
    expect(lines.slice(6, -1)).toHaveLength(belgradeCandidates().length);
    expect(lines[6].split('|')).toHaveLength(10);
  });

  it('has no place for the dog\'s name', () => {
    const message = buildUserMessage({ params: { ...params, ime: 'Žućko' }, weather, candidates: [], date: params.datum });
    expect(message).not.toContain('Žućko');
  });

  it('every object in the schemas is closed and fully required (Anthropic structured outputs)', () => {
    const objects = [];
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'object') objects.push(node);
      Object.values(node).forEach(walk);
    };
    Object.values(PLAN_SCHEMAS).forEach(walk);
    expect(objects.length).toBeGreaterThan(3);
    for (const object of objects) {
      expect(object.additionalProperties).toBe(false);
      expect([...object.required].sort()).toEqual(Object.keys(object.properties).sort());
    }
  });

  it('the system prompt file exists and asks for {{ime}}', () => {
    const system = readFileSync(join(__dirname, '../../../../docs/planer-sistemski-prompt.md'), 'utf8');
    expect(system).toContain('{{ime}}');
    expect(system).toContain('KANDIDATI');
  });
});
