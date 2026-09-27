module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// GET dog-food/images?dogFoodId=
//
// Galerija jednog proizvoda za admin panel: id, redosled, glavna, alt tekst i
// THUMBNAIL. Puna slika se nikad ne vraca u listi -- za nju postoji
// dog-food/images/:id.
//
// Samo prijavljena sesija: javna strana galeriju dobija kroz dog-food/all/:slug.
// Ne filtrira po is_active proizvoda, jer admin uredjuje i ugasene proizvode.
// =============================================================================

let sessionUser = session('user');
if (!sessionUser) {
    response.status(401);
    write('message', 'Not Authorized');
    exit();
}

let dogFoodId = param('dogFoodId', null);
if (dogFoodId === null || dogFoodId === '') {
    response.status(400);
    write('message', 'Parameter dogFoodId is required.');
    exit();
}

let foodRows = db.query(`SELECT id FROM dog_food WHERE id = ?`, dogFoodId);
if (!foodRows || foodRows.length === 0) {
    response.status(404);
    write('message', `Proizvod sa id ${dogFoodId} ne postoji.`);
    exit();
}

let rows = db.query(`
    SELECT
        i.id,
        i.sort_order       AS sortOrder,
        i.is_primary       AS isPrimary,
        i.alt_text         AS altText,
        i.thumbnail_base64 AS thumbnail,
        i.created_at       AS createdAt
    FROM dog_food_image i
    WHERE i.dog_food_id = ?
    ORDER BY i.is_primary DESC, i.sort_order ASC, i.id ASC
`, dogFoodId);

write('data', rows);
write('total', rows ? rows.length : 0);
}
}
