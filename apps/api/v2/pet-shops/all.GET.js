module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// GET pet-shops/all
//
// Plitka lista svih prodavnica. Bez logo_base64 u listi.
//
// Cetiri namene:
//   ?fields=sitemap        -> slug + updated_at za tools/generate-sitemap.mjs
//   ?fields=map            -> minimum za markere na mapi (id, ime, koordinate)
//   ?fields=admin          -> SVE prodavnice (i ugasene) za admin tabelu;
//                             samo prijavljena sesija
//   ?fields=admin&id=3     -> jedna prodavnica, plus opis i logo (za formu)
//   bez fields             -> javni plitak oblik, samo aktivne
// =============================================================================

let fields = param('fields', null);
let id     = param('id', null);           // samo uz fields=admin

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

// --- admin oblik -------------------------------------------------------------
// Ukljucuje i neaktivne (meko obrisane) prodavnice, da admin moze da ih vrati.
// offerCount ovde broji SVE ponude, ne samo "na stanju" -- admin treba da zna
// da prodavnica nosi podatke i kad je trenutno sve rasprodato.
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
        'id', 'name', 'slug', 'address', 'phone', 'websiteUrl',
        'latitude', 'longitude', 'woltUrl', 'glovoUrl',
        'isActive', 'hasLogo', 'createdAt', 'updatedAt',
        'townshipId', 'townshipName', 'cityId', 'cityName', 'offerCount'
    ];

    let adminSelect = `
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
            s.is_active   AS isActive,
            (s.logo_base64 IS NOT NULL) AS hasLogo,
            s.created_at  AS createdAt,
            s.updated_at  AS updatedAt,
            s.township_id AS townshipId,
            ops.ops_ime   AS townshipName,
            grd.grd_id    AS cityId,
            grd.grd_ime   AS cityName,
            (SELECT COUNT(*) FROM dog_food_offer o WHERE o.pet_shop_id = s.id) AS offerCount
    `;

    let adminFrom = `
        FROM pet_shop s
        LEFT JOIN opstina ops ON ops.ops_id = s.township_id
        LEFT JOIN grad    grd ON grd.grd_id = ops.grd_id
    `;

    // --- jedna prodavnica, za formu izmene ---------------------------------
    // Jedino mesto u listi koje sme da vrati logo_base64.
    if (id !== null && id !== '') {
        let itemRows = db.query(
            adminSelect + `, s.description, s.logo_base64 AS logo ` + adminFrom + ` WHERE s.id = ?`,
            id
        );

        if (!itemRows || itemRows.length === 0) {
            response.status(404);
            write('message', `Prodavnica sa id ${id} ne postoji.`);
            exit();
        }

        let itemRow  = itemRows[0];
        let itemKeys = adminKeys.concat(['description', 'logo']);
        let shop     = {};
        for (let i = 0; i < itemKeys.length; i++) {
            shop[itemKeys[i]] = itemRow[itemKeys[i]];
        }

        write('data', shop);
        exit();
    }

    // --- cela lista, ugasene na dnu ------------------------------------------
    let adminCount = db.query(`SELECT COUNT(*) AS total_count FROM pet_shop`);

    write('data',  db.query(adminSelect + adminFrom + ` ORDER BY s.is_active DESC, s.name, s.id`));
    write('total', adminCount[0] ? adminCount[0].total_count : 0);
    exit();
}

// --- pun plitki oblik (javni) ------------------------------------------------
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
