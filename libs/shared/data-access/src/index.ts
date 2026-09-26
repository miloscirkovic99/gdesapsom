// Bootstrap wiring (also importable on its own from `@gde/shared/data-access/core`,
// which eager code must use; see core.ts).
export * from './core';

// Stores (root-provided; injecting one fires its onInit requests).
export * from './lib/stores/spots.store';
export * from './lib/stores/parks.store';
export * from './lib/stores/vetclinics.store';
export * from './lib/stores/shared.store';
export * from './lib/stores/dog-food.store';
export * from './lib/stores/pet-shops.store';
export * from './lib/stores/catalog-admin.store';

// Catalog data access and models.
export * from './lib/catalog/catalog.models';
export * from './lib/catalog/catalog-admin.models';
export * from './lib/catalog/dog-food.api';
export * from './lib/catalog/pet-shops.api';
export * from './lib/catalog/catalog-admin.api';

// Blog.
export * from './lib/blog/blog.service';
export * from './lib/blog/post';
