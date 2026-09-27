module.exports = (MARSModules) => {
with (MARSModules) {
let iuo_id = param('iuo_id', null);

let imageSql = `SELECT * FROM info_ug_obj where iuo_id=?`;

let showImages = db.query(imageSql,iuo_id);
// response.setCache('1Y')
write(showImages[0].iuo_slika_base64); 
}
}