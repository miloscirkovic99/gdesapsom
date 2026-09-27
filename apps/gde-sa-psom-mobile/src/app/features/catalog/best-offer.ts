import { DogFoodOffer } from '@gde/shared/data-access';

/**
 * The cheapest in-stock offer, or null. Only worth a badge when at least two
 * in-stock offers have a price to compare.
 */
export function bestOfferId(offers: DogFoodOffer[]): number | null {
  const priced = offers.filter((o) => o.isInStock && o.price !== null);
  if (priced.length < 2) return null;
  let best = priced[0];
  for (const offer of priced) {
    if ((offer.price as number) < (best.price as number)) best = offer;
  }
  return best.id;
}
