import { DogFoodOffer } from '@gde/shared/data-access';
import { bestOfferId } from './best-offer';

const offer = (id: number, price: number | null, isInStock = true) => ({ id, price, isInStock }) as DogFoodOffer;

describe('bestOfferId', () => {
  it('picks the cheapest in-stock offer', () => {
    expect(bestOfferId([offer(1, 900), offer(2, 750), offer(3, 820)])).toBe(2);
  });

  it('ignores out-of-stock and unpriced offers', () => {
    expect(bestOfferId([offer(1, 500, false), offer(2, 800), offer(3, null), offer(4, 790)])).toBe(4);
  });

  it('gives no badge without at least two comparable offers', () => {
    expect(bestOfferId([offer(1, 700)])).toBeNull();
    expect(bestOfferId([offer(1, 700), offer(2, 600, false)])).toBeNull();
    expect(bestOfferId([])).toBeNull();
  });
});
