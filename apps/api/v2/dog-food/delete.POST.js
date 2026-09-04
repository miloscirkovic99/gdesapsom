module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// POST dog-food/delete
//
// MEKO brisanje: is_active = 0. Isti izbor kao kod spots
// (pet-friendly-spots/delete.POST.js postavlja iuo_obrisan = 1), i isti razlog
// -- ponude, slike i deljeni linkovi prezive gresku admina.
//
// Zbog toga svi javni upiti nose `WHERE f.is_active = 1`.
//
// Tvrdo brisanje (`hard=1`) je namerno iza posebnog parametra: ON DELETE
// CASCADE na dog_food_image i dog_food_offer znaci da odnosi i sve slike i sve
// ponude, nepovratno.
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

let existingRows = db.query(`SELECT id, name, slug FROM dog_food WHERE id = ?`, id);
if (!existingRows || existingRows.length === 0) {
    response.status(404);
    write('message', `Proizvod sa id ${id} ne postoji.`);
    exit();
}
let existing = existingRows[0];

// --- tvrdo brisanje ----------------------------------------------------------
if (hard === '1' || hard === 1 || hard === true) {
    // Samo admin, ne bilo koja prijavljena sesija.
    if (!sessionUser.kor_admin) {
        response.status(403);
        write('message', 'Trajno brisanje je dozvoljeno samo administratoru.');
        exit();
    }

    // dog_food_image i dog_food_offer odlaze uz proizvod preko ON DELETE CASCADE.
    db.query(`DELETE FROM dog_food WHERE id = ?`, id);

    write('message', `Proizvod "${existing.name}" je trajno obrisan, zajedno sa slikama i ponudama.`);
    write('data', { id: Number(id), hard: true });
    exit();
}

// --- meko brisanje -----------------------------------------------------------
db.query(`UPDATE dog_food SET is_active = 0 WHERE id = ?`, id);

// Ponude gasimo zajedno sa proizvodom, da "na stanju" u nekoj prodavnici ne
// ostane da visi za artikal koji je povucen iz kataloga.
db.query(`UPDATE dog_food_offer SET is_in_stock = 0 WHERE dog_food_id = ?`, id);

write('message', `Proizvod "${existing.name}" je uklonjen iz kataloga.`);
write('data', { id: Number(id), hard: false });
}
}
