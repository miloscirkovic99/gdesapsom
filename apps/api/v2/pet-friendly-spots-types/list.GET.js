module.exports = (MARSModules) => {
with (MARSModules) {
let spotsTypes='SELECT ugo_id as id, ugo_ime as ime FROM ugo_objekat';

let q=db.query(spotsTypes);

write("spotTypes",q);
}
}