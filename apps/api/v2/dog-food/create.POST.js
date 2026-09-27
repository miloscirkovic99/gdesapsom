module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// POST dog-food/create
//
// Admin: nov proizvod. Prati auth obrazac iz
// pet-friendly-spots/create.POST.js (session('user') -> 401).
//
// Handler je odgovoran za tri izvedena polja koja baza ne moze sama:
//   slug         -- generisan iz brenda + imena, sa -2, -3 sufiksom na koliziju
//   search_text  -- name + brand, bez dijakritika, lowercase (za FULLTEXT)
//   min_price    -- ostaje NULL; puni ga tek prvi upis u dog_food_offer
// =============================================================================

let sessionUser = session('user');
if (!sessionUser) {
    response.status(401);
    write('message', 'You are not logged in');
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

// --- obavezno ----------------------------------------------------------------
let name        = requireParam('name');
let brandId     = requireParam('brandId');
let foodTypeId  = requireParam('foodTypeId');
let lifeStageId = requireParam('lifeStageId');
let breedSizeId = requireParam('breedSizeId');

// --- opciono -----------------------------------------------------------------
let description    = param('description', null);
let ingredients    = param('ingredients', null);
let packageWeightG = param('packageWeightG', null);
let isGrainFree    = param('isGrainFree', 0);
let isActive       = param('isActive', 1);
let pendingId      = param('pendingId', null);   // ako nastaje iz predloga

// --- normalizacija -----------------------------------------------------------
// Isti NFD postupak kao shared/utils/township.util.ts na frontendu, plus dve
// stvari koje taj util nema: mapu za dj (NFD ga ne razlaze) i fallback za
// runtime bez String.prototype.normalize.
function normalizeText(value) {
    if (value === null || value === undefined) { return ''; }
    let s = String(value).toLowerCase();

    // NFD razlaze c/c/z/s na osnovno slovo + kombinujuci znak, pa se znak skida.
    // Opseg je pisan escape-om, ne doslovnim znacima: fajl se lepi u Mars browser
    // editor, a doslovni kombinujuci znakovi su prvo sto tu strada.
    if (typeof s.normalize === 'function') {
        try {
            s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        } catch (e) { /* ostaje na mapi ispod */ }
    }

    // dj se NFD-om NE dobija: 'd' je zasebno slovo, ne 'd' sa znakom. Ova mapa
    // zato radi UVEK, ne samo kao fallback -- i pokriva runtime bez .normalize.
    let from = ['č', 'ć', 'ž', 'š', 'đ'];   // c c z s dj
    let to   = ['c', 'c', 'z', 's', 'dj'];
    for (let i = 0; i < from.length; i++) {
        s = s.split(from[i]).join(to[i]);
    }
    return s;
}

function slugify(value) {
    return normalizeText(value)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 200);
}

// --- brend (za slug i search_text) -------------------------------------------
let brandRows = db.query(`SELECT id, name FROM brand WHERE id = ?`, brandId);
if (!brandRows || brandRows.length === 0) {
    response.status(400);
    write('message', `Brend sa id ${brandId} ne postoji.`);
    exit();
}
let brandName = brandRows[0].name;

// --- jedinstven slug ---------------------------------------------------------
// UNIQUE uq_dog_food_slug bi ovo uhvatio i sam, ali greskom baze umesto
// upotrebljivim imenom -- pa ga resavamo unapred.
let baseSlug = slugify(brandName + ' ' + name);
if (!baseSlug) { baseSlug = 'proizvod'; }

let slug    = baseSlug;
let attempt = 1;
while (true) {
    let taken = db.query(`SELECT id FROM dog_food WHERE slug = ?`, slug);
    if (!taken || taken.length === 0) { break; }
    attempt = attempt + 1;
    slug = baseSlug + '-' + attempt;
    if (attempt > 50) {
        response.status(409);
        write('message', 'Nije moguce generisati jedinstven slug za ovaj naziv.');
        exit();
    }
}

let searchText = normalizeText(brandName + ' ' + name).substring(0, 500);

// --- insert ------------------------------------------------------------------
let insertSql = `
    INSERT INTO dog_food
    SET
        name             = :name,
        slug             = :slug,
        brand_id         = :brandId,
        food_type_id     = :foodTypeId,
        life_stage_id    = :lifeStageId,
        breed_size_id    = :breedSizeId,
        description      = :description,
        ingredients      = :ingredients,
        package_weight_g = :packageWeightG,
        is_grain_free    = :isGrainFree,
        search_text      = :searchText,
        is_active        = :isActive
`;

db.query(insertSql, {
    name:           name,
    slug:           slug,
    brandId:        Number(brandId),
    foodTypeId:     Number(foodTypeId),
    lifeStageId:    Number(lifeStageId),
    breedSizeId:    Number(breedSizeId),
    description:    description,
    ingredients:    ingredients,
    packageWeightG: (packageWeightG === null || packageWeightG === '') ? null : Number(packageWeightG),
    isGrainFree:    (isGrainFree === '1' || isGrainFree === 1 || isGrainFree === true) ? 1 : 0,
    searchText:     searchText,
    isActive:       (isActive === '0' || isActive === 0 || isActive === false) ? 0 : 1
});

// LAST_INSERT_ID() je per-konekcija, pa je siguran i pod paralelnim upisima.
// Citamo ga zasebnim upitom jer povratni oblik db.query za INSERT nije
// dokumentovan u ovom repo-u -- vidi db/README.md.
let idRows = db.query(`SELECT LAST_INSERT_ID() AS id`);
let newId  = idRows[0] ? idRows[0].id : null;

// --- prva slika, ako je poslata ---------------------------------------------
// Slika ide u dog_food_image, NIKAD u dog_food -- to je cela poenta razdvajanja.
let imageBase64     = param('imageBase64', null);
let thumbnailBase64 = param('thumbnailBase64', null);

if (newId && imageBase64) {
    db.query(`
        INSERT INTO dog_food_image
        SET
            dog_food_id      = :dogFoodId,
            sort_order       = 0,
            is_primary       = 1,
            alt_text         = :altText,
            image_base64     = :image,
            thumbnail_base64 = :thumbnail
    `, {
        dogFoodId: newId,
        altText:   name,
        image:     imageBase64,
        thumbnail: thumbnailBase64
    });
}

// --- zatvori predlog, ako proizvod nastaje iz njega -------------------------
if (pendingId) {
    db.query(`UPDATE pending_dog_food SET is_approved = 1 WHERE id = ?`, pendingId);
}

write('message', 'Uspesno ste dodali proizvod.');
write('data', { id: newId, slug: slug });
}
}
