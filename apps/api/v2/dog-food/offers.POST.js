module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// POST dog-food/offers
//
// Upis ponude: "ova prodavnica nudi ovaj proizvod, po ovoj ceni".
// UPSERT preko UNIQUE (dog_food_id, pet_shop_id) -- ponovni upis istog para
// osvezava cenu umesto da pukne ili duplira red.
//
// KRITICNO: posle svakog upisa recomputuje dog_food.min_price. Bez toga lista
// prikazuje staru cenu, a filter "do 3000 din" promasuje. Plan pominje i
// AFTER INSERT/UPDATE/DELETE trigere kao alternativu -- handler je izabran jer
// se lakse debaguje i vidi u ovom repo-u; cena je da SVAKI put mora da se
// pozove, pa je isti blok na dnu offers.PATCH.js i offers.DELETE.js.
// =============================================================================

let sessionUser = session('user');
if (!sessionUser) {
    response.status(401);
    write('message', 'Not Authorized');
    exit();
}

function requireParam(paramName) {
    let paramValue = param(paramName);
    if (paramValue === undefined || paramValue === null || paramValue === '') {
        response.status(400);
        write('message', `Parameter ${paramName} is required.`);
        exit();
    }
    return paramValue;
}

let dogFoodId = requireParam('dogFoodId');
let petShopId = requireParam('petShopId');

let price     = param('price', null);
let isInStock = param('isInStock', 1);
let woltUrl   = param('woltUrl', null);
let glovoUrl  = param('glovoUrl', null);

// --- obe strane moraju da postoje --------------------------------------------
// FK bi ovo uhvatio, ali porukom baze; admin forma zasluzuje citljiv 400.
let foodRows = db.query(`SELECT id FROM dog_food WHERE id = ?`, dogFoodId);
if (!foodRows || foodRows.length === 0) {
    response.status(400);
    write('message', `Proizvod sa id ${dogFoodId} ne postoji.`);
    exit();
}

let shopRows = db.query(`SELECT id FROM pet_shop WHERE id = ?`, petShopId);
if (!shopRows || shopRows.length === 0) {
    response.status(400);
    write('message', `Prodavnica sa id ${petShopId} ne postoji.`);
    exit();
}

// --- cena mora da bude broj, ako je poslata ----------------------------------
let priceValue = null;
if (price !== null && price !== '') {
    if (isNaN(Number(price)) || Number(price) < 0) {
        response.status(400);
        write('message', 'Cena mora da bude nenegativan broj.');
        exit();
    }
    priceValue = Number(price);
}

// --- upsert ------------------------------------------------------------------
// ON DUPLICATE KEY UPDATE gadja UNIQUE uq_dog_food_offer (dog_food_id, pet_shop_id).
let upsertSql = `
    INSERT INTO dog_food_offer
    SET
        dog_food_id = :dogFoodId,
        pet_shop_id = :petShopId,
        price       = :price,
        is_in_stock = :isInStock,
        wolt_url    = :woltUrl,
        glovo_url   = :glovoUrl
    ON DUPLICATE KEY UPDATE
        price       = VALUES(price),
        is_in_stock = VALUES(is_in_stock),
        wolt_url    = VALUES(wolt_url),
        glovo_url   = VALUES(glovo_url)
`;

db.query(upsertSql, {
    dogFoodId: Number(dogFoodId),
    petShopId: Number(petShopId),
    price:     priceValue,
    isInStock: (isInStock === '0' || isInStock === 0 || isInStock === false) ? 0 : 1,
    woltUrl:   woltUrl,
    glovoUrl:  glovoUrl
});

// --- recompute min_price -----------------------------------------------------
// Tri uslova, svaki je bio bug da nedostaje:
//   is_in_stock = 1     -- cena artikla kog nema nije ponuda
//   price IS NOT NULL   -- MIN() ionako preskace NULL, ali uslov to cini vidljivim
//   s.is_active = 1     -- ugasena prodavnica ne sme da diktira cenu u katalogu
// Kad ne ostane nijedna ponuda, MIN() vrati NULL -- tacno stanje "nema cene".
//
// Identican blok stoji u offers.PATCH.js, offers.DELETE.js i
// pet-shops/delete.POST.js. Ako se menja ovde, menja se i tamo.
db.query(`
    UPDATE dog_food
    SET min_price = (
        SELECT MIN(o.price)
        FROM dog_food_offer o
        INNER JOIN pet_shop s ON s.id = o.pet_shop_id AND s.is_active = 1
        WHERE o.dog_food_id = :id AND o.is_in_stock = 1 AND o.price IS NOT NULL
    )
    WHERE id = :id
`, { id: Number(dogFoodId) });

let resultRows = db.query(`
    SELECT
        o.id,
        o.price,
        o.is_in_stock AS isInStock,
        o.wolt_url    AS woltUrl,
        o.glovo_url   AS glovoUrl,
        f.min_price   AS minPrice
    FROM dog_food_offer o
    INNER JOIN dog_food f ON f.id = o.dog_food_id
    WHERE o.dog_food_id = ? AND o.pet_shop_id = ?
`, dogFoodId, petShopId);

// IRow -> obican objekat (vidi README "Envelope").
let saved = resultRows[0];

write('message', 'Ponuda je sacuvana.');
write('data', saved ? {
    id:        saved.id,
    price:     saved.price,
    isInStock: saved.isInStock,
    woltUrl:   saved.woltUrl,
    glovoUrl:  saved.glovoUrl,
    minPrice:  saved.minPrice
} : null);
}
}
