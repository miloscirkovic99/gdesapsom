import { addDays, addMonths, daysBetween, formatDate, formatDateSr, isIsoDate } from './dates';
import { estimateRoadKm, ROAD_FACTOR, straightLineKm } from './distance';
import { convert, formatRange, roundMoney } from './money';
import { REFERENCE_RATES, VIGNETTES } from './rules/prices';
import { cheapestCover, coveredDays, priceBounds, type VignetteProduct } from './vignettes';

const hungary = VIGNETTES.filter((product) => product.country === 'HU');
const huf = (product: VignetteProduct) => priceBounds(product, null).min;

describe('cheapestCover', () => {
  it('buys one 10-day vignette for the way out and back a week later', () => {
    const cover = cheapestCover(hungary, [0, 7], '2026-12-01', huf);
    expect(cover?.purchases.map((purchase) => purchase.product.id)).toEqual(['HU-D1-10D']);
    expect(cover?.total).toBe(6900);
  });

  it('buys two day vignettes when the return is outside every cheaper cover', () => {
    // 10-day misses day 14; the monthly (11 170) costs more than two days (2 × 5 550).
    const cover = cheapestCover(hungary, [0, 14], '2026-12-01', huf);
    expect(cover?.purchases.map((purchase) => purchase.product.id)).toEqual(['HU-D1-1D', 'HU-D1-1D']);
    expect(cover?.purchases.map((purchase) => purchase.startDay)).toEqual([0, 14]);
    expect(cover?.total).toBe(11100);
  });

  it('buys one day vignette for a one-way trip', () => {
    expect(cheapestCover(hungary, [0], '2026-12-01', huf)?.total).toBe(5550);
  });

  it('prefers fewer vignettes at the same price', () => {
    const products: VignetteProduct[] = [
      { id: 'day', country: 'HU', name: { sr: 'dan', en: 'day' }, validity: { kind: 'days', days: 1 }, price: 5, currency: 'EUR', sourceId: 'x' },
      { id: 'week', country: 'HU', name: { sr: 'nedelja', en: 'week' }, validity: { kind: 'days', days: 7 }, price: 10, currency: 'EUR', sourceId: 'x' },
    ];
    expect(cheapestCover(products, [0, 6], null, (product) => priceBounds(product, null).min)?.purchases).toHaveLength(1);
  });

  it('reports no cover when no price can be converted', () => {
    expect(cheapestCover(hungary, [0], null, () => null)).toBeNull();
  });
});

describe('coveredDays', () => {
  it('counts the first day of a 10-day vignette', () => {
    expect(coveredDays({ kind: 'days', days: 10 }, '2026-07-10')).toBe(10);
  });

  it('runs a Hungarian month to the same day of the next month, that day included', () => {
    expect(coveredDays({ kind: 'months', months: 1 }, '2026-10-15')).toBe(32);
  });

  it('ends a Bulgarian month the day before the same date', () => {
    // 15 October to 14 November
    expect(coveredDays({ kind: 'months', months: 1, endsDayBefore: true }, '2026-10-15')).toBe(31);
  });

  it('assumes the shortest month without a date', () => {
    expect(coveredDays({ kind: 'months', months: 1 }, null)).toBe(28);
  });
});

describe('priceBounds', () => {
  const romania = VIGNETTES.find((product) => product.id === 'RO-A-1D') as VignetteProduct;

  it('spans every emission class when the class is unknown', () => {
    expect(priceBounds(romania, null)).toEqual({ min: 20, max: 29 });
  });

  it('uses the price of the known emission class', () => {
    expect(priceBounds(romania, 'euro6')).toEqual({ min: 22, max: 22 });
  });
});

describe('distance estimate', () => {
  const belgrade = { lat: 44.8125, lon: 20.4612 };
  const noviSad = { lat: 45.2671, lon: 19.8335 };

  it('measures the straight line between two cities', () => {
    expect(straightLineKm(belgrade, noviSad)).toBeGreaterThan(68);
    expect(straightLineKm(belgrade, noviSad)).toBeLessThan(73);
  });

  it('turns it into a road range with the detour factor', () => {
    const line = straightLineKm(belgrade, noviSad);
    expect(estimateRoadKm(belgrade, noviSad)).toEqual({
      min: Math.round(line * ROAD_FACTOR.min),
      max: Math.round(line * ROAD_FACTOR.max),
    });
  });
});

describe('dates and money', () => {
  it('validates calendar dates', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('23.10.2026')).toBe(false);
  });

  it('moves across month ends and daylight-saving changes without losing a day', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });

  it('writes dates the Serbian and the English way', () => {
    expect(formatDateSr('2026-12-03')).toBe('3. decembra 2026.');
    expect(formatDate('2026-12-03', 'en')).toBe('3 December 2026');
  });

  it('rounds half up without floating point surprises', () => {
    expect(roundMoney(1.005, 'EUR')).toBe(1.01);
    expect(roundMoney(2.675, 'EUR')).toBe(2.68);
    expect(roundMoney(1234.5, 'RSD')).toBe(1235);
  });

  it('converts through the euro with the reference rates', () => {
    expect(convert(6900, 'HUF', 'EUR', REFERENCE_RATES)).toBeCloseTo(18.83, 2);
    expect(convert(100, 'EUR', 'RSD', REFERENCE_RATES)).toBeCloseTo(11748.22, 2);
    expect(convert(30, 'RON', 'RSD', REFERENCE_RATES)).toBeCloseTo(659.4, 1);
    expect(convert(10, 'CZK', 'EUR', REFERENCE_RATES)).toBeNull();
  });

  it('shows a single amount or a range', () => {
    expect(formatRange({ min: 120, max: 120 }, 'EUR', 'sr')).toMatch(/^120,00\s€$/);
    expect(formatRange({ min: 120, max: 120 }, 'EUR', 'en')).toBe('€120.00');
    expect(formatRange({ min: 1200, max: 1500 }, 'RSD', 'sr')).toContain('–');
  });
});
