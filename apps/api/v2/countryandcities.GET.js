module.exports = (MARSModules) => {
with (MARSModules) {
let bas='SELECT bas_id as id, bas_naziv as ime FROM basta';

let query=db.query(bas);

write("gardenTypes",query);
}
}