module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// PATCH dog-food/offers
//
// Parcijalna izmena jedne ponude. Tipicna upotreba je jedno polje: "cena je
// sad 2890" ili "nema na stanju" -- bez ponovnog slanja wolt/glovo linkova,
// sto bi POST upsert zahtevao (on prepisuje sva polja).
//
// Ponuda se adresira ili preko `id`, ili preko para dogFoodId + petShopId.
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

// --- pronadji ponudu ---------------------------------------------------------
let offerRows;

if (id !== null && id !== '') {
    offerRows = db.query(`
        SELECT id, dog_food_id, pet_shop_id FROM dog_food_offer WHERE id = ?
    `, id);
} else if (dogFoodId && petShopId) {
    offerRows = db.query(`
        SELECT id, dog_food_id, pet_shop_id
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

// --- koji su parametri stvarno poslati ---------------------------------------
let sentParams = param();

function wasSent(paramName) {
    if (!sentParams) { return false; }
    for (let i = 0; i < sentParams.length; i++) {
        if (sentParams[i] === paramName) { return true; }
    }
    return false;
}

let setParts = [];
let params   = { id: offer.id };

function setColumn(column, placeholder, value) {
    setParts.push(` ${column} = :${placeholder} `);
    params[placeholder] = value;
}

// --- cena --------------------------------------------------------------------
// Prazan string je "obrisi cenu" (NULL), ne "cena je 0".
if (wasSent('price')) {
    let price = param('price', null);
    if (price === null || price === '') {
        setColumn('price', 'price', null);
    } else if (isNaN(Number(price)) || Number(price) < 0) {
        response.status(400);
        write('message', 'Cena mora da bude nenegativan broj.');
        exit();
    } else {
        setColumn('price', 'price', Number(price));
    }
}

if (wasSent('isInStock')) {
    let v = param('isInStock');
    setColumn('is_in_stock', 'isInStock',
        (v === '0' || v === 0 || v === false || v === 'false') ? 0 : 1);
}

if (wasSent('woltUrl'))  { setColumn('wolt_url',  'woltUrl',  param('woltUrl', null)  || null); }
if (wasSent('glovoUrl')) { setColumn('glovo_url', 'glovoUrl', param('glovoUrl', null) || null); }

if (setParts.length === 0) {
    response.status(400);
    write('message', 'Nijedno polje za izmenu nije poslato.');
    exit();
}

db.query(`UPDATE dog_food_offer SET ${setParts.join(',')} WHERE id = :id`, params);

// --- recompute min_price -----------------------------------------------------
// Obavezno i ovde: promena cene ili gasenje "na stanju" menja minimum.
// Isti blok kao u offers.POST.js i offers.DELETE.js.
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

let resultRows = db.query(`
    SELECT
        o.id,
        o.price,
        o.is_in_stock AS isInStock,
        o.wolt_url    AS woltUrl,
        o.glovo_url   AS glovoUrl,
        o.updated_at  AS updatedAt,
        f.min_price   AS minPrice
    FROM dog_food_offer o
    INNER JOIN dog_food f ON f.id = o.dog_food_id
    WHERE o.id = ?
`, offer.id);

write('message', 'Ponuda je izmenjena.');
write('data', resultRows[0] || null);
}
}
