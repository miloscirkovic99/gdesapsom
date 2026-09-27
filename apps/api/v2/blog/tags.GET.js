module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// GET blog/tags
//
// Svi tagovi, za visestruki izbor u admin formi posta (blog/create).
// Javno kao blog/getAll: nazivi tagova ionako stoje na svakom postu.
// =============================================================================

let data = db.query(`SELECT id, naziv FROM tags ORDER BY naziv, id`);

write('data',  data);
write('total', data ? data.length : 0);
}
}
