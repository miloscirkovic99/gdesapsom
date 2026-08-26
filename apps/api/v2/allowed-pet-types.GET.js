module.exports = (MARSModules) => {
with (MARSModules) {
let allowedPetTypes=`SELECT sta_id as id, sta_ime as ime FROM starost `;

let q=db.query(allowedPetTypes);
 
write("allowed",q);
}
}