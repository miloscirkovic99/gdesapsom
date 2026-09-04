module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// POST dog-food/pending
//
// Javno slanje predloga -- BEZ auth-a, kao pet-friendly-spots/pending.POST.js.
// Predlog ide u pending_dog_food i ne dodiruje katalog dok ga admin ne odobri.
//
// Tabela je namerno labava (lookup-i i brend su NULL-abilni, brand_name je
// slobodan tekst): korisnik zna "Royal Canin, za stene", ali ne i id-jeve.
// Admin mapira na prave lookup vrednosti pri odobravanju.
// =============================================================================

function requireParam(paramName) {
    let paramValue = param(paramName);
    if (paramValue === undefined || paramValue === null || paramValue === '') {
        response.status(400);
        write('message', `Parameter ${paramName} is required.`);
        exit();
    }
    return paramValue;
}

let name = requireParam('name');

let brandName      = param('brandName', null);
let brandId        = param('brandId', null);
let foodTypeId     = param('foodTypeId', null);
let lifeStageId    = param('lifeStageId', null);
let breedSizeId    = param('breedSizeId', null);
let description    = param('description', null);
let ingredients    = param('ingredients', null);
let packageWeightG = param('packageWeightG', null);
let isGrainFree    = param('isGrainFree', 0);
let imageBase64    = param('imageBase64', null);
let shopName       = param('shopName', null);
let price          = param('price', null);
let submitterEmail = param('submitterEmail', null);

function toNumberOrNull(v) {
    if (v === null || v === undefined || v === '') { return null; }
    let n = Number(v);
    return isNaN(n) ? null : n;
}

// --- gruba zastita od spama --------------------------------------------------
// Isti naziv poslat u poslednjih 24h se odbija. Nije rate limiting, ali hvata
// dvostruki klik na "Posalji" i najgluplje ponavljanje.
let duplicateRows = db.query(`
    SELECT id FROM pending_dog_food
    WHERE name = ?
      AND is_approved = 0 AND is_declined = 0
      AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
    LIMIT 1
`, name);

if (duplicateRows && duplicateRows.length > 0) {
    response.status(409);
    write('message', 'Ovaj proizvod je vec predlozen i ceka na pregled.');
    exit();
}

let insertSql = `
    INSERT INTO pending_dog_food
    SET
        name             = :name,
        brand_name       = :brandName,
        brand_id         = :brandId,
        food_type_id     = :foodTypeId,
        life_stage_id    = :lifeStageId,
        breed_size_id    = :breedSizeId,
        description      = :description,
        ingredients      = :ingredients,
        package_weight_g = :packageWeightG,
        is_grain_free    = :isGrainFree,
        image_base64     = :imageBase64,
        shop_name        = :shopName,
        price            = :price,
        submitter_email  = :submitterEmail
`;

db.query(insertSql, {
    name:           name,
    brandName:      brandName,
    brandId:        toNumberOrNull(brandId),
    foodTypeId:     toNumberOrNull(foodTypeId),
    lifeStageId:    toNumberOrNull(lifeStageId),
    breedSizeId:    toNumberOrNull(breedSizeId),
    description:    description,
    ingredients:    ingredients,
    packageWeightG: toNumberOrNull(packageWeightG),
    isGrainFree:    (isGrainFree === '1' || isGrainFree === 1 || isGrainFree === true) ? 1 : 0,
    imageBase64:    imageBase64,
    shopName:       shopName,
    price:          toNumberOrNull(price),
    submitterEmail: submitterEmail
});

let idRows = db.query(`SELECT LAST_INSERT_ID() AS id`);

write('message', 'Uspesno ste predlozili proizvod. Hvala!');
write('data', { id: idRows[0] ? idRows[0].id : null });
}
}
