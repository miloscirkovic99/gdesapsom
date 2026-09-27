module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// GET dog-food/random
//
// Nasumicni proizvodi za landing-page sekciju -- pandan
// pet-friendly-spots/random.GET.js.
//
// ORDER BY RAND() sortira ceo rezultujuci set, pa se skalira lose. Ovde je
// prihvatljivo jer se primenjuje tek nad id-jevima (bez ijednog blob-a), a
// thumbnaili se dovlace drugim upitom samo za 6 pobednika. Postojeci
// random.GET.js za spots radi RAND() nad redovima koji vec nose dva base64
// polja i time sortira desetine MB.
// =============================================================================

let limit = Number(param('limit', 6));
if (!limit || limit < 1) { limit = 6; }
if (limit > 24)          { limit = 24; }

// --- 1. izvuci samo id-jeve --------------------------------------------------
// Uslov `EXISTS` trazi da proizvod ima bar jednu sliku -- kartica bez slike na
// pocetnoj izgleda kao greska.
let idsSql = `
    SELECT f.id
    FROM dog_food f
    WHERE f.is_active = 1
      AND EXISTS (
          SELECT 1 FROM dog_food_image i
          WHERE i.dog_food_id = f.id AND i.thumbnail_base64 IS NOT NULL
      )
    ORDER BY RAND()
    LIMIT ${Number(limit)}
`;

let idRows = db.query(idsSql);

if (!idRows || idRows.length === 0) {
    write('data', []);
    exit();
}

// --- 2. podaci za bas te id-jeve --------------------------------------------
let placeholders = [];
let params = {};
for (let i = 0; i < idRows.length; i++) {
    placeholders.push(':id' + i);
    params['id' + i] = idRows[i].id;
}

let dataSql = `
    SELECT
        f.id,
        f.name,
        f.slug,
        f.min_price        AS minPrice,
        f.package_weight_g AS packageWeightG,
        f.is_grain_free    AS isGrainFree,
        b.name             AS brandName,
        b.slug             AS brandSlug,
        ft.code            AS foodTypeCode,
        ft.name_sr         AS foodTypeNameSr,
        ft.name_en         AS foodTypeNameEn,
        img.thumbnail_base64 AS thumbnail
    FROM dog_food f
    INNER JOIN brand     b  ON b.id  = f.brand_id
    INNER JOIN food_type ft ON ft.id = f.food_type_id
    LEFT  JOIN dog_food_image img
           ON img.dog_food_id = f.id AND img.is_primary = 1
    WHERE f.id IN (${placeholders.join(',')})
`;

write('data', db.query(dataSql, params));
}
}
