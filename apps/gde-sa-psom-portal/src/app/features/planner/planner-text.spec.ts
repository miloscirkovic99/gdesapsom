import { limitMessage } from './planner-copy';
import { addDays, fillDogName, formatLimitDate, remainingLine, walkingRouteUrl } from './planner-text';

describe('fillDogName', () => {
  it('puts the name where the plan says {{ime}}', () => {
    expect(fillDogName('Ponesi vodu, {{ime}} će uživati.', 'Žućko')).toBe('Ponesi vodu, Žućko će uživati.');
  });

  it('says "tvoj pas" without a name, capitalised at the start of a sentence', () => {
    expect(fillDogName('{{ime}} voli sneg. Posle šetnje {{ime}} odmara.', '  ')).toBe('Tvoj pas voli sneg. Posle šetnje tvoj pas odmara.');
    expect(fillDogName('Neka {{ ime }} pije vode.', null)).toBe('Neka tvoj pas pije vode.');
  });

  it('keeps a name with markup as plain text (the template interpolates it)', () => {
    expect(fillDogName('Šetnja za {{ime}}.', '<img src=x onerror=alert(1)>')).toBe('Šetnja za <img src=x onerror=alert(1)>.');
  });
});

describe('walkingRouteUrl', () => {
  it('goes from the first stop to the last through the others, on foot', () => {
    const url = walkingRouteUrl([
      { lat: 44.8231, lng: 20.4511 },
      { lat: null, lng: null },
      { lat: 44.818, lng: 20.456 },
      { lat: 44.817, lng: 20.458 },
    ]);
    const parsed = new URL(url as string);
    expect(`${parsed.origin}${parsed.pathname}`).toBe('https://www.google.com/maps/dir/');
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      api: '1',
      origin: '44.8231,20.4511',
      destination: '44.817,20.458',
      travelmode: 'walking',
      waypoints: '44.818,20.456',
    });
  });

  it('needs two located stops', () => {
    expect(walkingRouteUrl([{ lat: 44.8, lng: 20.4 }, { lat: null, lng: null }])).toBeNull();
  });
});

describe('quota and limit texts', () => {
  it('counts the plans left in Serbian', () => {
    expect([3, 2, 1, 0].map(remainingLine)).toEqual([
      'Ostala su ti 3 plana ove nedelje',
      'Ostala su ti 2 plana ove nedelje',
      'Ostao ti je 1 plan ove nedelje',
      null,
    ]);
  });

  it('dates the next allowed plan in Belgrade time', () => {
    expect(formatLimitDate('2026-11-27T23:30:00Z')).toBe('28. 11. 2026.');
    expect(formatLimitDate('nonsense')).toBeNull();
  });

  it('tells the device limit and the network limit apart', () => {
    expect(limitMessage('device', '2026-11-28T10:00:00Z')).toBe(
      'Ove nedelje su sa ovog uređaja iskorišćena sva 3 plana. Sledeći plan možeš da napraviš 28. 11. 2026.',
    );
    expect(limitMessage('network', '2026-11-28T10:00:00Z')).toBe(
      'Sa ove mreže je ove nedelje napravljeno mnogo planova, pokušaj ponovo 28. 11. 2026.',
    );
  });

  it('adds days across month ends', () => {
    expect(addDays('2026-11-28', 9)).toBe('2026-12-07');
  });
});
