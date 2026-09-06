module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// GET dog-food/offers
//
// Cita ponude iz oba smera -- to je razlog zasto dog_food_offer ima dva
// indeksa (uq_dog_food_offer i ix_dog_food_offer_shop):
//
//   ?dogFoodId=12  -> "koje prodavnice drze ovaj proizvod"  (blok "gde da kupim")
//   ?petShopId=3   -> "koje proizvode drzi ova prodavnica"  (profil prodavnice)
//
// Nijedan od dva upita ne selektuje sliku.
// =============================================================================

let dogFoodId = param('dogFoodId', null);
let petShopId = param('petShopId', null);
let inStockOnly = param('inStockOnly', null);

if ((!dogFoodId || dogFoodId === '') && (!petShopId || petShopId === '')) {
    response.status(400);
    write('message', 'Posalji `dogFoodId` ili `petShopId`.');
    exit();
}

let stockFilter = (inStockOnly === '1' || inStockOnly === 1 || inStockOnly === true)
    ? ' AND o.is_in_stock = 1 '
    : '';

// --- smer 1: proizvod -> prodavnice ------------------------------------------
if (dogFoodId && dogFoodId !== '') {
    let byFoodSql = `
        SELECT
            o.id,
            o.price,
            o.is_in_stock                      AS isInStock,
            COALESCE(o.wolt_url,  s.wolt_url)  AS woltUrl,
            COALESCE(o.glovo_url, s.glovo_url) AS glovoUrl,
            o.updated_at                       AS updatedAt,
            o.wolt_url                         AS offerWoltUrl,
            o.glovo_url                        AS offerGlovoUrl,
            s.id                               AS petShopId,
            s.name                             AS petShopName,
            s.slug                             AS petShopSlug,
            s.address                          AS petShopAddress,
            s.phone                            AS petShopPhone,
            s.latitude,
            s.longitude,
            ops.ops_ime                        AS townshipName,
            grd.grd_ime                        AS cityName
        FROM dog_food_offer o
        INNER JOIN pet_shop s  ON s.id = o.pet_shop_id AND s.is_active = 1
        LEFT  JOIN opstina ops ON ops.ops_id = s.township_id
        LEFT  JOIN grad    grd ON grd.grd_id = ops.grd_id
        WHERE o.dog_food_id = :dogFoodId
        ${stockFilter}
        ORDER BY o.is_in_stock DESC, (o.price IS NULL) ASC, o.price ASC, s.name ASC
    `;

    write('data', db.query(byFoodSql, { dogFoodId: Number(dogFoodId) }));
    exit();
}

// --- smer 2: prodavnica -> proizvodi -----------------------------------------
// Thumbnail, nikad image_base64: ovo je lista.
let byShopSql = `
    SELECT
        o.id,
        o.price,
        o.is_in_stock                      AS isInStock,
        COALESCE(o.wolt_url,  s.wolt_url)  AS woltUrl,
        COALESCE(o.glovo_url, s.glovo_url) AS glovoUrl,
        o.updated_at                       AS updatedAt,
        o.wolt_url                         AS offerWoltUrl,
        o.glovo_url                        AS offerGlovoUrl,
        f.id                               AS dogFoodId,
        f.name                             AS dogFoodName,
        f.slug                             AS dogFoodSlug,
        f.package_weight_g                 AS packageWeightG,
        f.is_grain_free                    AS isGrainFree,
        b.name                             AS brandName,
        ft.code                            AS foodTypeCode,
        ft.name_sr                         AS foodTypeNameSr,
        ft.name_en                         AS foodTypeNameEn,
        img.thumbnail_base64               AS thumbnail
    FROM dog_food_offer o
    INNER JOIN pet_shop  s  ON s.id  = o.pet_shop_id
    INNER JOIN dog_food  f  ON f.id  = o.dog_food_id AND f.is_active = 1
    INNER JOIN brand     b  ON b.id  = f.brand_id
    INNER JOIN food_type ft ON ft.id = f.food_type_id
    LEFT  JOIN dog_food_image img
           ON img.dog_food_id = f.id AND img.is_primary = 1
    WHERE o.pet_shop_id = :petShopId
    ${stockFilter}
    ORDER BY f.name, f.id
`;

write('data', db.query(byShopSql, { petShopId: Number(petShopId) }));
}
}
