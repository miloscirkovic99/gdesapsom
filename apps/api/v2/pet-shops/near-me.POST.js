module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// POST pet-shops/near-me
//
// "Prodavnice u mojoj blizini", sa opcionim filterom na konkretan proizvod
// ("ko blizu mene drzi ovu hranu").
//
// Isti izracun kao geo grana u search-query.POST.js, ali kao zaseban endpoint
// jer ga zovu druga mesta (dugme na detalj strani proizvoda, a ne filter forma).
//
// Optimizacija u odnosu na pet-friendly-spots/near-me.POST.js:
//
//   1. Bounding box PRE Haversine formule. Postojeci handler racuna
//      ACOS/COS/RADIANS za SVAKI red u tabeli, jer MySQL ne moze da veze izraz
//      za indeks. Box predfilter je obican range uslov nad kolonama, pa radi
//      po ix_pet_shop_geo i skupa formula se racuna samo nad kandidatima.
//   2. Eksplicitne kolone umesto `SELECT *`.
//   3. LEAST(1, ...) u ACOS -- bez toga najbliza prodavnica ume da ispadne iz
//      rezultata zbog zaokruzivanja (argument 1.0000000002 -> ACOS vrati NULL).
// =============================================================================

let lat       = param('lat', null);
let lon       = param('lon', null);
let radius    = Number(param('radius', 5000));
let dogFoodId = param('dogFoodId', null);
let limit     = Number(param('limit', 20));

function isNumeric(v) {
    return v !== null && v !== '' && !isNaN(Number(v));
}

if (!isNumeric(lat) || !isNumeric(lon)) {
    response.status(400);
    write('message', 'Parametri `lat` i `lon` su obavezni.');
    exit();
}

if (!radius || radius < 1)   { radius = 5000; }
if (radius > 100000)         { radius = 100000; }   // 100km plafon
if (!limit || limit < 1)     { limit = 20; }
if (limit > 100)             { limit = 100; }

let latNum = Number(lat);
let lonNum = Number(lon);

// --- bounding box ------------------------------------------------------------
// 1 stepen sirine ~ 111320 m. Duzinski stepen se skracuje sa COS(lat) -- na
// 44N (Srbija) je ~80km umesto 111km, pa bez korekcije kvadrat bude ~39% siri
// nego sto treba.
let latDelta = radius / 111320;
let lonDelta = radius / (111320 * Math.cos(latNum * Math.PI / 180));

let params = {
    lat:    latNum,
    lon:    lonNum,
    radius: radius,
    minLat: latNum - latDelta,
    maxLat: latNum + latDelta,
    minLon: lonNum - lonDelta,
    maxLon: lonNum + lonDelta
};

let haversine = `
    (6371000 * ACOS(LEAST(1,
          COS(RADIANS(:lat)) * COS(RADIANS(s.latitude))
        * COS(RADIANS(s.longitude) - RADIANS(:lon))
        + SIN(RADIANS(:lat)) * SIN(RADIANS(s.latitude))
    )))
`;

// --- filter na konkretan proizvod --------------------------------------------
let offerFilter = '';
let offerSelect = '';

if (isNumeric(dogFoodId)) {
    params.dogFoodId = Number(dogFoodId);

    offerFilter = `
        AND EXISTS (
            SELECT 1 FROM dog_food_offer o
            WHERE o.pet_shop_id = s.id
              AND o.dog_food_id = :dogFoodId
              AND o.is_in_stock = 1
        )
    `;

    // Cena bas tog proizvoda u bas toj prodavnici -- da kartica rezultata moze
    // da pokaze "1.290 din, 800m od tebe" bez drugog poziva.
    offerSelect = `
        , (SELECT o.price FROM dog_food_offer o
            WHERE o.pet_shop_id = s.id AND o.dog_food_id = :dogFoodId
            LIMIT 1) AS offerPrice
        , (SELECT COALESCE(o.wolt_url, s.wolt_url) FROM dog_food_offer o
            WHERE o.pet_shop_id = s.id AND o.dog_food_id = :dogFoodId
            LIMIT 1) AS offerWoltUrl
        , (SELECT COALESCE(o.glovo_url, s.glovo_url) FROM dog_food_offer o
            WHERE o.pet_shop_id = s.id AND o.dog_food_id = :dogFoodId
            LIMIT 1) AS offerGlovoUrl
    `;
}

let sqlQuery = `
    SELECT
        s.id,
        s.name,
        s.slug,
        s.address,
        s.phone,
        s.latitude,
        s.longitude,
        s.website_url AS websiteUrl,
        s.wolt_url    AS woltUrl,
        s.glovo_url   AS glovoUrl,
        ops.ops_ime   AS townshipName,
        grd.grd_ime   AS cityName,
        ${haversine}  AS distanceM
        ${offerSelect}
    FROM pet_shop s
    LEFT JOIN opstina ops ON ops.ops_id = s.township_id
    LEFT JOIN grad    grd ON grd.grd_id = ops.grd_id
    WHERE s.is_active = 1
      AND s.latitude  IS NOT NULL
      AND s.longitude IS NOT NULL
      AND s.latitude  BETWEEN :minLat AND :maxLat
      AND s.longitude BETWEEN :minLon AND :maxLon
      AND ${haversine} <= :radius
      ${offerFilter}
    ORDER BY distanceM ASC, s.id ASC
    LIMIT ${Number(limit)}
`;

let data = db.query(sqlQuery, params);

// Prazan rezultat nije greska -- "nema prodavnice u krugu od 5km" je validan
// odgovor, a ne 404. Frontend na osnovu `radius` moze da ponudi sirenje kruga.
write('data',   data);
write('radius', radius);
write('total',  data ? data.length : 0);
}
}
