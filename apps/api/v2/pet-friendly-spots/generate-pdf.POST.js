module.exports = (MARSModules) => {
with (MARSModules) {
const iuo_id = param('iuo_id');
// the validateEmail function exists somewhere in an init script, to view 
// more about init scripts check out the sharing code section of the tutorial
// if (!user_email || !validateEmail(user_email)) {
//     response.status(400);
//     write('message', 'invalid-email');
//     exit();
// } 
const user_data = db.query(`
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
INNER JOIN ugo_objekat ugo ON iuo.ugo_id = ugo.ugo_id
INNER JOIN starost sta ON iuo.sta_id = sta.sta_id
INNER JOIN basta bas ON iuo.bas_id = bas.bas_id
INNER JOIN grad grd ON ops.grd_id = grd.grd_id
WHERE iuo.iuo_obrisan IS NULL and  iuo.iuo_id=?
`, iuo_id);


if (user_data. length === 0) {
    response.status(400);
    write('message', 'invalid-email');
    exit();
}
const pdf_file = report.pdf('https://gdesapsom.com', user_data);

response.header('content-type', 'application/pdf')
write(pdf_file)
}
}