import { assessTrip, euEntryCountry, type ReadinessReport } from './readiness';
import { AIR_SERBIA_PET_FEE, PREP_FEES, REFERENCE_RATES, TOLL_LINKS, VIGNETTES } from './rules/prices';
import type { RuleRecord, Ruleset } from './rules/rule.models';
import { RULESET } from './rules/ruleset';
import { SOURCES } from './rules/sources';
import type { DogProfile, TripPlan } from './trip.models';
import { isIsoDate } from './dates';

const TODAY = '2026-10-23';

const readyDog = (overrides: Partial<DogProfile> = {}): DogProfile => ({
  id: 'dog-1',
  birthDate: '2022-03-01',
  microchip: 'iso',
  chipBeforeVaccination: 'yes',
  rabiesVaccinated: 'yes',
  rabiesVaccinationDate: '2026-05-10',
  rabiesValidUntil: '2027-05-10',
  rabiesPrimary: 'no',
  passport: 'yes',
  restrictedBreed: 'no',
  fciRegistered: 'unknown',
  weightKg: null,
  ...overrides,
});

const trip = (overrides: Partial<TripPlan> = {}, dog: Partial<DogProfile> = {}): TripPlan => ({
  origin: 'RS',
  departureCity: 'Beograd',
  destination: 'HR',
  destinationCity: 'Split',
  transitCountries: [],
  departureDate: '2026-12-20',
  returnDate: '2026-12-27',
  transport: 'car',
  purpose: 'non-commercial',
  travelers: 2,
  dogs: [readyDog(dog)],
  ...overrides,
});

const item = (report: ReadinessReport, ruleId: string) => {
  const found = report.items.find((entry) => entry.ruleId === ruleId);
  if (!found) throw new Error(`No item for ${ruleId}: ${report.items.map((entry) => entry.ruleId).join(', ')}`);
  return found;
};

describe('assessTrip: Croatia by car with a ready dog', () => {
  const report = assessTrip(trip(), RULESET, TODAY, 'sr');

  it('confirms what is already met and asks for the certificate in its 10-day window', () => {
    expect(item(report, 'eu.microchip').status).toBe('confirmed');
    expect(item(report, 'eu.rabies-vaccination').status).toBe('confirmed');
    expect(item(report, 'eu.titre-exempt').status).toBe('confirmed');
    expect(item(report, 'rs.pet-passport').status).toBe('confirmed');
    const certificate = item(report, 'eu.health-certificate');
    expect(certificate.status).toBe('action-required');
    expect(certificate.window).toEqual({ from: '2026-12-10', until: '2026-12-20' });
    expect(certificate.prep).toEqual(['vet-exam', 'health-certificate']);
  });

  it('names the Croatian pet crossings on the Serbian border', () => {
    const entry = item(report, 'eu.entry-point');
    expect(entry.status).toBe('action-required');
    expect(entry.detail).toContain('Bajakovo');
    expect(entry.detail).not.toContain('Karasovići');
    expect(entry.sources.map((source) => source.id)).toContain('hr-entry-points-2025');
  });

  it('is never "ready": the certificate always has to be obtained', () => {
    expect(report.overall).toBe('action-required');
    expect(report.coverage).toBe('full');
    expect(report.earliestDeparture).toBeNull();
  });

  it('leaves the way home to be confirmed with the Veterinary Directorate', () => {
    expect(item(report, 'rs.return-from-eu').status).toBe('needs-verification');
  });

  it('cites a source with a verification date for every rule item', () => {
    for (const entry of report.items) {
      expect(entry.sources.length).toBeGreaterThan(0);
      expect(entry.verifiedAt).toBe('2026-10-23');
    }
  });

  it('ends a sentence with a date without a doubled full stop', () => {
    expect(report.items.filter((entry) => entry.detail.includes('..'))).toEqual([]);
    expect(item(report, 'eu.health-certificate').detail).toContain('najranije 10. decembra 2026.');
  });

  it('puts dated actions on a timeline in date order', () => {
    const dates = report.timeline.map((entry) => entry.date);
    expect(dates).toEqual([...dates].sort());
    expect(report.timeline.some((entry) => entry.itemKey === 'eu.health-certificate')).toBe(true);
  });
});

describe('assessTrip: deadlines', () => {
  it('blocks a puppy too young for the date and gives the earliest departure', () => {
    const report = assessTrip(
      trip({ departureDate: '2026-11-15', returnDate: '2026-11-20' }, { birthDate: '2026-10-01', rabiesVaccinated: 'no', rabiesVaccinationDate: null, rabiesValidUntil: null }),
      RULESET,
      TODAY,
      'sr',
    );
    const rabies = item(report, 'eu.rabies-vaccination');
    expect(rabies.late).toBe(true);
    // 12 weeks from 1 October = 24 December, plus 21 days
    expect(rabies.window?.from).toBe('2026-12-24');
    expect(report.earliestDeparture).toBe('2027-01-14');
    expect(report.overall).toBe('blocked');
  });

  it('asks for a chip, then a vaccination, with deadlines 21 days before departure', () => {
    const report = assessTrip(trip({}, { microchip: 'none' }), RULESET, TODAY, 'sr');
    expect(item(report, 'eu.microchip').window?.until).toBe('2026-11-29');
    const rabies = item(report, 'eu.rabies-vaccination');
    expect(rabies.status).toBe('action-required');
    expect(rabies.window).toEqual({ from: TODAY, until: '2026-11-29' });
    expect(rabies.late).toBe(false);
    expect(report.prepItems).toEqual(expect.arrayContaining(['microchip', 'rabies-vaccination']));
  });

  it('does not count a vaccination given before the chip', () => {
    const report = assessTrip(trip({}, { chipBeforeVaccination: 'no' }), RULESET, TODAY, 'sr');
    expect(item(report, 'eu.rabies-vaccination').detail).toContain('pre ugradnje čipa');
  });

  it('blocks a departure less than 21 days after a first vaccination', () => {
    const report = assessTrip(
      trip({}, { rabiesVaccinationDate: '2026-12-10', rabiesValidUntil: '2027-12-10', rabiesPrimary: 'yes' }),
      RULESET,
      TODAY,
      'sr',
    );
    expect(item(report, 'eu.rabies-vaccination').earliestDeparture).toBe('2026-12-31');
    expect(report.overall).toBe('blocked');
  });

  it('only asks to check when it is unknown whether the vaccination was the first', () => {
    const report = assessTrip(
      trip({}, { rabiesVaccinationDate: '2026-12-10', rabiesValidUntil: '2027-12-10', rabiesPrimary: 'unknown' }),
      RULESET,
      TODAY,
      'sr',
    );
    expect(item(report, 'eu.rabies-vaccination').status).toBe('needs-verification');
    expect(report.overall).toBe('action-required');
  });

  it('asks for a booster before a vaccine that runs out during the trip', () => {
    const report = assessTrip(trip({}, { rabiesValidUntil: '2026-12-24' }), RULESET, TODAY, 'sr');
    const rabies = item(report, 'eu.rabies-vaccination');
    expect(rabies.status).toBe('action-required');
    expect(rabies.window?.until).toBe('2026-12-24');
    expect(rabies.late).toBe(false);
  });

  it('asks for a booster before a vaccine that runs out before departure', () => {
    const report = assessTrip(trip({}, { rabiesValidUntil: '2026-11-30' }), RULESET, TODAY, 'sr');
    expect(item(report, 'eu.rabies-vaccination').window?.until).toBe('2026-11-30');
  });

  it('treats a new vaccination after an expired one as the first', () => {
    const report = assessTrip(trip({}, { rabiesValidUntil: '2026-09-01' }), RULESET, TODAY, 'sr');
    const rabies = item(report, 'eu.rabies-vaccination');
    expect(rabies.detail).toContain('istekla');
    expect(rabies.earliestDeparture).toBe('2026-11-13');
  });

  it('asks a non-ISO chip owner to bring a reader', () => {
    const report = assessTrip(trip({}, { microchip: 'other' }), RULESET, TODAY, 'sr');
    expect(item(report, 'eu.microchip')).toMatchObject({ status: 'action-required' });
    expect(item(report, 'eu.microchip').detail).toContain('čitač');
  });
});

describe('assessTrip: missing information', () => {
  it('says what is missing instead of guessing', () => {
    const report = assessTrip(trip({}, { rabiesVaccinated: 'unknown', passport: 'unknown' }), RULESET, TODAY, 'sr');
    expect(item(report, 'eu.rabies-vaccination').status).toBe('insufficient-info');
    expect(item(report, 'rs.pet-passport').status).toBe('insufficient-info');
    expect(report.counts['insufficient-info']).toBeGreaterThanOrEqual(2);
  });

  it('cannot compute deadlines without a departure date', () => {
    const report = assessTrip(trip({ departureDate: null, returnDate: null }), RULESET, TODAY, 'sr');
    expect(item(report, 'eu.health-certificate').status).toBe('insufficient-info');
    expect(item(report, 'eu.rabies-vaccination').status).toBe('insufficient-info');
  });

  it('needs the transit countries to know where a car enters the EU', () => {
    const report = assessTrip(trip({ destination: 'AT' }), RULESET, TODAY, 'sr');
    expect(item(report, 'eu.entry-point').status).toBe('insufficient-info');
    expect(euEntryCountry(trip({ destination: 'AT', transitCountries: ['HU'] }))).toBe('HU');
  });
});

describe('assessTrip: routes and dated sources', () => {
  it('marks an old crossing list as needing verification', () => {
    const report = assessTrip(trip({ destination: 'AT', transitCountries: ['HU'] }), RULESET, TODAY, 'sr');
    const entry = item(report, 'eu.entry-point');
    expect(entry.status).toBe('needs-verification');
    expect(entry.detail).toContain('Röszke');
    expect(entry.dated).toContain('2017');
  });

  it('shows the North Macedonian titre test on the way to Greece without blocking the trip', () => {
    const report = assessTrip(trip({ destination: 'GR', transitCountries: ['MK'] }), RULESET, TODAY, 'sr');
    const titre = item(report, 'mk.titre-test');
    expect(titre.status).toBe('needs-verification');
    expect(titre.conditional).toBe(true);
    expect(titre.late).toBe(false);
    expect(titre.earliestDeparture).toBe('2027-01-23');
    expect(report.earliestDeparture).toBeNull();
    expect(report.overall).not.toBe('blocked');
    expect(item(report, 'eu.entry-point').detail).toContain('Evzoni');
    expect(report.coverage).toBe('partial');
  });

  it('gives a partial report for Montenegro and warns about coming home', () => {
    const report = assessTrip(trip({ destination: 'ME' }), RULESET, TODAY, 'sr');
    expect(report.items.some((entry) => entry.ruleId.startsWith('eu.'))).toBe(false);
    expect(item(report, 'me.entry').status).toBe('needs-verification');
    expect(item(report, 'rs.return-from-me').detail).toContain('test titra');
    expect(item(report, 'me.microchip').status).toBe('needs-verification');
  });

  it('reports an unsupported route when no rules cover the destination', () => {
    const empty: Ruleset = { ...RULESET, coverage: {}, rules: RULESET.rules.filter((rule) => !rule.id.startsWith('me.')) };
    const report = assessTrip(trip({ destination: 'ME' }), empty, TODAY, 'sr');
    expect(report.overall).toBe('unsupported');
    expect(report.coverage).toBe('none');
    expect(item(report, 'coverage.ME').status).toBe('needs-verification');
  });

  it('does not assess commercial movement', () => {
    const report = assessTrip(trip({ purpose: 'commercial' }), RULESET, TODAY, 'sr');
    expect(report.overall).toBe('unsupported');
    expect(report.items.map((entry) => entry.ruleId)).toEqual(['movement.commercial']);
  });

  it('uses the airport list and carrier rules for a flight', () => {
    const report = assessTrip(trip({ destination: 'AT', transport: 'plane' }, { weightKg: 12 }), RULESET, TODAY, 'sr');
    expect(item(report, 'eu.entry-point').detail).toContain('Beč');
    const carrier = item(report, 'carrier.plane');
    expect(carrier.status).toBe('needs-verification');
    expect(carrier.detail).toContain('12 kg');
  });
});

describe('assessTrip: breed rules', () => {
  const pitBull = { restrictedBreed: 'yes' as const, fciRegistered: 'no' as const };

  it('blocks a route through Croatia for an unregistered bull-type terrier', () => {
    const report = assessTrip(trip({ destination: 'SI', transitCountries: ['HR'] }, pitBull), RULESET, TODAY, 'sr');
    expect(item(report, 'hr.restricted-breeds').blocked).toBe(true);
    expect(report.overall).toBe('blocked');
  });

  it('lets an FCI-registered dog through Croatia', () => {
    const report = assessTrip(trip({}, { restrictedBreed: 'yes', fciRegistered: 'yes' }), RULESET, TODAY, 'sr');
    expect(item(report, 'hr.restricted-breeds').status).toBe('confirmed');
  });

  it('asks about FCI registration when it matters', () => {
    const report = assessTrip(trip({}, { restrictedBreed: 'yes', fciRegistered: 'unknown' }), RULESET, TODAY, 'sr');
    expect(item(report, 'hr.restricted-breeds').status).toBe('insufficient-info');
  });

  it('allows a listed breed in Germany for up to four weeks', () => {
    const short = assessTrip(trip({ destination: 'DE', transport: 'plane' }, pitBull), RULESET, TODAY, 'sr');
    expect(item(short, 'de.restricted-breeds')).toMatchObject({ status: 'action-required', blocked: false });
    const long = assessTrip(trip({ destination: 'DE', transport: 'plane', returnDate: '2027-02-15' }, pitBull), RULESET, TODAY, 'sr');
    expect(item(long, 'de.restricted-breeds').status).toBe('needs-verification');
  });
});

describe('assessTrip: stale and unverified rules', () => {
  it('stops confirming anything once the review date has passed', () => {
    const report = assessTrip(trip({ departureDate: '2027-06-10', returnDate: '2027-06-17' }), RULESET, '2027-05-01', 'sr');
    expect(report.items.filter((entry) => entry.status === 'confirmed')).toHaveLength(0);
    expect(report.items.every((entry) => entry.stale)).toBe(true);
    expect(item(report, 'eu.microchip').detail).toContain('zastarela');
    expect(report.overall).toBe('verify');
  });

  it('never confirms a record without a verification date', () => {
    const unverified: Ruleset = {
      ...RULESET,
      rules: RULESET.rules.map((rule): RuleRecord => (rule.id === 'eu.microchip' ? { ...rule, verifiedAt: null } : rule)),
    };
    const microchip = item(assessTrip(trip(), unverified, TODAY, 'sr'), 'eu.microchip');
    expect(microchip.status).toBe('needs-verification');
    expect(microchip.detail).toContain('još nije potvrđeno');
  });

  it('evaluates every dog on its own', () => {
    const report = assessTrip(
      { ...trip(), dogs: [readyDog(), readyDog({ id: 'dog-2', microchip: 'none' })] },
      RULESET,
      TODAY,
      'sr',
    );
    const chips = report.items.filter((entry) => entry.ruleId === 'eu.microchip');
    expect(chips.map((entry) => [entry.dogLabel, entry.status])).toEqual([
      ['Pas 2', 'action-required'],
      ['Pas 1', 'confirmed'],
    ]);
    expect(item(report, 'eu.max-pets').detail).toContain('2 psa');
  });
});

describe('assessTrip in English', () => {
  const SERBIAN_LETTERS = /[čćšžđČĆŠŽĐ]/;
  const texts = (report: ReadinessReport) => [
    report.coverageNote,
    ...report.assumptions,
    ...report.items.flatMap((entry) => [entry.title, entry.detail, entry.summary, entry.howTo, entry.caveat, entry.dated]),
  ].filter((text): text is string => !!text);

  it('writes the whole report in English', () => {
    const report = assessTrip(trip(), RULESET, TODAY, 'en');
    expect(texts(report).filter((text) => SERBIAN_LETTERS.test(text))).toEqual([]);
    expect(item(report, 'eu.health-certificate').title).toBe('EU animal health certificate');
    expect(item(report, 'eu.health-certificate').detail).toContain('no earlier than 10 December 2026.');
  });

  it('reaches the same verdict, statuses and dates as the Serbian report', () => {
    const trips = [
      trip(),
      trip({}, { microchip: 'none' }),
      trip({ destination: 'GR', transitCountries: ['MK'] }),
      trip({ destination: 'ME' }),
      trip({ destination: 'DE', transport: 'plane' }, { restrictedBreed: 'yes', fciRegistered: 'no', weightKg: 12 }),
      trip({ departureDate: null, returnDate: null }, { rabiesVaccinated: 'unknown' }),
    ];
    const shape = (report: ReadinessReport) => ({
      overall: report.overall,
      earliestDeparture: report.earliestDeparture,
      prepItems: report.prepItems,
      items: report.items.map((entry) => [entry.key, entry.status, entry.window, entry.late, entry.blocked, entry.conditional]),
    });
    for (const plan of trips) {
      expect(shape(assessTrip(plan, RULESET, TODAY, 'en'))).toEqual(shape(assessTrip(plan, RULESET, TODAY, 'sr')));
    }
  });

  it('names dogs, airports and old lists in English', () => {
    const twoDogs = assessTrip({ ...trip(), dogs: [readyDog(), readyDog({ id: 'dog-2' })] }, RULESET, TODAY, 'en');
    expect(item(twoDogs, 'eu.microchip').dogLabel).toBe('Dog 1');
    expect(item(twoDogs, 'eu.max-pets').detail).toContain('2 dogs');

    expect(item(assessTrip(trip({ destination: 'AT', transport: 'plane' }), RULESET, TODAY, 'en'), 'eu.entry-point').detail).toContain(
      'Vienna (Schwechat)',
    );
    const hungary = item(assessTrip(trip({ destination: 'AT', transitCountries: ['HU'] }), RULESET, TODAY, 'en'), 'eu.entry-point');
    expect(hungary.dated).toContain('dates from 24 May 2017');
    expect(hungary.detail).toContain('You enter the EU in Hungary.');
  });

  it('explains stale rules in English', () => {
    const report = assessTrip(trip({ departureDate: '2027-06-10', returnDate: '2027-06-17' }), RULESET, '2027-05-01', 'en');
    expect(item(report, 'eu.microchip').detail).toContain('We last checked this rule on 23 October 2026');
  });
});

describe('ruleset data', () => {
  const sourceIds = new Set(SOURCES.map((source) => source.id));

  it('has every rule text in both languages', () => {
    for (const rule of RULESET.rules) {
      for (const text of [rule.title, rule.summary, rule.caveat, rule.howTo, rule.dated]) {
        if (!text) continue;
        expect(text.sr.trim()).not.toBe('');
        expect(text.en.trim()).not.toBe('');
        expect(text.en).not.toBe(text.sr);
      }
    }
    for (const coverage of Object.values(RULESET.coverage)) expect(coverage?.note.en).not.toBe(coverage?.note.sr);
  });

  it('has unique rule and source ids', () => {
    expect(new Set(RULESET.rules.map((rule) => rule.id)).size).toBe(RULESET.rules.length);
    expect(sourceIds.size).toBe(SOURCES.length);
  });

  it('cites only registered sources, at least one per rule', () => {
    for (const rule of RULESET.rules) {
      expect(rule.sourceIds.length).toBeGreaterThan(0);
      for (const id of rule.sourceIds) expect(sourceIds.has(id)).toBe(true);
      if (rule.check.kind === 'entry-point') {
        for (const list of Object.values(rule.check.points)) {
          for (const id of list?.sourceIds ?? []) expect(sourceIds.has(id)).toBe(true);
        }
      }
    }
  });

  it('uses every registered source somewhere', () => {
    const used = new Set<string>();
    for (const rule of RULESET.rules) {
      rule.sourceIds.forEach((id) => used.add(id));
      if (rule.check.kind === 'entry-point') {
        Object.values(rule.check.points).forEach((list) => list?.sourceIds.forEach((id) => used.add(id)));
      }
    }
    VIGNETTES.forEach((product) => used.add(product.sourceId));
    TOLL_LINKS.forEach((link) => used.add(link.sourceId));
    Object.values(PREP_FEES).forEach((fee) => fee && used.add(fee.sourceId));
    used.add(AIR_SERBIA_PET_FEE.sourceId);
    used.add(REFERENCE_RATES.rsdSourceId);
    used.add(REFERENCE_RATES.otherSourceId);
    expect([...sourceIds].filter((id) => !used.has(id))).toEqual([]);
  });

  it('dates every record and review', () => {
    for (const rule of RULESET.rules) {
      expect(isIsoDate(rule.verifiedAt)).toBe(true);
      expect(isIsoDate(rule.reviewBy)).toBe(true);
      expect((rule.verifiedAt as string) < rule.reviewBy).toBe(true);
    }
    for (const source of SOURCES) {
      expect(isIsoDate(source.checkedAt)).toBe(true);
      expect(() => new URL(source.url)).not.toThrow();
    }
  });

  it('covers non-commercial movement only', () => {
    expect(RULESET.rules.every((rule) => rule.scope.movement === 'non-commercial')).toBe(true);
  });
});
