import { PetShopOffer } from '@gde/shared/data-access';
import { groupAssortment } from './assortment';

const offer = (offerId: number, type: string, name: string, brandName = 'Pseća Kašika') =>
  ({
    offerId,
    food: { name, brandName, foodType: { code: type, nameSr: type, nameEn: type } },
  }) as PetShopOffer;

const offers = [
  offer(1, 'supplement', 'Buster juneća srca'),
  offer(2, 'cooked', 'Junetina premium'),
  offer(3, 'cooked', 'Karabatak premium'),
  offer(4, 'supplement', 'Kolagenski bujon'),
];

describe('groupAssortment', () => {
  it('groups by food type in the order the types first appear', () => {
    const groups = groupAssortment(offers, '');
    expect(groups.map((g) => [g.type.code, g.offers.map((o) => o.offerId)])).toEqual([
      ['supplement', [1, 4]],
      ['cooked', [2, 3]],
    ]);
  });

  it('matches brand or name, ignoring case and diacritics, and drops empty groups', () => {
    expect(groupAssortment(offers, 'JUNECA').map((g) => g.offers.map((o) => o.offerId))).toEqual([[1]]);
    expect(groupAssortment(offers, 'pseca kasika karabatak').map((g) => g.type.code)).toEqual(['cooked']);
    expect(groupAssortment(offers, 'royal')).toEqual([]);
  });
});
