module.exports = (MARSModules) => {
with (MARSModules) {

let limit = param("limit");
let offset = param("offset")  // Offset is set to the length of already loaded results



// SQL query for fetching paginated data
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
        ops.ops_ime,
        bas.bas_naziv,
        sta.sta_ime,
        sta.sta_meseci,
        ugo.ugo_ime,
        grd.grd_ime
    FROM info_ug_obj AS iuo
    INNER JOIN opstina ops ON iuo.ops_id = ops.ops_id
    INNER JOIN grad grd ON ops.grd_id = grd.grd_id
    INNER JOIN ugo_objekat ugo ON iuo.ugo_id = ugo.ugo_id
    INNER JOIN starost sta ON iuo.sta_id = sta.sta_id
    INNER JOIN basta bas ON iuo.bas_id = bas.bas_id
    WHERE iuo.iuo_obrisan IS NULL
    LIMIT ? OFFSET ?;
`;
let countQuery = `SELECT COUNT(iuo_id) AS totalResults FROM info_ug_obj WHERE iuo_obrisan IS NULL;`;


// Execute queries
let results = db.query(sqlQuery, int(limit), int(offset)); // Paginated results

let countResult = db.query(countQuery);
let totalResults = countResult[0].totalResults;

// Write results
write("spotsList", results);
write("totalResults", totalResults);

}
}