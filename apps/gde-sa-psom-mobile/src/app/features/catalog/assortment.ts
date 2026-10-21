import { LookupRef, normalizeSearchText, PetShopOffer } from '@gde/shared/data-access';

export interface AssortmentGroup {
  type: LookupRef;
  offers: PetShopOffer[];
}

/**
 * A shop's assortment grouped by food type, in the order the API lists it (as on
 * the website), narrowed to products whose brand or name contains `query`.
 * Diacritics don't matter: "cokolada" finds "čokolada".
 */
export function groupAssortment(offers: PetShopOffer[], query: string): AssortmentGroup[] {
  const q = normalizeSearchText(query.trim());
  const groups = new Map<string, AssortmentGroup>();
  for (const offer of offers) {
    if (q && !normalizeSearchText(`${offer.food.brandName} ${offer.food.name}`).includes(q)) continue;
    const code = offer.food.foodType.code;
    const group = groups.get(code) ?? { type: offer.food.foodType, offers: [] };
    group.offers.push(offer);
    groups.set(code, group);
  }
  return [...groups.values()];
}
