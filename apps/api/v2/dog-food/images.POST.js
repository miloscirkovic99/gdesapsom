module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// POST dog-food/images
//
// Dodaje sliku u galeriju proizvoda.
//
// thumbnail_base64 je OBAVEZAN. To nije formalnost: lista selektuje iskljucivo
// thumbnail, pa proizvod bez njega ostaje bez slike na kartici. Skaliranje se
// radi na frontendu (canvas), pre slanja -- server nema image biblioteku.
//
// Prva slika proizvoda automatski postaje glavna, da katalog ne moze da dobije
// proizvod sa slikama ali bez primarne.
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

let dogFoodId       = requireParam('dogFoodId');
let imageBase64     = requireParam('imageBase64');
let thumbnailBase64 = requireParam('thumbnailBase64');

let altText   = param('altText', null);
let sortOrder = param('sortOrder', null);
let isPrimary = param('isPrimary', null);

// --- proizvod mora da postoji ------------------------------------------------
let foodRows = db.query(`SELECT id, name FROM dog_food WHERE id = ?`, dogFoodId);
if (!foodRows || foodRows.length === 0) {
    response.status(400);
    write('message', `Proizvod sa id ${dogFoodId} ne postoji.`);
    exit();
}

// --- postojece slike ---------------------------------------------------------
let existingRows = db.query(`
    SELECT COUNT(*) AS image_count, COALESCE(MAX(sort_order), -1) AS max_sort
    FROM dog_food_image
    WHERE dog_food_id = ?
`, dogFoodId);

let imageCount = existingRows[0] ? existingRows[0].image_count : 0;
let maxSort    = existingRows[0] ? existingRows[0].max_sort : -1;

// Prva slika je glavna po automatizmu; svaka sledeca samo na zahtev.
let makePrimary = (imageCount === 0)
    ? 1
    : ((isPrimary === '1' || isPrimary === 1 || isPrimary === true) ? 1 : 0);

let finalSortOrder = (sortOrder === null || sortOrder === '')
    ? (Number(maxSort) + 1)
    : Number(sortOrder);

// --- samo jedna glavna slika po proizvodu ------------------------------------
// Skidamo staru pre upisa nove. Baza ovo ne moze da izrazi (UNIQUE nad
// (dog_food_id, is_primary) bi zabranio i vise od jedne NE-glavne slike).
if (makePrimary === 1) {
    db.query(`UPDATE dog_food_image SET is_primary = 0 WHERE dog_food_id = ?`, dogFoodId);
}

let insertSql = `
    INSERT INTO dog_food_image
    SET
        dog_food_id      = :dogFoodId,
        sort_order       = :sortOrder,
        is_primary       = :isPrimary,
        alt_text         = :altText,
        image_base64     = :image,
        thumbnail_base64 = :thumbnail
`;

db.query(insertSql, {
    dogFoodId: Number(dogFoodId),
    sortOrder: finalSortOrder,
    isPrimary: makePrimary,
    altText:   altText || foodRows[0].name,
    image:     imageBase64,
    thumbnail: thumbnailBase64
});

let idRows = db.query(`SELECT LAST_INSERT_ID() AS id`);

// Odgovor NE vraca base64 nazad -- klijent ga vec ima, a vracanje bi
// udvostrucilo saobracaj po uploadu.
write('message', 'Slika je dodata.');
write('data', {
    id:          idRows[0] ? idRows[0].id : null,
    dogFoodId:   Number(dogFoodId),
    sortOrder:   finalSortOrder,
    isPrimary:   makePrimary
});
}
}
