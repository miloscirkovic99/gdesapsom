module.exports = (MARSModules) => {
with (MARSModules) {
// =========================
// PARAMS
// =========================
let ops_id = param("ops_id");
let ugo_id = param("ugo_id");
let sta_id = param("sta_id");
let limit = param("limit");
let offset = param("offset");
let word = param("word");

let lat = param("lat", null);
let lon = param("lon", null);
let radius = param("radius", 2000);

// =========================
// BUILD WHERE CLAUSE
// =========================
let whereClause = ` WHERE iuo.iuo_obrisan IS NULL `;
let params = {};

// ops_id (SAFE ARRAY)
if (ops_id) {
    const opsArray = ops_id.split(',').map(Number).filter(n => !isNaN(n));
    if (opsArray.length) {
        whereClause += ` AND iuo.ops_id IN (:opsIds)`;
        params.opsIds = opsArray;
    }
}

// ugo_id
if (ugo_id) {
    whereClause += ` AND iuo.ugo_id = :ugo_id`;
    params.ugo_id = ugo_id;
}

// sta_id
if (sta_id) {
    whereClause += ` AND (
        (:sta_id = 2 OR :sta_id = 3) AND iuo.sta_id IN (1,2)
        OR iuo.sta_id = :sta_id
    )`;
    params.sta_id = sta_id;
}

// word
if (word) {
    whereClause += ` AND iuo.iuo_ime LIKE :word`;
    params.word = `%${word}%`;
}

// =========================
// GEO FILTER (OPTIONAL)
// =========================
let distanceSelect = '';
let geoFilter = '';

if (lat && lon) {
    params.lat = lat;
    params.lon = lon;
    params.radius = radius;

    distanceSelect = `,
    (6371000 * ACOS(
        COS(RADIANS(:lat)) * COS(RADIANS(iuo.latitude)) *
        COS(RADIANS(iuo.longitude) - RADIANS(:lon)) +
        SIN(RADIANS(:lat)) * SIN(RADIANS(iuo.latitude))
    )) AS distance_m
    `;

    geoFilter = `
    AND iuo.latitude IS NOT NULL
    AND iuo.longitude IS NOT NULL
    AND (6371000 * ACOS(
        COS(RADIANS(:lat)) * COS(RADIANS(iuo.latitude)) *
        COS(RADIANS(iuo.longitude) - RADIANS(:lon)) +
        SIN(RADIANS(:lat)) * SIN(RADIANS(iuo.latitude))
    )) <= :radius
    `;
}

// =========================
// MAIN QUERY
// =========================
let sqlQuery = `
SELECT
    bas.bas_id,
    sta.sta_id,
    ugo.ugo_id,
    ops.ops_id,
    iuo.iuo_link_web,
    iuo.iuo_id,
    iuo.iuo_ime,
    iuo.iuo_slika_base64,
    iuo.iuo_slika_base64_unutra,
    iuo.iuo_adressa,
    iuo.latitude,
    iuo.longitude,
    iuo.location,
    iuo.iuo_telefon,
    ops.ops_ime,
    bas.bas_naziv,
    sta.sta_ime,
    ugo.ugo_ime,
    grd.grd_ime,
    iuo.iuo_opis
    ${distanceSelect}
FROM info_ug_obj AS iuo
INNER JOIN opstina ops ON iuo.ops_id = ops.ops_id
INNER JOIN ugo_objekat ugo ON iuo.ugo_id = ugo.ugo_id
INNER JOIN starost sta ON iuo.sta_id = sta.sta_id
INNER JOIN basta bas ON iuo.bas_id = bas.bas_id
INNER JOIN grad grd ON ops.grd_id = grd.grd_id
${whereClause}
${geoFilter}
`;

// =========================
// ORDERING
// =========================
if (lat && lon) {
    sqlQuery += ` ORDER BY distance_m ASC`;
} else {
    sqlQuery += ` ORDER BY 
        CASE 
            WHEN iuo.sta_id = 3 THEN 1
            WHEN iuo.sta_id = 2 THEN 2
            WHEN iuo.sta_id = 1 THEN 3
            ELSE 4
        END`;
}

// =========================
// PAGINATION
// =========================
if (limit && offset !== undefined) {
    sqlQuery += ` LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
}

// =========================
// COUNT QUERY (MATCHES FILTERS)
// =========================
let countQuery = `
SELECT COUNT(iuo.iuo_id) AS total_count
FROM info_ug_obj AS iuo
${whereClause}
${geoFilter}
`;

// =========================
// EXECUTION
// =========================
let countResults = db.query(countQuery, params);
let totalCount = countResults[0]?.total_count || 0;

// OFFSET CHECK
if (offset >= totalCount) {
    response.status(404);
    write("message", "Nažalost nismo pronašli pet-friendly objekat u skladu sa vašim pretragama.");
    exit();
}

// MAIN DATA
let dataResults = db.query(sqlQuery, params);

// RESPONSE
if (dataResults?.length > 0) {
    write("spotsList", dataResults);
    write("totalResults", totalCount);
} else {
    response.status(404);
    write("message", "Nažalost u našoj bazi ne postoji ugostiteljski objekat koji ste pretražili");
    exit();
}
}
}