module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// PUT dog-food/pending
//
// Moderacija: odbij ili odobri predlog. Pandan
// pet-friendly-spots/pending.PUT.js, koji samo postavlja pr_odbijen = 1.
//
// Razlika je u odobravanju. Kod spots je to dvokorak (admin rucno pozove
// create.POST.js pa prosledi pr_id), sto ostavlja prostor da predlog bude
// odobren a proizvod nikad ne nastane. Ovde `action=approve` u istom pozivu
// pravi dog_food red, prebacuje sliku u dog_food_image i zatvara predlog.
//
// Zbog nedostatka eksplicitnih transakcija u ovom repo-u, redosled je izabran
// tako da svaki prekid ostavi stanje koje se moze ponoviti: predlog se
// obelezava odobrenim TEK na kraju, pa neuspeh na pola znaci da isti predlog
// jos uvek ceka i akcija sme da se pokrene ponovo.
// =============================================================================

let sessionUser = session('user');
if (!sessionUser) {
    response.status(401);
    write('message', 'Not Authorized');
    exit();
}

let id     = param('id', null);
let action = param('action', 'decline');   // 'approve' | 'decline' | 'reopen'

if (id === null || id === '') {
    response.status(400);
    write('message', 'Parameter id is required.');
    exit();
}

let pendingRows = db.query(`SELECT * FROM pending_dog_food WHERE id = ?`, id);
if (!pendingRows || pendingRows.length === 0) {
    response.status(404);
    write('message', `Predlog sa id ${id} ne postoji.`);
    exit();
}
let pending = pendingRows[0];

// --- odbijanje ---------------------------------------------------------------
if (action === 'decline') {
    db.query(`UPDATE pending_dog_food SET is_declined = 1, is_approved = 0 WHERE id = ?`, id);
    write('message', 'Predlog je odbijen.');
    write('data', { id: Number(id), action: 'decline' });
    exit();
}

// --- vracanje u red ----------------------------------------------------------
if (action === 'reopen') {
    db.query(`UPDATE pending_dog_food SET is_declined = 0, is_approved = 0 WHERE id = ?`, id);
    write('message', 'Predlog je vracen u red za pregled.');
    write('data', { id: Number(id), action: 'reopen' });
    exit();
}

// --- odobravanje -------------------------------------------------------------
if (action !== 'approve') {
    response.status(400);
    write('message', 'Parametar `action` mora da bude approve, decline ili reopen.');
    exit();
}

if (pending.is_approved === 1 || pending.is_approved === true) {
    response.status(409);
    write('message', 'Predlog je vec odobren.');
    exit();
}

// Predlog sme da bude nepotpun; katalog ne sme. Zato lookup-i i brend moraju
// da budu razreseni pre odobravanja -- admin ih popuni kroz formu i posalje
// ovde, ili se koriste vec upisane vrednosti iz predloga.
let brandId     = param('brandId',     pending.brand_id);
let foodTypeId  = param('foodTypeId',  pending.food_type_id);
let lifeStageId = param('lifeStageId', pending.life_stage_id);
let breedSizeId = param('breedSizeId', pending.breed_size_id);

let missing = [];
if (!brandId)     { missing.push('brandId'); }
if (!foodTypeId)  { missing.push('foodTypeId'); }
if (!lifeStageId) { missing.push('lifeStageId'); }
if (!breedSizeId) { missing.push('breedSizeId'); }

if (missing.length > 0) {
    response.status(400);
    write('message', `Predlog nije moguce odobriti dok se ne popuni: ${missing.join(', ')}.`);
    write('data', { id: Number(id), missing: missing });
    exit();
}

let brandRows = db.query(`SELECT id, name FROM brand WHERE id = ?`, brandId);
if (!brandRows || brandRows.length === 0) {
    response.status(400);
    write('message', `Brend sa id ${brandId} ne postoji.`);
    exit();
}
let brandName = brandRows[0].name;

// --- normalizacija (isto kao create.POST.js) --------------------------------
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

let baseSlug = normalizeText(brandName + ' ' + pending.name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200);

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

// --- 1. proizvod -------------------------------------------------------------
db.query(`
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
        is_active        = 1
`, {
    name:           pending.name,
    slug:           slug,
    brandId:        Number(brandId),
    foodTypeId:     Number(foodTypeId),
    lifeStageId:    Number(lifeStageId),
    breedSizeId:    Number(breedSizeId),
    description:    pending.description,
    ingredients:    pending.ingredients,
    packageWeightG: pending.package_weight_g,
    isGrainFree:    pending.is_grain_free ? 1 : 0,
    searchText:     normalizeText(brandName + ' ' + pending.name).substring(0, 500)
});

let idRows = db.query(`SELECT LAST_INSERT_ID() AS id`);
let newId  = idRows[0] ? idRows[0].id : null;

// --- 2. slika ----------------------------------------------------------------
// Predlog nosi jednu, neskaliranu sliku. thumbnail_base64 ostaje NULL dok
// admin ne otpremi skaliranu verziju kroz images.PATCH/POST -- kartica dotle
// nema thumbnail, sto je vidljivo i namerno (bolje nego da lista vuce punu
// sliku i time ponisti celu optimizaciju).
if (newId && pending.image_base64) {
    db.query(`
        INSERT INTO dog_food_image
        SET
            dog_food_id  = :dogFoodId,
            sort_order   = 0,
            is_primary   = 1,
            alt_text     = :altText,
            image_base64 = :image
    `, {
        dogFoodId: newId,
        altText:   pending.name,
        image:     pending.image_base64
    });
}

// --- 3. zatvori predlog ------------------------------------------------------
// Tek sada -- da neuspeh iznad ostavi predlog ponovljivim.
db.query(`UPDATE pending_dog_food SET is_approved = 1, is_declined = 0 WHERE id = ?`, id);

write('message', 'Predlog je odobren i proizvod je dodat u katalog.');
write('data', { id: Number(id), dogFoodId: newId, slug: slug, action: 'approve' });
}
}
