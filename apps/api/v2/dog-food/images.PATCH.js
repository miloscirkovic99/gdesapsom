module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// PATCH dog-food/images
//
// Metapodaci slike: redosled, glavna slika, alt tekst. Sam base64 se ovde NE
// menja -- zamena slike je brisanje + images.POST.js, da se izbegne endpoint
// koji cas prima megabajt, cas jedan boolean.
//
// Dva oblika:
//   { id, isPrimary|sortOrder|altText }   -- jedna slika
//   { dogFoodId, order: "12,9,7" }        -- preuredjenje cele galerije
// =============================================================================

let sessionUser = session('user');
if (!sessionUser) {
    response.status(401);
    write('message', 'Not Authorized');
    exit();
}

let id        = param('id', null);
let dogFoodId = param('dogFoodId', null);
let order     = param('order', null);

// --- oblik 2: preuredjenje galerije ------------------------------------------
// `order` je lista id-jeva u zeljenom redosledu. Indeks u listi postaje
// sort_order; prvi u listi postaje glavna slika.
if (order && dogFoodId) {
    let parts = String(order).split(',');
    let ids   = [];

    for (let i = 0; i < parts.length; i++) {
        let n = Number(String(parts[i]).trim());
        if (!isNaN(n) && n > 0) { ids.push(n); }
    }

    if (ids.length === 0) {
        response.status(400);
        write('message', 'Parametar `order` ne sadrzi nijedan validan id.');
        exit();
    }

    // Sve prosledjene slike moraju da pripadaju ovom proizvodu -- inace bi se
    // tudja slika mogla prevesti u ovu galeriju.
    let placeholders = [];
    let checkParams  = { dogFoodId: Number(dogFoodId) };
    for (let i = 0; i < ids.length; i++) {
        placeholders.push(':imgId' + i);
        checkParams['imgId' + i] = ids[i];
    }

    let ownedRows = db.query(`
        SELECT COUNT(*) AS owned_count
        FROM dog_food_image
        WHERE dog_food_id = :dogFoodId AND id IN (${placeholders.join(',')})
    `, checkParams);

    let ownedCount = ownedRows[0] ? ownedRows[0].owned_count : 0;

    if (Number(ownedCount) !== ids.length) {
        response.status(400);
        write('message', 'Neke od poslatih slika ne pripadaju ovom proizvodu.');
        exit();
    }

    for (let i = 0; i < ids.length; i++) {
        db.query(`UPDATE dog_food_image SET sort_order = :sortOrder WHERE id = :id`, {
            sortOrder: i,
            id:        ids[i]
        });
    }

    // prvi u listi je glavna
    db.query(`UPDATE dog_food_image SET is_primary = 0 WHERE dog_food_id = ?`, dogFoodId);
    db.query(`UPDATE dog_food_image SET is_primary = 1 WHERE id = ?`, ids[0]);

    write('message', 'Redosled slika je sacuvan.');
    write('data', { dogFoodId: Number(dogFoodId), order: ids });
    exit();
}

// --- oblik 1: jedna slika ----------------------------------------------------
if (id === null || id === '') {
    response.status(400);
    write('message', 'Posalji `id` slike, ili par `dogFoodId` + `order`.');
    exit();
}

let imageRows = db.query(`SELECT id, dog_food_id FROM dog_food_image WHERE id = ?`, id);
if (!imageRows || imageRows.length === 0) {
    response.status(404);
    write('message', `Slika sa id ${id} ne postoji.`);
    exit();
}
let image = imageRows[0];

let sentParams = param();

function wasSent(paramName) {
    if (!sentParams) { return false; }
    for (let i = 0; i < sentParams.length; i++) {
        if (sentParams[i] === paramName) { return true; }
    }
    return false;
}

let setParts = [];
let params   = { id: image.id };

if (wasSent('sortOrder')) {
    setParts.push(' sort_order = :sortOrder ');
    params.sortOrder = Number(param('sortOrder'));
}

if (wasSent('altText')) {
    setParts.push(' alt_text = :altText ');
    params.altText = param('altText', null) || null;
}

let promoteToPrimary = false;
if (wasSent('isPrimary')) {
    let v = param('isPrimary');
    promoteToPrimary = (v === '1' || v === 1 || v === true || v === 'true');
    setParts.push(' is_primary = :isPrimary ');
    params.isPrimary = promoteToPrimary ? 1 : 0;
}

if (setParts.length === 0) {
    response.status(400);
    write('message', 'Nijedno polje za izmenu nije poslato.');
    exit();
}

// Skidamo staru glavnu PRE upisa, da proizvod ne ostane sa dve primarne slike.
if (promoteToPrimary) {
    db.query(`UPDATE dog_food_image SET is_primary = 0 WHERE dog_food_id = ?`, image.dog_food_id);
}

db.query(`UPDATE dog_food_image SET ${setParts.join(',')} WHERE id = :id`, params);

write('message', 'Slika je izmenjena.');
write('data', { id: image.id, dogFoodId: image.dog_food_id });
}
}
