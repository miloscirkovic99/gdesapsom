module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// GET dog-food/all/:slug
//
// Profil proizvoda. Slug, ne id -- bolji SEO, i blog vec dokazuje obrazac
// (apps/api/v2/blog/getAll/_slug.GET.js).
//
// Ovo je JEDINO mesto koje sme da selektuje image_base64. Tri odvojena upita
// umesto jednog JOIN-a sa GROUP_CONCAT: proizvod x slike x ponude je kartezijanski
// proizvod, pa bi se svaka slika (LONGTEXT!) ponovila za svaku ponudu.
// =============================================================================

let slug = param('slug', null);

if (!slug) {
    response.status(400);
    write('message', 'Parameter slug is required.');
    exit();
}

// --- 1. proizvod -------------------------------------------------------------
let productSql = `
    SELECT
        f.id,
        f.name,
        f.slug,
        f.description,
        f.ingredients,
        f.package_weight_g AS packageWeightG,
        f.is_grain_free    AS isGrainFree,
        f.min_price        AS minPrice,
        f.created_at       AS createdAt,
        f.updated_at       AS updatedAt,
        b.id               AS brandId,
        b.name             AS brandName,
        b.slug             AS brandSlug,
        b.logo_url         AS brandLogoUrl,
        b.website_url      AS brandWebsiteUrl,
        ft.id              AS foodTypeId,
        ft.code            AS foodTypeCode,
        ft.name_sr         AS foodTypeNameSr,
        ft.name_en         AS foodTypeNameEn,
        ls.id              AS lifeStageId,
        ls.code            AS lifeStageCode,
        ls.name_sr         AS lifeStageNameSr,
        ls.name_en         AS lifeStageNameEn,
        bs.id              AS breedSizeId,
        bs.code            AS breedSizeCode,
        bs.name_sr         AS breedSizeNameSr,
        bs.name_en         AS breedSizeNameEn
    FROM dog_food f
    INNER JOIN brand      b  ON b.id  = f.brand_id
    INNER JOIN food_type  ft ON ft.id = f.food_type_id
    INNER JOIN life_stage ls ON ls.id = f.life_stage_id
    INNER JOIN breed_size bs ON bs.id = f.breed_size_id
    WHERE f.slug = ? AND f.is_active = 1
`;

let productRows = db.query(productSql, slug);

if (!productRows || productRows.length === 0) {
    response.status(404);
    write('message', 'Trazeni proizvod ne postoji u nasoj bazi.');
    exit();
}

// Red iz baze je Mars `IRow` i ne prima nove kolone (`product.images = ...`
// pada sa "Column 'images' not exists"), pa se prepisuje u obican objekat.
// Lista kljuceva mora da prati SELECT iznad.
let productRow = productRows[0];
let product = {};
for (let key of [
    'id', 'name', 'slug', 'description', 'ingredients', 'packageWeightG',
    'isGrainFree', 'minPrice', 'createdAt', 'updatedAt',
    'brandId', 'brandName', 'brandSlug', 'brandLogoUrl', 'brandWebsiteUrl',
    'foodTypeId', 'foodTypeCode', 'foodTypeNameSr', 'foodTypeNameEn',
    'lifeStageId', 'lifeStageCode', 'lifeStageNameSr', 'lifeStageNameEn',
    'breedSizeId', 'breedSizeCode', 'breedSizeNameSr', 'breedSizeNameEn'
]) {
    product[key] = productRow[key];
}

// --- 2. galerija -------------------------------------------------------------
let imagesSql = `
    SELECT
        i.id,
        i.sort_order       AS sortOrder,
        i.is_primary       AS isPrimary,
        i.alt_text         AS altText,
        i.image_base64     AS image,
        i.thumbnail_base64 AS thumbnail
    FROM dog_food_image i
    WHERE i.dog_food_id = ?
    ORDER BY i.is_primary DESC, i.sort_order ASC, i.id ASC
`;

let images = db.query(imagesSql, product.id);

// --- 3. "gde da kupim" -------------------------------------------------------
// Ponude sa cenom i prodavnicom. Sort: na stanju prvo, pa najjeftinije.
// NULL cena ide na kraj svoje grupe.
//
// Prodavnicin wolt_url/glovo_url je fallback kad ponuda nema deep link do bas
// tog proizvoda -- COALESCE to resava u SQL-u, da frontend ne mora da grana.
let offersSql = `
    SELECT
        o.id,
        o.price,
        o.is_in_stock                       AS isInStock,
        COALESCE(o.wolt_url,  s.wolt_url)   AS woltUrl,
        COALESCE(o.glovo_url, s.glovo_url)  AS glovoUrl,
        o.updated_at                        AS updatedAt,
        s.id                                AS petShopId,
        s.name                              AS petShopName,
        s.slug                              AS petShopSlug,
        s.address                           AS petShopAddress,
        s.phone                             AS petShopPhone,
        s.latitude,
        s.longitude,
        ops.ops_id                          AS townshipId,
        ops.ops_ime                         AS townshipName,
        grd.grd_ime                         AS cityName
    FROM dog_food_offer o
    INNER JOIN pet_shop s   ON s.id = o.pet_shop_id AND s.is_active = 1
    LEFT  JOIN opstina ops  ON ops.ops_id = s.township_id
    LEFT  JOIN grad    grd  ON grd.grd_id = ops.grd_id
    WHERE o.dog_food_id = ?
    ORDER BY o.is_in_stock DESC, (o.price IS NULL) ASC, o.price ASC, s.name ASC
`;

let offers = db.query(offersSql, product.id);

// --- 4. agregat za JSON-LD Product / AggregateOffer --------------------------
// lowPrice / highPrice / offerCount racuna baza; frontend ih samo prepise u
// <script type="application/ld+json">.
let aggregateSql = `
    SELECT
        MIN(o.price)  AS lowPrice,
        MAX(o.price)  AS highPrice,
        COUNT(o.id)   AS offerCount
    FROM dog_food_offer o
    INNER JOIN pet_shop s ON s.id = o.pet_shop_id AND s.is_active = 1
    WHERE o.dog_food_id = ? AND o.is_in_stock = 1 AND o.price IS NOT NULL
`;

let aggregateRows = db.query(aggregateSql, product.id);
let aggregateRow  = aggregateRows[0];
let aggregate = {
    lowPrice:   aggregateRow ? aggregateRow.lowPrice   : null,
    highPrice:  aggregateRow ? aggregateRow.highPrice  : null,
    offerCount: aggregateRow ? aggregateRow.offerCount : 0
};

// --- 5. slicni proizvodi -----------------------------------------------------
// Isti tip + uzrast, bez tekuceg. Thumbnail, nikad puna slika.
let relatedSql = `
    SELECT
        f.id, f.name, f.slug, f.min_price AS minPrice,
        b.name AS brandName,
        img.thumbnail_base64 AS thumbnail
    FROM dog_food f
    INNER JOIN brand b ON b.id = f.brand_id
    LEFT JOIN dog_food_image img
           ON img.dog_food_id = f.id AND img.is_primary = 1
    WHERE f.is_active = 1
      AND f.id <> :id
      AND f.food_type_id  = :foodTypeId
      AND f.life_stage_id = :lifeStageId
    ORDER BY f.name
    LIMIT 6
`;

let related = db.query(relatedSql, {
    id: product.id,
    foodTypeId: product.foodTypeId,
    lifeStageId: product.lifeStageId
});

// Kolekcije idu kao zasebni kljucevi pored `data` (isti obrazac kao
// `{ data, total, cursor }` kod liste); frontend ih sklapa u jedan objekat.
write('data',      product);
write('images',    images);
write('offers',    offers);
write('aggregate', aggregate);
write('related',   related);
}
}
