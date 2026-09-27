module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// PATCH dog-food/update
//
// PARCIJALNA izmena: dira SAMO polja koja su stvarno poslata. Izostavljeno
// polje ostaje kakvo je bilo -- za razliku od update.PUT.js, gde izostavljeno
// polje postaje NULL.
//
// Za "ugasi proizvod" ili "ispravi tezinu pakovanja" ovo je pravi endpoint;
// PUT bi u tom slucaju obrisao opis i sastav.
//
// Razlika `param(name, null)` vs `param()`:
//   param('description', null) vrati null i kad polje NIJE poslato i kad je
//   poslato kao prazno. Da bi "obrisi opis" bilo razlicivo od "ne diraj opis",
//   proverava se lista stvarno prisutnih parametara -- isti trik koji koristi
//   pet-friendly-spots/update.POST.js (arrayHas nad param()).
// =============================================================================

let sessionUser = session('user');
if (!sessionUser) {
    response.status(401);
    write('message', 'Not Authorized');
    exit();
}

let id = param('id', null);
if (id === null || id === '') {
    response.status(400);
    write('message', 'Parameter id is required.');
    exit();
}

// --- koji su parametri stvarno poslati ---------------------------------------
let sentParams = param();

function wasSent(paramName) {
    if (!sentParams) { return false; }
    for (let i = 0; i < sentParams.length; i++) {
        if (sentParams[i] === paramName) { return true; }
    }
    return false;
}

// --- proizvod mora da postoji ------------------------------------------------
let existingRows = db.query(`
    SELECT f.id, f.name, f.slug, f.brand_id, b.name AS brand_name
    FROM dog_food f
    INNER JOIN brand b ON b.id = f.brand_id
    WHERE f.id = ?
`, id);

if (!existingRows || existingRows.length === 0) {
    response.status(404);
    write('message', `Proizvod sa id ${id} ne postoji.`);
    exit();
}
let existing = existingRows[0];

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

// --- sastavi SET listu iz poslatih polja -------------------------------------
let setParts = [];
let params   = { id: Number(id) };

function setColumn(column, placeholder, value) {
    setParts.push(` ${column} = :${placeholder} `);
    params[placeholder] = value;
}

function toBool(v) {
    return (v === '1' || v === 1 || v === true || v === 'true') ? 1 : 0;
}

if (wasSent('name'))          { setColumn('name', 'name', param('name')); }
if (wasSent('brandId'))       { setColumn('brand_id', 'brandId', Number(param('brandId'))); }
if (wasSent('foodTypeId'))    { setColumn('food_type_id', 'foodTypeId', Number(param('foodTypeId'))); }
if (wasSent('lifeStageId'))   { setColumn('life_stage_id', 'lifeStageId', Number(param('lifeStageId'))); }
if (wasSent('breedSizeId'))   { setColumn('breed_size_id', 'breedSizeId', Number(param('breedSizeId'))); }
if (wasSent('description'))   { setColumn('description', 'description', param('description', null)); }
if (wasSent('ingredients'))   { setColumn('ingredients', 'ingredients', param('ingredients', null)); }
if (wasSent('isGrainFree'))   { setColumn('is_grain_free', 'isGrainFree', toBool(param('isGrainFree'))); }
if (wasSent('isActive'))      { setColumn('is_active', 'isActive', toBool(param('isActive'))); }

if (wasSent('packageWeightG')) {
    let w = param('packageWeightG', null);
    setColumn('package_weight_g', 'packageWeightG', (w === null || w === '') ? null : Number(w));
}

// --- brend: ako se menja, mora da postoji ------------------------------------
let effectiveBrandName = existing.brand_name;

if (wasSent('brandId')) {
    let brandRows = db.query(`SELECT id, name FROM brand WHERE id = ?`, param('brandId'));
    if (!brandRows || brandRows.length === 0) {
        response.status(400);
        write('message', `Brend sa id ${param('brandId')} ne postoji.`);
        exit();
    }
    effectiveBrandName = brandRows[0].name;
}

// --- slug: samo na eksplicitan zahtev ----------------------------------------
// Slug je deo javnog URL-a i sitemap-a; menjanje na svaku izmenu imena bi
// tiho pravilo 404 na svakom podeljenom linku.
if (wasSent('slug')) {
    let candidate = normalizeText(param('slug'))
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 200);

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
        setColumn('slug', 'slug', candidate);
    }
}

// --- search_text prati name + brand ------------------------------------------
if (wasSent('name') || wasSent('brandId')) {
    let effectiveName = wasSent('name') ? param('name') : existing.name;
    setColumn('search_text', 'searchText',
        normalizeText(effectiveBrandName + ' ' + effectiveName).substring(0, 500));
}

if (setParts.length === 0) {
    response.status(400);
    write('message', 'Nijedno polje za izmenu nije poslato.');
    exit();
}

let updateSql = `UPDATE dog_food SET ${setParts.join(',')} WHERE id = :id`;
db.query(updateSql, params);

write('message', 'Uspesno izmenjen proizvod.');
write('data', { id: Number(id), updatedFields: setParts.length });
}
}
