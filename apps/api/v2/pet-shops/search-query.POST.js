module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// POST pet-shops/search-query
//
// Lista prodavnica. Envelope { data, total, cursor }, kao dog-food.
//
// Geo filter koristi bounding box PRE Haversine formule. Postojeci
// pet-friendly-spots/near-me.POST.js racuna ACOS/RADIANS za svaki red u
// tabeli, pa ne moze da iskoristi nijedan indeks -- MySQL ne zna da preveze
// izraz sa kolonom. Predfilter `latitude BETWEEN ... AND longitude BETWEEN ...`
// radi range scan po ix_pet_shop_geo, pa se skupa formula racuna samo nad
// kandidatima iz kvadrata oko tacke.
// =============================================================================

let townshipId = param('townshipId', null);
let cityId     = param('cityId', null);
let word       = param('word', null);
let hasDelivery = param('hasDelivery', null);   // '1' = ima Wolt ili Glovo
let dogFoodId  = param('dogFoodId', null);      // "ko drzi ovaj proizvod"

let lat    = param('lat', null);
let lon    = param('lon', null);
let radius = Number(param('radius', 5000));     // metri

let limit  = Number(param('limit', 20));
let lastId = param('lastId', null);
let lastValue = param('lastValue', null);
let offset = Number(param('offset', 0));        // koristi se samo u geo grani

if (!limit || limit < 1) { limit = 20; }
if (limit > 60)          { limit = 60; }
if (!offset || offset < 0) { offset = 0; }

let params = {};
let where  = ` WHERE s.is_active = 1 `;

function isNumeric(v) {
    return v !== null && v !== '' && !isNaN(Number(v));
}

// --- opstina (prima listu, kao ops_id kod spots) -----------------------------
if (townshipId) {
    let parts = String(townshipId).split(',');
    let ids   = [];
    for (let i = 0; i < parts.length; i++) {
        let n = Number(String(parts[i]).trim());
        if (!isNaN(n)) { ids.push(n); }
    }

    if (ids.length) {
        let ph = [];
        for (let i = 0; i < ids.length; i++) {
            ph.push(':townshipId' + i);
            params['townshipId' + i] = ids[i];
        }
        where += ` AND s.township_id IN (${ph.join(',')}) `;
    }
}

// --- grad --------------------------------------------------------------------
if (isNumeric(cityId)) {
    where += ` AND ops.grd_id = :cityId `;
    params.cityId = Number(cityId);
}

// --- slobodan tekst ----------------------------------------------------------
// pet_shop nema search_text kolonu -- naziva prodavnica je red velicine manje
// nego proizvoda, pa LIKE nad indeksiranim `name` + `address` je dovoljan i ne
// trazi odrzavanje jos jednog denormalizovanog polja.
if (word) {
    where += ` AND (s.name LIKE :word OR s.address LIKE :word) `;
    params.word = '%' + word + '%';
}

// --- ima dostavu -------------------------------------------------------------
if (hasDelivery === '1' || hasDelivery === 1 || hasDelivery === true) {
    where += ` AND (s.wolt_url IS NOT NULL OR s.glovo_url IS NOT NULL) `;
}

// --- drzi odredjeni proizvod -------------------------------------------------
// EXISTS umesto JOIN-a: JOIN bi duplirao prodavnicu ako se ikad pojavi vise
// ponuda istog para (UNIQUE to danas sprecava, ali EXISTS je otporan i ne
// trazi DISTINCT koji bi razbio keyset sort).
if (isNumeric(dogFoodId)) {
    where += `
        AND EXISTS (
            SELECT 1 FROM dog_food_offer o
            WHERE o.pet_shop_id = s.id
              AND o.dog_food_id = :dogFoodId
              AND o.is_in_stock = 1
        )
    `;
    params.dogFoodId = Number(dogFoodId);
}

// --- geo ---------------------------------------------------------------------
let distanceSelect = '';
let geoFilter      = '';
let useGeo         = (isNumeric(lat) && isNumeric(lon));

if (useGeo) {
    params.lat    = Number(lat);
    params.lon    = Number(lon);
    params.radius = radius;

    // 1 stepen sirine ~ 111320 m. Za duzinu se skracuje sa COS(lat), pa se
    // kvadrat suzava sto smo severnije -- bez toga bi box na 44N bio ~40% siri
    // nego sto treba i propustao previse kandidata u skupu formulu.
    let latDelta = radius / 111320;
    let lonDelta = radius / (111320 * Math.cos(Number(lat) * Math.PI / 180));

    params.minLat = Number(lat) - latDelta;
    params.maxLat = Number(lat) + latDelta;
    params.minLon = Number(lon) - lonDelta;
    params.maxLon = Number(lon) + lonDelta;

    // LEAST(1, ...) stiti od domain greske ACOS-a: zaokruzivanje na
    // vrlo malim rastojanjima ume da da argument tipa 1.0000000002, sto bi
    // vratilo NULL i tiho izbacilo najblizu prodavnicu iz rezultata.
    let haversine = `
        (6371000 * ACOS(LEAST(1,
              COS(RADIANS(:lat)) * COS(RADIANS(s.latitude))
            * COS(RADIANS(s.longitude) - RADIANS(:lon))
            + SIN(RADIANS(:lat)) * SIN(RADIANS(s.latitude))
        )))
    `;

    distanceSelect = ` , ${haversine} AS distanceM `;

    geoFilter = `
        AND s.latitude  IS NOT NULL
        AND s.longitude IS NOT NULL
        AND s.latitude  BETWEEN :minLat AND :maxLat
        AND s.longitude BETWEEN :minLon AND :maxLon
        AND ${haversine} <= :radius
    `;
}

// --- sort + keyset -----------------------------------------------------------
let orderBy   = '';
let keysetSql = '';
let hasCursor = (lastId !== null && lastId !== '' && !isNaN(Number(lastId)));

if (hasCursor) { params.lastId = Number(lastId); }

if (useGeo) {
    // Sort po rastojanju. Keyset na izracunatoj vrednosti je nepouzdan (float
    // poredjenje dve strane racunate u razlicitim upitima), pa geo grana
    // koristi OFFSET. To je ovde bezopasno: rezultat je ogranicen radijusom,
    // mali je, i korisnik ne lista duboko kroz "najblize meni".
    orderBy = ` ORDER BY distanceM ASC, s.id ASC `;
} else {
    orderBy = ` ORDER BY s.name ASC, s.id ASC `;

    if (hasCursor && lastValue !== null && lastValue !== '') {
        params.lastName = lastValue;
        keysetSql = `
            AND (
                s.name > :lastName
                OR (s.name = :lastName AND s.id > :lastId)
            )
        `;
    }
}

// --- glavni upit -------------------------------------------------------------
// logo_base64 se NE selektuje -- lista prodavnica je lista.
let dataSql = `
    SELECT
        s.id,
        s.name,
        s.slug,
        s.address,
        s.phone,
        s.website_url  AS websiteUrl,
        s.latitude,
        s.longitude,
        s.wolt_url     AS woltUrl,
        s.glovo_url    AS glovoUrl,
        s.township_id  AS townshipId,
        ops.ops_ime    AS townshipName,
        grd.grd_id     AS cityId,
        grd.grd_ime    AS cityName,
        (SELECT COUNT(*) FROM dog_food_offer o
          WHERE o.pet_shop_id = s.id AND o.is_in_stock = 1) AS offerCount
        ${distanceSelect}
    FROM pet_shop s
    LEFT JOIN opstina ops ON ops.ops_id = s.township_id
    LEFT JOIN grad    grd ON grd.grd_id = ops.grd_id
    ${where}
    ${geoFilter}
    ${keysetSql}
    ${orderBy}
    LIMIT ${Number(limit) + 1}${useGeo ? ` OFFSET ${Number(offset)}` : ''}
`;

let rows = db.query(dataSql, params);

let hasMore = rows.length > limit;

// Rucno kopiranje umesto rows.slice(): db.query vraca array-like, ne
// garantovano pravi Array.
let data = [];
for (let i = 0; i < rows.length && i < limit; i++) {
    data.push(rows[i]);
}

// --- total: samo prva strana -------------------------------------------------
let total = null;
if (!hasCursor) {
    let countSql = `
        SELECT COUNT(*) AS total_count
        FROM pet_shop s
        LEFT JOIN opstina ops ON ops.ops_id = s.township_id
        ${where}
        ${geoFilter}
    `;
    let countRows = db.query(countSql, params);
    total = countRows[0] ? countRows[0].total_count : 0;
}

// --- cursor ------------------------------------------------------------------
// Envelope je isti u obe grane; menja se samo sta cursor nosi. Frontend ga
// vraca nazad kakav jeste, pa ne mora da zna koja je grana u igri.
let cursor = null;
if (hasMore && data.length) {
    if (useGeo) {
        cursor = { offset: offset + data.length };
    } else {
        let last = data[data.length - 1];
        cursor = { lastId: last.id, lastValue: last.name };
    }
}

write('data',   data);
write('total',  total);
write('cursor', cursor);
}
}
