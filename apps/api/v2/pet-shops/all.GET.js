module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// GET pet-shops/all
//
// Plitka lista svih prodavnica. Bez logo_base64.
//
// Tri namene:
//   ?fields=sitemap  -> slug + updated_at za tools/generate-sitemap.mjs
//   ?fields=map      -> minimum za markere na mapi (id, ime, koordinate)
//   bez fields       -> pun plitak oblik za admin tabelu i dropdown
// =============================================================================

let fields = param('fields', null);

// --- sitemap -----------------------------------------------------------------
if (fields === 'sitemap') {
    write('data', db.query(`
        SELECT s.slug, s.updated_at AS updatedAt
        FROM pet_shop s
        WHERE s.is_active = 1
        ORDER BY s.updated_at DESC
    `));
    exit();
}

// --- markeri na mapi ---------------------------------------------------------
// Mapa kataloga crta sve prodavnice odjednom, pa red mora da bude sto uzi.
if (fields === 'map') {
    write('data', db.query(`
        SELECT s.id, s.name, s.slug, s.latitude, s.longitude, s.address
        FROM pet_shop s
        WHERE s.is_active = 1
          AND s.latitude IS NOT NULL
          AND s.longitude IS NOT NULL
    `));
    exit();
}

// --- pun plitki oblik --------------------------------------------------------
let sqlQuery = `
    SELECT
        s.id,
        s.name,
        s.slug,
        s.address,
        s.phone,
        s.website_url AS websiteUrl,
        s.latitude,
        s.longitude,
        s.wolt_url    AS woltUrl,
        s.glovo_url   AS glovoUrl,
        s.created_at  AS createdAt,
        s.updated_at  AS updatedAt,
        s.township_id AS townshipId,
        ops.ops_ime   AS townshipName,
        grd.grd_id    AS cityId,
        grd.grd_ime   AS cityName,
        (SELECT COUNT(*) FROM dog_food_offer o
          WHERE o.pet_shop_id = s.id AND o.is_in_stock = 1) AS offerCount
    FROM pet_shop s
    LEFT JOIN opstina ops ON ops.ops_id = s.township_id
    LEFT JOIN grad    grd ON grd.grd_id = ops.grd_id
    WHERE s.is_active = 1
    ORDER BY s.name, s.id
`;

let data = db.query(sqlQuery);

let countRows = db.query(`SELECT COUNT(*) AS total_count FROM pet_shop WHERE is_active = 1`);

write('data',  data);
write('total', countRows[0] ? countRows[0].total_count : 0);
}
}
