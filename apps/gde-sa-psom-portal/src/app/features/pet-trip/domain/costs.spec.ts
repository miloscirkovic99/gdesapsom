import { compareScenarios } from './compare';
import {
  type CostContext,
  type CostLine,
  type CostScenario,
  defaultScenario,
  estimateScenario,
  type PriceBook,
  type SharedCostSettings,
} from './costs';
import { PRICE_BOOK } from './rules/prices';

const TODAY = '2026-10-23';

const shared = (overrides: Partial<SharedCostSettings> = {}): SharedCostSettings => ({
  currency: 'EUR',
  rsdPerEur: 117.4822,
  contingencyPercent: 0,
  fuelConsumption: 6.5,
  fuelPrice: 1.6,
  emissionClass: null,
  vetPrep: {},
  ...overrides,
});

const context = (overrides: Partial<CostContext> = {}): CostContext => ({
  travelers: 2,
  dogs: 1,
  dogWeightsKg: [null],
  departureDate: '2026-12-01',
  roundTrip: true,
  today: TODAY,
  prepItems: [],
  prices: PRICE_BOOK,
  lang: 'sr',
  ...overrides,
});

const carToCroatia = (overrides: Partial<CostScenario> = {}): CostScenario => ({
  ...defaultScenario('A', 'Varijanta A', { destination: 'HR', transport: 'car', transitCountries: [], nights: 7 }),
  distanceKm: 600,
  extraKm: 50,
  tolls: 40,
  accommodationPerNight: 60,
  stayPetFee: 10,
  stayPetFeeUnit: 'per-dog-per-night',
  ...overrides,
});

const lineOf = (lines: CostLine[], category: CostLine['category']) => lines.find((entry) => entry.category === category);

describe('estimateScenario: car', () => {
  it('computes fuel for the way there and back plus local driving', () => {
    const result = estimateScenario(carToCroatia(), shared(), context());
    // (600 × 2 + 50) km × 6.5 l/100 km × 1.60 €/l
    expect(lineOf(result.lines, 'fuel')).toMatchObject({ amount: { min: 130, max: 130 }, basis: 'user' });
  });

  it('counts the distance once for a one-way trip', () => {
    const result = estimateScenario(carToCroatia({ extraKm: null }), shared(), context({ roundTrip: false }));
    expect(lineOf(result.lines, 'fuel')?.amount).toEqual({ min: 62.4, max: 62.4 });
  });

  it('turns a map estimate into a fuel range marked as an estimate', () => {
    const result = estimateScenario(
      carToCroatia({ distanceKm: null, extraKm: null, distanceEstimateKm: { min: 500, max: 600 } }),
      shared(),
      context(),
    );
    expect(lineOf(result.lines, 'fuel')).toMatchObject({ amount: { min: 104, max: 124.8 }, basis: 'estimate' });
    expect(result.total.min).toBeLessThan(result.total.max);
  });

  it('leaves fuel unknown without consumption and says what is missing', () => {
    const result = estimateScenario(carToCroatia(), shared({ fuelConsumption: null }), context());
    const fuel = lineOf(result.lines, 'fuel');
    expect(fuel).toMatchObject({ amount: null, basis: 'unknown' });
    expect(fuel?.detail).toContain('potrošnju');
    expect(result.complete).toBe(false);
    expect(result.unknown).toContain('fuel');
  });

  it('adds the cheapest Hungarian vignette for the way out and back a week later', () => {
    // Before 30 November, the last day of Austria's published 2026 prices.
    const result = estimateScenario(
      carToCroatia({ destination: 'AT', transitCountries: ['HU'] }),
      shared(),
      context({ departureDate: '2026-11-10' }),
    );
    const vignettes = lineOf(result.lines, 'vignettes');
    // HU 10-day 6 900 HUF / 366.43 = 18.83 €, AT 10-day 12.80 €; both cover day 0 and day 7.
    expect(vignettes?.amount).toEqual({ min: 31.63, max: 31.63 });
    expect(vignettes?.basis).toBe('verified');
    expect(vignettes?.sourceIds).toEqual(expect.arrayContaining(['hu-evignette-rates', 'at-vignette']));
  });

  it('respects a visitor who drives without a vignette', () => {
    const result = estimateScenario(
      carToCroatia({ destination: 'AT', transitCountries: ['HU'], vignetteChoice: { HU: 'none', AT: 'none' } }),
      shared(),
      context(),
    );
    expect(lineOf(result.lines, 'vignettes')).toMatchObject({ amount: { min: 0, max: 0 }, basis: 'user' });
  });

  it('gives a range for the Romanian vignette while the emission class is unknown', () => {
    const scenario = carToCroatia({ destination: 'BG', transitCountries: ['RO'], nights: 3 });
    const unknown = lineOf(estimateScenario(scenario, shared(), context()).lines, 'vignettes');
    const euro6 = lineOf(estimateScenario(scenario, shared({ emissionClass: 'euro6' }), context()).lines, 'vignettes');
    expect(unknown?.amount?.min).toBeLessThan(unknown?.amount?.max as number);
    expect(euro6?.amount?.min).toBe(euro6?.amount?.max);
  });

  it('calls an Austrian vignette an estimate once the trip is after the published price', () => {
    const scenario = carToCroatia({ destination: 'AT', transitCountries: ['SI'] });
    const before = lineOf(estimateScenario(scenario, shared(), context({ departureDate: '2026-11-01' })).lines, 'vignettes');
    const after = lineOf(estimateScenario(scenario, shared(), context({ departureDate: '2026-12-20' })).lines, 'vignettes');
    expect(before?.basis).toBe('verified');
    expect(after?.basis).toBe('estimate');
  });

  it('calls every published price an estimate after the review date', () => {
    const scenario = carToCroatia({ destination: 'AT', transitCountries: ['SI'] });
    const line = lineOf(estimateScenario(scenario, shared(), context({ today: '2027-03-01', departureDate: '2027-03-10' })).lines, 'vignettes');
    expect(line?.basis).toBe('estimate');
  });
});

describe('estimateScenario: public transport', () => {
  const plane = (overrides: Partial<CostScenario> = {}): CostScenario => ({
    ...defaultScenario('B', 'Avionom', { destination: 'DE', transport: 'plane', transitCountries: [], nights: 7 }),
    ticketPricePerPerson: 180,
    accommodationPerNight: 80,
    stayPetFee: 0,
    ...overrides,
  });

  it('multiplies return tickets by travellers and one-way tickets by both directions', () => {
    expect(lineOf(estimateScenario(plane(), shared(), context()).lines, 'tickets')?.amount).toEqual({ min: 360, max: 360 });
    expect(
      lineOf(estimateScenario(plane({ ticketIsReturn: false }), shared(), context()).lines, 'tickets')?.amount,
    ).toEqual({ min: 720, max: 720 });
  });

  it("uses Air Serbia's published fee per flight and dog", () => {
    const line = lineOf(
      estimateScenario(plane({ petTransportCarrier: 'air-serbia' }), shared(), context({ dogs: 1 })).lines,
      'pet-transport',
    );
    // Rest of Europe: 70 € × 1 dog × 2 flights
    expect(line).toMatchObject({ amount: { min: 140, max: 140 }, basis: 'verified', sourceIds: ['airserbia-pets'] });
  });

  it("charges Air Serbia's regional fee to Croatia and counts connecting flights", () => {
    const line = lineOf(
      estimateScenario(plane({ destination: 'HR', petTransportCarrier: 'air-serbia', flightsPerDirection: 2 }), shared(), context()).lines,
      'pet-transport',
    );
    expect(line?.amount).toEqual({ min: 160, max: 160 });
  });

  it('warns when a dog is too heavy for the Air Serbia cabin', () => {
    const result = estimateScenario(plane({ petTransportCarrier: 'air-serbia' }), shared(), context({ dogWeightsKg: [12] }));
    expect(result.warnings.join(' ')).toContain('8 kg');
  });

  it('applies the fee unit the visitor chose for another carrier', () => {
    const perDirection = estimateScenario(plane({ petTransportFee: 25 }), shared(), context({ dogs: 2 }));
    const perDog = estimateScenario(plane({ petTransportFee: 25, petTransportFeeUnit: 'per-dog' }), shared(), context({ dogs: 2 }));
    const total = estimateScenario(plane({ petTransportFee: 25, petTransportFeeUnit: 'total' }), shared(), context({ dogs: 2 }));
    expect(lineOf(perDirection.lines, 'pet-transport')?.amount?.min).toBe(100);
    expect(lineOf(perDog.lines, 'pet-transport')?.amount?.min).toBe(50);
    expect(lineOf(total.lines, 'pet-transport')?.amount?.min).toBe(25);
  });

  it('has no fuel, toll or vignette lines', () => {
    const categories = estimateScenario(plane(), shared(), context()).lines.map((entry) => entry.category);
    expect(categories).not.toEqual(expect.arrayContaining(['fuel']));
    expect(categories).not.toContain('tolls');
    expect(categories).not.toContain('vignettes');
  });
});

describe('estimateScenario: nights, dogs and totals', () => {
  it('drops accommodation on a day trip and counts one day', () => {
    const result = estimateScenario(carToCroatia({ nights: 0, foodPerPersonPerDay: 20 }), shared(), context());
    expect(lineOf(result.lines, 'accommodation')).toBeUndefined();
    expect(lineOf(result.lines, 'accommodation-pet-fee')).toBeUndefined();
    expect(result.days).toBe(1);
    expect(lineOf(result.lines, 'food')?.amount?.min).toBe(40);
  });

  it('charges the pet fee per dog and night', () => {
    const result = estimateScenario(carToCroatia(), shared(), context({ dogs: 2 }));
    expect(lineOf(result.lines, 'accommodation')?.amount?.min).toBe(420);
    expect(lineOf(result.lines, 'accommodation-pet-fee')?.amount?.min).toBe(140);
  });

  it('charges the pet fee once per stay when the host says so', () => {
    const perStay = estimateScenario(carToCroatia({ stayPetFee: 30, stayPetFeeUnit: 'per-stay' }), shared(), context({ dogs: 2 }));
    const perDogStay = estimateScenario(carToCroatia({ stayPetFee: 30, stayPetFeeUnit: 'per-dog-per-stay' }), shared(), context({ dogs: 2 }));
    expect(lineOf(perStay.lines, 'accommodation-pet-fee')?.amount?.min).toBe(30);
    expect(lineOf(perDogStay.lines, 'accommodation-pet-fee')?.amount?.min).toBe(60);
  });

  it('treats an empty pet fee as missing, not as zero', () => {
    const result = estimateScenario(carToCroatia({ stayPetFee: null }), shared(), context());
    expect(result.unknown).toContain('accommodation-pet-fee');
    expect(result.complete).toBe(false);
  });

  it('adds food for people and dogs for every day', () => {
    const result = estimateScenario(carToCroatia({ foodPerPersonPerDay: 25, dogFoodPerDogPerDay: 3 }), shared(), context({ dogs: 2 }));
    // 8 days × (2 × 25 + 2 × 3)
    expect(lineOf(result.lines, 'food')?.amount?.min).toBe(448);
  });

  it('keeps optional lines out of the total and out of the missing list', () => {
    const result = estimateScenario(carToCroatia(), shared(), context());
    expect(lineOf(result.lines, 'activities')?.basis).toBe('not-included');
    expect(result.unknown).not.toContain('activities');
    expect(result.unknown).not.toContain('food');
  });

  it('adds the contingency to the known costs and splits per person and day', () => {
    const result = estimateScenario(carToCroatia(), shared({ contingencyPercent: 10 }), context());
    // fuel 130 + tolls 40 + stay 420 + pet fee 70 = 660; +10 %
    expect(result.subtotal).toEqual({ min: 660, max: 660 });
    expect(result.contingency).toEqual({ min: 66, max: 66 });
    expect(result.total).toEqual({ min: 726, max: 726 });
    expect(result.perPerson).toEqual({ min: 363, max: 363 });
    expect(result.perDay).toEqual({ min: 90.75, max: 90.75 });
    expect(result.complete).toBe(true);
  });

  it('caps the contingency at 50 %', () => {
    expect(estimateScenario(carToCroatia(), shared({ contingencyPercent: 80 }), context()).contingencyPercent).toBe(50);
  });

  it('rounds dinars to whole amounts and lets the lines add up to the total', () => {
    const result = estimateScenario(
      carToCroatia({ distanceKm: 611, tolls: 4321.4, accommodationPerNight: 7033.33, stayPetFee: 1170.5 }),
      shared({ currency: 'RSD', fuelPrice: 187.9, contingencyPercent: 7 }),
      context(),
    );
    const lineTotal = result.lines.reduce((sum, entry) => sum + (entry.amount?.min ?? 0), 0);
    for (const entry of result.lines) {
      if (entry.amount) expect(Number.isInteger(entry.amount.min)).toBe(true);
    }
    expect(result.subtotal.min).toBe(lineTotal);
    expect(result.total.min).toBe(result.subtotal.min + result.contingency.min);
  });

  it('rounds euro lines to cents', () => {
    const result = estimateScenario(carToCroatia({ distanceKm: 333.33 }), shared({ fuelPrice: 1.659 }), context());
    const fuel = lineOf(result.lines, 'fuel')?.amount?.min as number;
    expect(Math.round(fuel * 100) / 100).toBe(fuel);
  });

  it('ignores negative or impossible numbers with a warning', () => {
    const result = estimateScenario(carToCroatia({ tolls: -20, accommodationPerNight: Number.NaN }), shared(), context());
    expect(lineOf(result.lines, 'tolls')?.basis).toBe('unknown');
    expect(lineOf(result.lines, 'accommodation')?.basis).toBe('unknown');
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('has no per-person split without travellers', () => {
    const result = estimateScenario(carToCroatia(), shared(), context({ travelers: 0 }));
    expect(result.perPerson).toBeNull();
    expect(result.warnings.join(' ')).toContain('najmanje 1');
  });
});

describe('estimateScenario: vet preparation', () => {
  it('uses the published certificate fees as an estimate until the visitor types a price', () => {
    const prep: CostContext['prepItems'] = ['health-certificate'];
    const estimated = lineOf(estimateScenario(carToCroatia(), shared(), context({ prepItems: prep })).lines, 'vet-prep');
    // 9 580 RSD / 117.4822 = 81.54 €
    expect(estimated).toMatchObject({ amount: { min: 81.54, max: 81.54 }, basis: 'estimate', sourceIds: ['rs-vet-export-request'] });

    const typed = lineOf(
      estimateScenario(carToCroatia(), shared({ vetPrep: { 'health-certificate': 90 } }), context({ prepItems: prep })).lines,
      'vet-prep',
    );
    expect(typed).toMatchObject({ amount: { min: 90, max: 90 }, basis: 'user' });
  });

  it('marks preparation as partly known when some prices are missing', () => {
    const result = estimateScenario(
      carToCroatia(),
      shared({ vetPrep: { microchip: 2500 }, currency: 'RSD' }),
      context({ prepItems: ['microchip', 'rabies-vaccination'] }),
    );
    expect(lineOf(result.lines, 'vet-prep')).toMatchObject({ amount: { min: 2500, max: 2500 }, partial: true });
    expect(result.unknown).toContain('vet-prep');
  });

  it('costs nothing when the readiness check asks for no preparation', () => {
    const line = lineOf(estimateScenario(carToCroatia(), shared(), context({ prepItems: [] })).lines, 'vet-prep');
    expect(line).toMatchObject({ amount: { min: 0, max: 0 }, essential: false });
  });

  it('cannot convert a published price without a rate', () => {
    const prices: PriceBook = { ...PRICE_BOOK, rates: { rsdPerEur: 117, perEur: {} } };
    const line = lineOf(
      estimateScenario(carToCroatia({ destination: 'AT', transitCountries: ['HU'] }), shared(), context({ prices })).lines,
      'vignettes',
    );
    expect(line?.basis).toBe('unknown');
  });
});

describe('compareScenarios', () => {
  const complete = (id: string, accommodationPerNight: number, nights = 7) =>
    estimateScenario(carToCroatia({ id, accommodationPerNight, nights }), shared(), context());
  const refs = [
    { id: 'A', label: 'Varijanta A' },
    { id: 'B', label: 'Varijanta B' },
    { id: 'C', label: 'Varijanta C' },
  ];

  it('names the cheapest scenario and how much it saves', () => {
    const comparison = compareScenarios(refs, [complete('A', 60), complete('B', 45)], 'sr');
    expect(comparison.verdict).toBe('cheapest');
    expect(comparison.cheapestId).toBe('B');
    expect(comparison.saving).toEqual({ min: 105, max: 105 });
  });

  it('calls overlapping estimates too close to tell', () => {
    const a = estimateScenario(
      carToCroatia({ id: 'A', distanceKm: null, distanceEstimateKm: { min: 500, max: 700 } }),
      shared(),
      context(),
    );
    const b = estimateScenario(carToCroatia({ id: 'B', distanceKm: 620 }), shared(), context());
    const comparison = compareScenarios(refs, [a, b], 'sr');
    expect(comparison.verdict).toBe('too-close');
    expect(comparison.cheapestId).toBeNull();
    expect(comparison.notes.join(' ')).toContain('procena');
  });

  it('refuses to pick a winner when a scenario misses a cost', () => {
    const missing = estimateScenario(carToCroatia({ id: 'B', accommodationPerNight: null }), shared(), context());
    const comparison = compareScenarios(refs, [complete('A', 60), missing], 'sr');
    expect(comparison.verdict).toBe('not-comparable');
    expect(comparison.blockers[0]).toContain('Varijanta B');
  });

  it('refuses when an optional cost was entered for only one scenario', () => {
    const withFood = estimateScenario(carToCroatia({ id: 'A', foodPerPersonPerDay: 30 }), shared(), context());
    const comparison = compareScenarios(refs, [withFood, complete('B', 45)], 'sr');
    expect(comparison.verdict).toBe('not-comparable');
    expect(comparison.blockers.join(' ')).toContain('Hrana');
  });

  it('notes different trip lengths', () => {
    const comparison = compareScenarios(refs, [complete('A', 60, 7), complete('B', 60, 10)], 'sr');
    expect(comparison.notes.join(' ')).toContain('različito');
    expect(comparison.cheapestId).toBe('A');
  });

  it('lets a vet price missing the same way everywhere stand, with a note', () => {
    const prep: CostContext['prepItems'] = ['vet-exam', 'health-certificate'];
    const a = estimateScenario(carToCroatia({ id: 'A', accommodationPerNight: 60 }), shared(), context({ prepItems: prep }));
    const b = estimateScenario(carToCroatia({ id: 'B', accommodationPerNight: 45 }), shared(), context({ prepItems: prep }));
    expect(a.complete).toBe(false);
    const comparison = compareScenarios(refs, [a, b], 'sr');
    expect(comparison.verdict).toBe('cheapest');
    expect(comparison.cheapestId).toBe('B');
    expect(comparison.notes.join(' ')).toContain('u svim varijantama isto');
  });

  it('still refuses when the missing vet prices differ between scenarios', () => {
    const a = estimateScenario(carToCroatia({ id: 'A' }), shared(), context({ prepItems: ['vet-exam'] }));
    const b = estimateScenario(carToCroatia({ id: 'B' }), shared(), context({ prepItems: ['vet-exam', 'titre-test'] }));
    expect(compareScenarios(refs, [a, b], 'sr').verdict).toBe('not-comparable');
  });

  it('compares nothing with a single scenario', () => {
    expect(compareScenarios(refs, [complete('A', 60)], 'sr').verdict).toBe('single');
  });

  it('compares a car trip with a flight on the same terms', () => {
    const flight = estimateScenario(
      {
        ...defaultScenario('B', 'Varijanta B', { destination: 'HR', transport: 'plane', transitCountries: [], nights: 7 }),
        ticketPricePerPerson: 220,
        petTransportCarrier: 'air-serbia',
        accommodationPerNight: 60,
        stayPetFee: 10,
      },
      shared(),
      context(),
    );
    const comparison = compareScenarios(refs, [complete('A', 60), flight], 'sr');
    expect(comparison.verdict).toBe('cheapest');
    expect(comparison.cheapestId).toBe('A');
  });
});

describe('costs in English', () => {
  const both = (scenario: CostScenario, overrides: Partial<CostContext> = {}) => ({
    sr: estimateScenario(scenario, shared(), context({ ...overrides, lang: 'sr' })),
    en: estimateScenario(scenario, shared(), context({ ...overrides, lang: 'en' })),
  });
  const numbers = (result: ReturnType<typeof estimateScenario>) => ({
    lines: result.lines.map((entry) => [entry.category, entry.amount, entry.basis, !!entry.partial]),
    total: result.total,
    unknown: result.unknown,
  });

  it('computes the same amounts in both languages', () => {
    const scenarios = [
      carToCroatia(),
      carToCroatia({ destination: 'AT', transitCountries: ['HU'], distanceKm: null, distanceEstimateKm: { min: 500, max: 600 } }),
      carToCroatia({ transport: 'plane', petTransportCarrier: 'air-serbia', ticketPricePerPerson: 200 }),
    ];
    for (const scenario of scenarios) {
      const { sr, en } = both(scenario, { prepItems: ['vet-exam', 'health-certificate'] });
      expect(numbers(en)).toEqual(numbers(sr));
    }
  });

  it('labels and explains every line in English', () => {
    const { en } = both(carToCroatia({ destination: 'AT', transitCountries: ['HU'] }), { prepItems: ['health-certificate'] });
    expect(lineOf(en.lines, 'fuel')?.label).toBe('Fuel');
    expect(lineOf(en.lines, 'fuel')?.detail).toContain('per litre');
    expect(lineOf(en.lines, 'vignettes')?.detail).toContain('Hungary, e-matrica D1, 10 days');
    expect(lineOf(en.lines, 'vet-prep')?.detail).toContain('Fees for the animal health certificate: €81.54 (state fees');
    expect(en.assumptions.join(' ')).toContain('Vignettes are counted');
    expect([...en.lines.map((entry) => entry.detail), ...en.assumptions].filter((text) => /[čćšžđ]/.test(text))).toEqual([]);
  });

  it('explains the comparison in English', () => {
    const refs = [
      { id: 'A', label: 'Option A' },
      { id: 'B', label: 'Option B' },
    ];
    const withFood = estimateScenario(carToCroatia({ foodPerPersonPerDay: 20 }), shared(), context({ lang: 'en' }));
    const plain = estimateScenario(carToCroatia({ id: 'B' }), shared(), context({ lang: 'en' }));
    const comparison = compareScenarios(refs, [withFood, plain], 'en');
    expect(comparison.verdict).toBe('not-comparable');
    expect(comparison.blockers).toEqual(['Food: the amount was entered only for Option A. Enter it for every option or for none.']);
  });
});
