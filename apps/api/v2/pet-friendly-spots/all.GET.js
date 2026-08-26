module.exports = (MARSModules) => {
with (MARSModules) {
//prikaz svih kafica gde se moze ici sa psom datih rezultata;
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
WHERE iuo.iuo_obrisan IS NULL`;

let sqlQueryResult = db.query(sqlQuery);
write("spotsList", sqlQueryResult);

let getCount = `SELECT COUNT(*) as broj FROM 233u122.info_ug_obj;`

let showCount = db.query(getCount)[0];
write('count', showCount)
}
}