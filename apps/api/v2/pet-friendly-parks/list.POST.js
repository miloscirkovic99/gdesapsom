module.exports = (MARSModules) => {
with (MARSModules) {

let par_accepted = param("par_accepted",1);
let par_declined= param("par_declined",0);
let petFriendlyParks = 'SELECT *, par_slika as iuo_slika_base64 FROM parkovi inner join opstina using(ops_id) inner join grad using(grd_id) where par_accepted=? and par_declined=? ORDER BY par_ime ';

let q = db.query(petFriendlyParks,par_accepted,par_declined);

write("petFriendlyParks", q);
}
}