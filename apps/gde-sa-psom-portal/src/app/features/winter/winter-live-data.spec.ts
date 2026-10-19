import { EMPTY_DESTINATION, WinterSnapshot } from './winter-data';
import { mergeLive } from './winter-live-data';

const stay = (id: number, affiliateUrl: string | null = null) => ({
  id,
  name: `Smeštaj ${id}`,
  address: null,
  dogFee: null,
  maxDogs: null,
  dogMayStayAlone: null,
  maxDogSize: null,
  affiliateUrl,
});

const snapshot = (stays: number): WinterSnapshot => ({
  generatedAt: '2026-11-01',
  destinations: { kopaonik: { ...EMPTY_DESTINATION, stays: Array.from({ length: stays }, (_, i) => stay(i + 1)) }, tara: EMPTY_DESTINATION },
});

describe('mergeLive', () => {
  it('takes the live destinations and their date', () => {
    const merged = mergeLive(snapshot(2), snapshot(1));
    expect(merged?.destinations['kopaonik'].stays.map((s) => s.id)).toEqual([1]);
    expect(merged?.generatedAt).toBe('2026-11-01');
  });

  it('keeps a destination that would lose more than half of 4 or more stays', () => {
    const merged = mergeLive(snapshot(4), { ...snapshot(1), destinations: { ...snapshot(1).destinations, tara: { ...EMPTY_DESTINATION, stays: [stay(9)] } } });
    expect(merged?.destinations['kopaonik'].stays).toHaveLength(4);
    expect(merged?.destinations['tara'].stays).toHaveLength(1);
  });

  it('drops affiliate links that are not https', () => {
    const live = snapshot(0);
    live.destinations['kopaonik'].stays = [stay(1, 'javascript:alert(1)'), stay(2, 'https://partner.example/2')];
    expect(mergeLive(snapshot(0), live)?.destinations['kopaonik'].stays.map((s) => s.affiliateUrl)).toEqual([null, 'https://partner.example/2']);
  });

  it('ignores an answer of the wrong shape', () => {
    expect(mergeLive(snapshot(1), '<!doctype html>')).toBeNull();
    expect(mergeLive(snapshot(1), { destinations: { kopaonik: { stays: 'x' } } })).toBeNull();
    expect(mergeLive(snapshot(1), null)).toBeNull();
  });
});
