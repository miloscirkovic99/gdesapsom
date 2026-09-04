module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// DELETE dog-food/images
//
// Tvrdo brisanje -- slika nije entitet sa svojim URL-om u sitemap-u, a meko
// obrisan LONGTEXT bi zauvek nosio ~187KB po redu ni za sta.
//
// Ako je obrisana slika bila glavna, sledeca po redosledu se promovise. Bez
// toga proizvod ostaje sa slikama u galeriji ali bez thumbnail-a u listi.
// =============================================================================

let sessionUser = session('user');
if (!sessionUser) {
    response.status(401);
    write('message', 'Not Authorized');
    exit();
}

let id = param('id', null);
if (id === null || id === '') {
    response.status(400);
    write('message', 'Parameter id is required.');
    exit();
}

let imageRows = db.query(`
    SELECT id, dog_food_id, is_primary FROM dog_food_image WHERE id = ?
`, id);

if (!imageRows || imageRows.length === 0) {
    response.status(404);
    write('message', `Slika sa id ${id} ne postoji.`);
    exit();
}

let image = imageRows[0];

db.query(`DELETE FROM dog_food_image WHERE id = ?`, image.id);

// --- promovisi sledecu, ako je pala glavna -----------------------------------
let promotedId = null;

if (image.is_primary === 1 || image.is_primary === true) {
    let nextRows = db.query(`
        SELECT id FROM dog_food_image
        WHERE dog_food_id = ?
        ORDER BY sort_order ASC, id ASC
        LIMIT 1
    `, image.dog_food_id);

    if (nextRows && nextRows.length > 0) {
        promotedId = nextRows[0].id;
        db.query(`UPDATE dog_food_image SET is_primary = 1 WHERE id = ?`, promotedId);
    }
}

write('message', 'Slika je obrisana.');
write('data', {
    id:         image.id,
    dogFoodId:  image.dog_food_id,
    promotedId: promotedId
});
}
}
