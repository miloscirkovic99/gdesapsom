module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// POST pet-shops/delete
//
// MEKO brisanje: is_active = 0. Isti izbor kao svuda u ovom projektu
// (pet-friendly-spots/delete.POST.js -> iuo_obrisan = 1).
//
// Ponude te prodavnice ostaju u bazi, ali se gase (is_in_stock = 0) i za svaki
// pogodjen proizvod se recomputuje min_price. Bez toga bi proizvod zauvek
// prikazivao cenu iz prodavnice koja vise ne radi.
//
// Tvrdo brisanje (`hard=1`) je iza posebnog parametra i samo za admina: ON
// DELETE CASCADE odnosi sve ponude te prodavnice nepovratno.
// =============================================================================

let sessionUser = session('user');
if (!sessionUser) {
    response.status(401);
    write('message', 'Not Authorized');
    exit();
}

let id   = param('id', null);
let hard = param('hard', null);

if (id === null || id === '') {
    response.status(400);
    write('message', 'Parameter id is required.');
    exit();
}

let existingRows = db.query(`SELECT id, name FROM pet_shop WHERE id = ?`, id);
if (!existingRows || existingRows.length === 0) {
    response.status(404);
    write('message', `Prodavnica sa id ${id} ne postoji.`);
    exit();
}
let existing = existingRows[0];

// --- proizvodi kojih se ovo tice --------------------------------------------
// Spisak se cita PRE promene: posle gasenja ponuda ne bismo vise znali koje
// proizvode treba preracunati.
let affectedRows = db.query(`
    SELECT DISTINCT dog_food_id FROM dog_food_offer WHERE pet_shop_id = ?
`, id);

// --- tvrdo brisanje ----------------------------------------------------------
if (hard === '1' || hard === 1 || hard === true) {
    if (!sessionUser.kor_admin) {
        response.status(403);
        write('message', 'Trajno brisanje je dozvoljeno samo administratoru.');
        exit();
    }

    db.query(`DELETE FROM pet_shop WHERE id = ?`, id);   // ponude odlaze CASCADE
} else {
    db.query(`UPDATE pet_shop SET is_active = 0 WHERE id = ?`, id);
    db.query(`UPDATE dog_food_offer SET is_in_stock = 0 WHERE pet_shop_id = ?`, id);
}

// --- recompute min_price za pogodjene proizvode ------------------------------
let recomputed = 0;
if (affectedRows) {
    for (let i = 0; i < affectedRows.length; i++) {
        db.query(`
            UPDATE dog_food
            SET min_price = (
                SELECT MIN(o.price)
                FROM dog_food_offer o
                INNER JOIN pet_shop s ON s.id = o.pet_shop_id AND s.is_active = 1
                WHERE o.dog_food_id = :foodId
                  AND o.is_in_stock = 1
                  AND o.price IS NOT NULL
            )
            WHERE id = :foodId
        `, { foodId: affectedRows[i].dog_food_id });
        recomputed = recomputed + 1;
    }
}

write('message', `Prodavnica "${existing.name}" je uklonjena.`);
write('data', {
    id:                 Number(id),
    hard:               (hard === '1' || hard === 1 || hard === true),
    recomputedProducts: recomputed
});
}
}
