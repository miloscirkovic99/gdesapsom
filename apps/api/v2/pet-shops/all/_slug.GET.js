module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// GET pet-shops/all/:slug
//
// Profil prodavnice: podaci + asortiman koji drzi.
//
// Asortiman je odvojen upit iz istog razloga kao galerija kod proizvoda --
// jedan JOIN bi ponovio kolone prodavnice za svaki artikal.
// =============================================================================

let slug = param('slug', null);

if (!slug) {
    response.status(400);
    write('message', 'Parameter slug is required.');
    exit();
}

// --- 1. prodavnica -----------------------------------------------------------
let shopSql = `
    SELECT
        s.id,
        s.name,
        s.slug,
        s.address,
        s.phone,
        s.description,
        s.website_url  AS websiteUrl,
        s.latitude,
        s.longitude,
        s.wolt_url     AS woltUrl,
        s.glovo_url    AS glovoUrl,
        s.logo_base64  AS logo,
        s.created_at   AS createdAt,
        s.updated_at   AS updatedAt,
        s.township_id  AS townshipId,
        ops.ops_ime    AS townshipName,
        grd.grd_id     AS cityId,
        grd.grd_ime    AS cityName
    FROM pet_shop s
    LEFT JOIN opstina ops ON ops.ops_id = s.township_id
    LEFT JOIN grad    grd ON grd.grd_id = ops.grd_id
    WHERE s.slug = ? AND s.is_active = 1
`;

let shopRows = db.query(shopSql, slug);

if (!shopRows || shopRows.length === 0) {
    response.status(404);
    write('message', 'Trazena prodavnica ne postoji u nasoj bazi.');
    exit();
}

let shop = shopRows[0];

// --- 2. asortiman ------------------------------------------------------------
// Thumbnail, nikad image_base64 -- ovo je lista unutar detalja, i dalje lista.
let offersSql = `
    SELECT
        o.id           AS offerId,
        o.price,
        o.is_in_stock  AS isInStock,
        COALESCE(o.wolt_url,  s.wolt_url)  AS woltUrl,
        COALESCE(o.glovo_url, s.glovo_url) AS glovoUrl,
        o.updated_at   AS updatedAt,
        f.id           AS dogFoodId,
        f.name         AS dogFoodName,
        f.slug         AS dogFoodSlug,
        f.package_weight_g AS packageWeightG,
        f.is_grain_free    AS isGrainFree,
        b.name         AS brandName,
        b.slug         AS brandSlug,
        ft.code        AS foodTypeCode,
        ft.name_sr     AS foodTypeNameSr,
        ft.name_en     AS foodTypeNameEn,
        ls.code        AS lifeStageCode,
        ls.name_sr     AS lifeStageNameSr,
        ls.name_en     AS lifeStageNameEn,
        img.thumbnail_base64 AS thumbnail
    FROM dog_food_offer o
    INNER JOIN pet_shop   s  ON s.id  = o.pet_shop_id
    INNER JOIN dog_food   f  ON f.id  = o.dog_food_id AND f.is_active = 1
    INNER JOIN brand      b  ON b.id  = f.brand_id
    INNER JOIN food_type  ft ON ft.id = f.food_type_id
    INNER JOIN life_stage ls ON ls.id = f.life_stage_id
    LEFT  JOIN dog_food_image img
           ON img.dog_food_id = f.id AND img.is_primary = 1
    WHERE o.pet_shop_id = ?
    ORDER BY o.is_in_stock DESC, f.name ASC
`;

let offers = db.query(offersSql, shop.id);

// --- 3. sazetak asortimana ---------------------------------------------------
// Za "27 artikala, 6 brendova, od 890 din" u zaglavlju profila.
let summarySql = `
    SELECT
        COUNT(o.id)                  AS offerCount,
        COUNT(DISTINCT f.brand_id)   AS brandCount,
        MIN(o.price)                 AS lowPrice,
        MAX(o.price)                 AS highPrice
    FROM dog_food_offer o
    INNER JOIN dog_food f ON f.id = o.dog_food_id AND f.is_active = 1
    WHERE o.pet_shop_id = ? AND o.is_in_stock = 1
`;

let summaryRows = db.query(summarySql, shop.id);

// --- 4. prodavnice u blizini -------------------------------------------------
// Ista opstina, bez tekuce. Bez geo racunanja -- opstina je dovoljno precizna
// za "jos u komsiluku" i ne kosta nista.
let nearbySql = `
    SELECT s.id, s.name, s.slug, s.address
    FROM pet_shop s
    WHERE s.is_active = 1 AND s.township_id = :townshipId AND s.id <> :id
    ORDER BY s.name
    LIMIT 6
`;

let nearby = db.query(nearbySql, { townshipId: shop.townshipId, id: shop.id });

shop.offers  = offers;
shop.summary = summaryRows[0] || { offerCount: 0, brandCount: 0, lowPrice: null, highPrice: null };
shop.nearby  = nearby;

write('data', shop);
}
}
