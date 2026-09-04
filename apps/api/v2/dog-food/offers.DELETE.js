module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// DELETE dog-food/offers
//
// Brise vezu proizvod x prodavnica. Ovde je tvrdo brisanje ispravno -- ponuda
// nije entitet koji korisnik moze da deli linkom, a "prodavnica vise ne drzi
// ovaj artikal" je tacno odsustvo reda. Za privremeno stanje postoji
// is_in_stock = 0 (offers.PATCH.js).
//
// Kao i svaki drugi upis u dog_food_offer, zavrsava recompute-om min_price.
// =============================================================================

let sessionUser = session('user');
if (!sessionUser) {
    response.status(401);
    write('message', 'Not Authorized');
    exit();
}

let id        = param('id', null);
let dogFoodId = param('dogFoodId', null);
let petShopId = param('petShopId', null);

let offerRows;

if (id !== null && id !== '') {
    offerRows = db.query(`SELECT id, dog_food_id FROM dog_food_offer WHERE id = ?`, id);
} else if (dogFoodId && petShopId) {
    offerRows = db.query(`
        SELECT id, dog_food_id
        FROM dog_food_offer
        WHERE dog_food_id = ? AND pet_shop_id = ?
    `, dogFoodId, petShopId);
} else {
    response.status(400);
    write('message', 'Posalji `id`, ili par `dogFoodId` + `petShopId`.');
    exit();
}

if (!offerRows || offerRows.length === 0) {
    response.status(404);
    write('message', 'Trazena ponuda ne postoji.');
    exit();
}

let offer = offerRows[0];

db.query(`DELETE FROM dog_food_offer WHERE id = ?`, offer.id);

// --- recompute min_price -----------------------------------------------------
// Ako je obrisana ponuda bila najjeftinija, min_price mora da poraste; ako je
// bila poslednja, MIN() vrati NULL i proizvod korektno ostaje bez cene.
db.query(`
    UPDATE dog_food
    SET min_price = (
        SELECT MIN(o.price)
        FROM dog_food_offer o
        INNER JOIN pet_shop s ON s.id = o.pet_shop_id AND s.is_active = 1
        WHERE o.dog_food_id = :foodId AND o.is_in_stock = 1 AND o.price IS NOT NULL
    )
    WHERE id = :foodId
`, { foodId: offer.dog_food_id });

write('message', 'Ponuda je obrisana.');
write('data', { id: offer.id, dogFoodId: offer.dog_food_id });
}
}
