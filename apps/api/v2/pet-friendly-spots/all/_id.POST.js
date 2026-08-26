module.exports = (MARSModules) => {
with (MARSModules) {
let iuo_id=param('iuo_id',null);

let sqlQuery = `SELECT
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
    iuo.iuo_opis,
    iuo.iuo_telefon,
    ops.ops_ime,
    bas.bas_naziv,
    sta.sta_ime,
    sta.sta_meseci,
    ugo.ugo_ime,
    grd.grd_ime
FROM info_ug_obj AS iuo
INNER JOIN opstina ops ON iuo.ops_id = ops.ops_id
INNER JOIN ugo_objekat ugo ON iuo.ugo_id = ugo.ugo_id
INNER JOIN starost sta ON iuo.sta_id = sta.sta_id
INNER JOIN basta bas ON iuo.bas_id = bas.bas_id
INNER JOIN grad grd ON ops.grd_id = grd.grd_id
WHERE iuo.iuo_obrisan IS NULL and iuo.iuo_id =?`;

let sqlQueryResult = db.query(sqlQuery,iuo_id);
write("spotsListSingle", sqlQueryResult);

}
}