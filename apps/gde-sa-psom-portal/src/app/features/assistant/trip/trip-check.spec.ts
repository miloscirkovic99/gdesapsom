import { addDays, todayIso } from '../../pet-trip/domain/dates';
import { readPrefill } from '../../pet-trip/trip-prefill';
import { EMPTY_TRIP, type TripQuery } from '../domain/query.models';
import { checkTrip } from './trip-check';

const today = todayIso();
const trip = (overrides: Partial<TripQuery>): TripQuery => ({ ...EMPTY_TRIP, ...overrides });

describe('checkTrip', () => {
  it('runs the planner’s readiness check and lists what is left to do', () => {
    const departure = addDays(today, 40);
    const check = checkTrip(trip({ destination: 'HR', transport: 'car', departureDate: departure, dogs: 1 }), today, 'sr');

    expect(check).not.toBeNull();
    expect(check?.headline).toContain('Hrvatska');
    expect(check?.headline).toContain('kolima');
    expect(check?.route).toBeNull();
    expect(check?.items.length).toBeGreaterThan(0);
    expect(check?.items.every((item) => item.status !== 'confirmed')).toBe(true);
    // Nothing is known about the dog yet, so the report cannot be "ready".
    expect(check?.overall).not.toBe('ready');
    expect(check?.missingDate).toBe(false);
    expect(check?.plannerParams).toEqual({ destination: 'HR', transport: 'car', departure, dogs: '1' });
  });

  it('assumes the usual driving route to a country without a border with Serbia, and hands it to the planner', () => {
    const check = checkTrip(trip({ destination: 'DE', transport: 'car' }), today, 'sr');
    expect(check?.route).toBeTruthy();
    expect(check?.plannerParams['transit']).toBe('HU,AT');
    expect(check?.missingDate).toBe(true);
  });

  it('flies without a route, and writes English for the English site', () => {
    const check = checkTrip(trip({ destination: 'GR', transport: 'plane' }), today, 'en');
    expect(check?.route).toBeNull();
    expect(check?.headline).toContain('Greece');
    expect(check?.headline).toContain('by plane');
  });

  it('needs a destination', () => {
    expect(checkTrip(trip({ transport: 'car' }), today, 'sr')).toBeNull();
  });

  it('builds a planner link the planner reads back', () => {
    const departure = addDays(today, 10);
    const check = checkTrip(trip({ destination: 'IT', transport: 'car', departureDate: departure, returnDate: addDays(departure, 7), dogs: 2 }), today, 'sr');
    const params = check?.plannerParams ?? {};
    expect(readPrefill((name) => params[name] ?? null, today)).toEqual({
      destination: 'IT',
      transport: 'car',
      transit: ['HR', 'SI'],
      departureDate: departure,
      returnDate: addDays(departure, 7),
      dogs: 2,
    });
  });
});

describe('readPrefill', () => {
  it('is null without any of its parameters', () => {
    expect(readPrefill(() => null, today)).toBeNull();
  });

  it('drops values it does not trust', () => {
    const params: Record<string, string> = { destination: 'RS', transport: 'rocket', transit: 'HU,XX,RS', departure: '2020-01-01', dogs: '9' };
    expect(readPrefill((name) => params[name] ?? null, today)).toEqual({
      destination: null,
      transport: null,
      transit: ['HU'],
      departureDate: null,
      returnDate: null,
      dogs: null,
    });
  });
});
