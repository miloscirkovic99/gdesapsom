module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// PUT dog-food/update
//
// PUNA ZAMENA. Svako polje proizvoda se prepisuje onim sto je poslato;
// izostavljeno opciono polje postaje NULL. To je razlika u odnosu na
// update.PATCH.js, koji dira samo poslata polja.
//
// Koristi admin forma koja ucitava ceo proizvod, pa ga snima nazad u celini.
// Za "promeni samo cenu" ili "ugasi proizvod" koristi PATCH.
//
// slug se NE regenerise iz novog imena -- postojeci URL bi se slomio i sitemap
// bi pokazivao na 404. Menja se samo ako je eksplicitno poslat.
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

// --- obavezno (pun oblik) ----------------------------------------------------
let id          = requireParam('id');
let name        = requireParam('name');
let brandId     = requireParam('brandId');
let foodTypeId  = requireParam('foodTypeId');
let lifeStageId = requireParam('lifeStageId');
let breedSizeId = requireParam('breedSizeId');

// --- opciono: izostavljeno znaci NULL ----------------------------------------
let description    = param('description', null);
let ingredients    = param('ingredients', null);
let packageWeightG = param('packageWeightG', null);
let isGrainFree    = param('isGrainFree', 0);
let isActive       = param('isActive', 1);
let slug           = param('slug', null);

// --- proizvod mora da postoji ------------------------------------------------
let existingRows = db.query(`SELECT id, slug FROM dog_food WHERE id = ?`, id);
if (!existingRows || existingRows.length === 0) {
    response.status(404);
    write('message', `Proizvod sa id ${id} ne postoji.`);
    exit();
}
let existing = existingRows[0];

// --- brend mora da postoji (FK bi pukao porukom baze) ------------------------
let brandRows = db.query(`SELECT id, name FROM brand WHERE id = ?`, brandId);
if (!brandRows || brandRows.length === 0) {
    response.status(400);
    write('message', `Brend sa id ${brandId} ne postoji.`);
    exit();
}
let brandName = brandRows[0].name;

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

// --- slug: menja se samo ako je poslat ---------------------------------------
let finalSlug = existing.slug;

if (slug) {
    let candidate = slugify(slug);
    if (!candidate) {
        response.status(400);
        write('message', 'Poslati slug ne daje nijedan upotrebljiv znak.');
        exit();
    }

    if (candidate !== existing.slug) {
        let taken = db.query(`SELECT id FROM dog_food WHERE slug = ? AND id <> ?`, candidate, id);
        if (taken && taken.length > 0) {
            response.status(409);
            write('message', `Slug "${candidate}" vec koristi drugi proizvod.`);
            exit();
        }
        finalSlug = candidate;
    }
}

// search_text prati name + brand -- inace pretraga nadje staro ime posle izmene
let searchText = normalizeText(brandName + ' ' + name).substring(0, 500);

// --- update ------------------------------------------------------------------
// updated_at se ne navodi: kolona ima ON UPDATE CURRENT_TIMESTAMP.
let updateSql = `
    UPDATE dog_food
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
    WHERE id = :id
`;

db.query(updateSql, {
    id:             Number(id),
    name:           name,
    slug:           finalSlug,
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

write('message', 'Uspesno izmenjen proizvod.');
write('data', { id: Number(id), slug: finalSlug });
}
}
