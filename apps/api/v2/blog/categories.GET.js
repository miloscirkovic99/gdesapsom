module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// GET blog/categories
//
// Sve kategorije, za padajucu listu u admin formi posta (blog/create).
// Javno kao blog/getAll: nazivi kategorija ionako stoje na svakom postu.
// =============================================================================

let data = db.query(`SELECT id, naziv FROM categories ORDER BY naziv, id`);

write('data',  data);
write('total', data ? data.length : 0);
}
}
