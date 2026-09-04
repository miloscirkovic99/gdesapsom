module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// GET dog-food/all
//
// Plitka lista celog kataloga -- sitemap kolektor, admin dropdown, brojaci.
// BEZ slika bilo koje vrste: ni image_base64 ni thumbnail_base64.
//
// Zato sme da vrati sve redove odjednom, za razliku od
// pet-friendly-spots/all.GET.js gde `limit=500` povuce ~40MB base64-a.
//
// `updated_at` je ovde da bi tools/generate-sitemap.mjs mogao da napise pravi
// <lastmod> -- sto spots ne mogu, jer nemaju kolonu sa datumom.
// =============================================================================

let limit  = Number(param('limit', 0));   // 0 = bez ogranicenja
let fields = param('fields', null);       // 'sitemap' = samo slug + updated_at

// --- minimalni oblik za sitemap ---------------------------------------------
if (fields === 'sitemap') {
    let sitemapSql = `
        SELECT f.slug, f.updated_at AS updatedAt
        FROM dog_food f
        WHERE f.is_active = 1
        ORDER BY f.updated_at DESC
    `;
    write('data', db.query(sitemapSql));
    exit();
}

// --- pun plitki oblik --------------------------------------------------------
let sqlQuery = `
    SELECT
        f.id,
        f.name,
        f.slug,
        f.min_price        AS minPrice,
        f.package_weight_g AS packageWeightG,
        f.is_grain_free    AS isGrainFree,
        f.created_at       AS createdAt,
        f.updated_at       AS updatedAt,
        b.name             AS brandName,
        b.slug             AS brandSlug,
        ft.code            AS foodTypeCode,
        ft.name_sr         AS foodTypeNameSr,
        ft.name_en         AS foodTypeNameEn,
        ls.code            AS lifeStageCode,
        bs.code            AS breedSizeCode
    FROM dog_food f
    INNER JOIN brand      b  ON b.id  = f.brand_id
    INNER JOIN food_type  ft ON ft.id = f.food_type_id
    INNER JOIN life_stage ls ON ls.id = f.life_stage_id
    INNER JOIN breed_size bs ON bs.id = f.breed_size_id
    WHERE f.is_active = 1
    ORDER BY f.name, f.id
`;

if (limit && limit > 0) {
    sqlQuery += ` LIMIT ${Number(limit)}`;
}

let data = db.query(sqlQuery);

let countRows = db.query(`SELECT COUNT(*) AS total_count FROM dog_food WHERE is_active = 1`);

write('data',  data);
write('total', countRows[0] ? countRows[0].total_count : 0);
}
}
