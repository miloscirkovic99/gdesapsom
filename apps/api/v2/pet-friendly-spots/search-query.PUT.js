module.exports = (MARSModules) => {
with (MARSModules) {
// Retrieve the filters
let ops_id = param("ops_id");
let ugo_id = param("ugo_id");
let sta_id = param("sta_id");
let limit = param("limit");
let offset = param("offset");

// Debug output
let q = ops_id?.split(',');
const numberArray = q?.map(str => Number(str));
const opsIdsString = numberArray?.join(',');

// Base query for data retrieval
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
        iuo.iuo_telefon,
        ops.ops_ime,
        bas.bas_naziv,
        sta.sta_ime,
        sta.sta_meseci,
        ugo.ugo_ime,
        grd.grd_ime,
        iuo.iuo_opis
    FROM info_ug_obj AS iuo
    INNER JOIN opstina ops ON iuo.ops_id = ops.ops_id
    INNER JOIN ugo_objekat ugo ON iuo.ugo_id = ugo.ugo_id
    INNER JOIN starost sta ON iuo.sta_id = sta.sta_id
    INNER JOIN basta bas ON iuo.bas_id = bas.bas_id
    INNER JOIN grad grd ON ops.grd_id = grd.grd_id
    WHERE iuo.iuo_obrisan IS NULL
`;

// Base query for total count
let countQuery = `
    SELECT COUNT(iuo.iuo_id) AS total_count
    FROM info_ug_obj AS iuo
    WHERE iuo.iuo_obrisan IS NULL
`;
// Add ordering clause
// sqlQuery += ` GROUP BY iuo.iuo_ime`;
// Add filters if provided
if (opsIdsString) {
    sqlQuery += ` AND iuo.ops_id IN (${opsIdsString})`;
    countQuery += ` AND iuo.ops_id IN (${opsIdsString})`;
}
if (ugo_id) {
    sqlQuery += ` AND iuo.ugo_id = COALESCE(?, ${ugo_id})`;
    countQuery += ` AND iuo.ugo_id = COALESCE(?, ${ugo_id})`;
}
if (sta_id) {
    // Ako je sta_id = 3, vrati sta_id 1 i 2, inače vrati sta_id sa FE
 sqlQuery += ` AND (
         (${sta_id} = 2 OR ${sta_id} = 3) AND iuo.sta_id IN (1, 2)
        OR iuo.sta_id = ${sta_id}
    )`;
    countQuery += ` AND (
         (${sta_id} = 2 OR ${sta_id} = 3) AND iuo.sta_id IN (1, 2)
        OR iuo.sta_id = ${sta_id}
    )`;
}

// Apply pagination
if (limit && offset !== undefined) {
    sqlQuery += ` LIMIT ${limit} OFFSET ${offset}`;
}

// Execute queries
let dataResults = db.query(sqlQuery, ugo_id, sta_id);
let countResults = db.query(countQuery, ugo_id, sta_id);

// Handle results
if (dataResults?.length > 0) {
    write("spotsList", dataResults);
    write("totalResults", countResults[0].total_count || 0); // Total count
} else {
    response.status(404);
    write("message", "Nažalost u našoj bazi ne postoji ugostiteljski objekat koji ste pretražili");
    exit();
}

}
}