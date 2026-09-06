module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// GET dog-food/all
//
// Plitka lista celog kataloga -- sitemap kolektor, admin tabela, brojaci.
// BEZ slika bilo koje vrste: ni image_base64 ni thumbnail_base64.
//
// Zato sme da vrati sve redove odjednom, za razliku od
// pet-friendly-spots/all.GET.js gde `limit=500` povuce ~40MB base64-a.
//
// `updated_at` je ovde da bi tools/generate-sitemap.mjs mogao da napise pravi
// <lastmod> -- sto spots ne mogu, jer nemaju kolonu sa datumom.
//
// Cetiri oblika:
//   ?fields=sitemap        -> slug + updated_at, samo aktivni
//   ?fields=admin          -> SVI proizvodi (i ugaseni), sa id-jevima lookup-a
//                             i brojacima ponuda/slika; samo prijavljena sesija
//   ?fields=admin&id=12    -> jedan proizvod, plus opis i sastav (TEXT kolone
//                             koje lista namerno preskace)
//   bez fields             -> javni plitki oblik, samo aktivni
// =============================================================================

let limit  = Number(param('limit', 0));   // 0 = bez ogranicenja
let fields = param('fields', null);
let id     = param('id', null);           // samo uz fields=admin

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

// --- admin oblik -------------------------------------------------------------
// Ukljucuje i neaktivne (meko obrisane) proizvode -- admin mora da ih vidi da
// bi ih vratio. Galeriju cita dog-food/images (GET ?dogFoodId=), ponude
// dog-food/offers.
if (fields === 'admin') {
    let sessionUser = session('user');
    if (!sessionUser) {
        response.status(401);
        write('message', 'Not Authorized');
        exit();
    }

    // Ista lista kljuceva sluzi SELECT-u i prepisu reda u obican objekat
    // (Mars IRow ne prima nove kolone, vidi README "Envelope").
    let adminKeys = [
        'id', 'name', 'slug', 'isActive', 'minPrice', 'packageWeightG', 'isGrainFree',
        'createdAt', 'updatedAt',
        'brandId', 'brandName', 'brandSlug',
        'foodTypeId', 'foodTypeCode', 'foodTypeNameSr', 'foodTypeNameEn',
        'lifeStageId', 'lifeStageCode', 'lifeStageNameSr', 'lifeStageNameEn',
        'breedSizeId', 'breedSizeCode', 'breedSizeNameSr', 'breedSizeNameEn',
        'offerCount', 'imageCount'
    ];

    let adminSelect = `
        SELECT
            f.id,
            f.name,
            f.slug,
            f.is_active        AS isActive,
            f.min_price        AS minPrice,
            f.package_weight_g AS packageWeightG,
            f.is_grain_free    AS isGrainFree,
            f.created_at       AS createdAt,
            f.updated_at       AS updatedAt,
            f.brand_id         AS brandId,
            b.name             AS brandName,
            b.slug             AS brandSlug,
            f.food_type_id     AS foodTypeId,
            ft.code            AS foodTypeCode,
            ft.name_sr         AS foodTypeNameSr,
            ft.name_en         AS foodTypeNameEn,
            f.life_stage_id    AS lifeStageId,
            ls.code            AS lifeStageCode,
            ls.name_sr         AS lifeStageNameSr,
            ls.name_en         AS lifeStageNameEn,
            f.breed_size_id    AS breedSizeId,
            bs.code            AS breedSizeCode,
            bs.name_sr         AS breedSizeNameSr,
            bs.name_en         AS breedSizeNameEn,
            (SELECT COUNT(*) FROM dog_food_offer o WHERE o.dog_food_id = f.id) AS offerCount,
            (SELECT COUNT(*) FROM dog_food_image i WHERE i.dog_food_id = f.id) AS imageCount
    `;

    let adminFrom = `
        FROM dog_food f
        INNER JOIN brand      b  ON b.id  = f.brand_id
        INNER JOIN food_type  ft ON ft.id = f.food_type_id
        INNER JOIN life_stage ls ON ls.id = f.life_stage_id
        INNER JOIN breed_size bs ON bs.id = f.breed_size_id
    `;

    // --- jedan proizvod, za formu izmene -----------------------------------
    if (id !== null && id !== '') {
        let itemRows = db.query(
            adminSelect + `, f.description, f.ingredients ` + adminFrom + ` WHERE f.id = ?`,
            id
        );

        if (!itemRows || itemRows.length === 0) {
            response.status(404);
            write('message', `Proizvod sa id ${id} ne postoji.`);
            exit();
        }

        let itemRow  = itemRows[0];
        let itemKeys = adminKeys.concat(['description', 'ingredients']);
        let product  = {};
        for (let i = 0; i < itemKeys.length; i++) {
            product[itemKeys[i]] = itemRow[itemKeys[i]];
        }

        write('data', product);
        exit();
    }

    // --- cela lista, ugaseni na dnu ------------------------------------------
    let adminSql = adminSelect + adminFrom + ` ORDER BY f.is_active DESC, f.name, f.id`;
    if (limit && limit > 0) {
        adminSql += ` LIMIT ${Number(limit)}`;
    }

    let adminCount = db.query(`SELECT COUNT(*) AS total_count FROM dog_food`);

    write('data',  db.query(adminSql));
    write('total', adminCount[0] ? adminCount[0].total_count : 0);
    exit();
}

// --- pun plitki oblik (javni) ------------------------------------------------
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
