module.exports = (MARSModules) => {
with (MARSModules) {
let pr_id = param('pr_id', null);

let imageSql = `SELECT * FROM pr_info_obj where pr_id=?`; 

let showImages = db.query(imageSql, pr_id);
// response.setCache('1Y')
// write(showImages[0].iuo_slika_unutra); 
}
}