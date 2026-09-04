module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// GET dog-food/lookups
//
// Jedan poziv umesto cetiri. Danas landing-page povlaci township, cities,
// spotTypes i gardenTypes zasebno; katalog to ne ponavlja.
//
// Vraca `code` uz svaki lookup -- to je stabilan kljuc za filtere i URL query
// parametre (?type=dry). name_sr / name_en dolaze iz baze, pa nova vrednost
// radi u UI-ju bez frontend deploya.
// =============================================================================

let brandsSql = `
    SELECT b.id, b.name, b.slug, b.logo_url, b.website_url
    FROM brand b
    WHERE b.is_active = 1
      AND EXISTS (
          SELECT 1 FROM dog_food f
          WHERE f.brand_id = b.id AND f.is_active = 1
      )
    ORDER BY b.name
`;

let foodTypesSql = `
    SELECT id, code, name_sr, name_en
    FROM food_type
    ORDER BY sort_order, name_sr
`;

let lifeStagesSql = `
    SELECT id, code, name_sr, name_en
    FROM life_stage
    ORDER BY sort_order, name_sr
`;

let breedSizesSql = `
    SELECT id, code, name_sr, name_en
    FROM breed_size
    ORDER BY sort_order, name_sr
`;

// opseg cene za slider -- granice dolaze iz podataka, ne hardkodovane
let priceRangeSql = `
    SELECT MIN(min_price) AS min_price, MAX(min_price) AS max_price
    FROM dog_food
    WHERE is_active = 1 AND min_price IS NOT NULL
`;

let priceRange = db.query(priceRangeSql);

write('brands',     db.query(brandsSql));
write('foodTypes',  db.query(foodTypesSql));
write('lifeStages', db.query(lifeStagesSql));
write('breedSizes', db.query(breedSizesSql));
write('priceRange', {
    minPrice: priceRange[0] ? priceRange[0].min_price : null,
    maxPrice: priceRange[0] ? priceRange[0].max_price : null
});
}
}
