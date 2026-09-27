import { DogFoodFilters, PetShopFilters } from '@gde/shared/data-access';

/** Active dog-food filters for `filter_applied`. The sort order is not a filter. */
export function foodFilterKeys(f: DogFoodFilters): string[] {
  return [
    ...(f.foodType ? ['food_type'] : []),
    ...(f.lifeStage ? ['life_stage'] : []),
    ...(f.breedSize ? ['breed_size'] : []),
    ...(f.brands.length ? ['brand'] : []),
    ...(f.grainFree !== null ? ['grain_free'] : []),
    ...(f.minPrice !== null || f.maxPrice !== null ? ['price'] : []),
  ];
}

/** Active pet-shop filters for `filter_applied`, named like the venue filters where they match. */
export function shopFilterKeys(f: PetShopFilters): string[] {
  return [
    ...(f.townshipIds.length ? ['ops_id'] : []),
    ...(f.hasDelivery ? ['delivery'] : []),
    ...(f.near ? ['location'] : []),
  ];
}
