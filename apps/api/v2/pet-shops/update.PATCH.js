module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// PATCH pet-shops/update
//
// Parcijalna izmena: dira SAMO poslata polja. Za "promeni telefon" ili
// "ugasi prodavnicu"; PUT bi u tom slucaju obrisao opis, linkove i koordinate.
//
// Prisutnost parametra se cita iz `param()` liste, ne iz vrednosti -- inace
// "obrisi telefon" (prazan string) ne bi bilo razlicivo od "ne diraj telefon".
// Isti trik koristi pet-friendly-spots/update.POST.js.
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

let existingRows = db.query(`SELECT id, slug FROM pet_shop WHERE id = ?`, id);
if (!existingRows || existingRows.length === 0) {
    response.status(404);
    write('message', `Prodavnica sa id ${id} ne postoji.`);
    exit();
}
let existing = existingRows[0];

let sentParams = param();

function wasSent(paramName) {
    if (!sentParams) { return false; }
    for (let i = 0; i < sentParams.length; i++) {
        if (sentParams[i] === paramName) { return true; }
    }
    return false;
}

let setParts = [];
let params   = { id: Number(id) };

function setColumn(column, placeholder, value) {
    setParts.push(` ${column} = :${placeholder} `);
    params[placeholder] = value;
}

function nullIfEmpty(v) {
    return (v === null || v === undefined || v === '') ? null : v;
}

// --- prosta polja ------------------------------------------------------------
if (wasSent('name'))        { setColumn('name', 'name', param('name')); }
if (wasSent('address'))     { setColumn('address', 'address', param('address')); }
if (wasSent('phone'))       { setColumn('phone', 'phone', nullIfEmpty(param('phone', null))); }
if (wasSent('websiteUrl'))  { setColumn('website_url', 'websiteUrl', nullIfEmpty(param('websiteUrl', null))); }
if (wasSent('description')) { setColumn('description', 'description', nullIfEmpty(param('description', null))); }
if (wasSent('woltUrl'))     { setColumn('wolt_url', 'woltUrl', nullIfEmpty(param('woltUrl', null))); }
if (wasSent('glovoUrl'))    { setColumn('glovo_url', 'glovoUrl', nullIfEmpty(param('glovoUrl', null))); }
if (wasSent('logoBase64'))  { setColumn('logo_base64', 'logoBase64', nullIfEmpty(param('logoBase64', null))); }

if (wasSent('isActive')) {
    let v = param('isActive');
    setColumn('is_active', 'isActive',
        (v === '0' || v === 0 || v === false || v === 'false') ? 0 : 1);
}

// --- opstina -----------------------------------------------------------------
if (wasSent('townshipId')) {
    let townshipId = param('townshipId');
    let townshipRows = db.query(`SELECT ops_id FROM opstina WHERE ops_id = ?`, townshipId);
    if (!townshipRows || townshipRows.length === 0) {
        response.status(400);
        write('message', `Opstina sa id ${townshipId} ne postoji.`);
        exit();
    }
    setColumn('township_id', 'townshipId', Number(townshipId));
}

// --- koordinate --------------------------------------------------------------
// Moraju u paru. Jedna postavljena a druga NULL bi prosla bounding box filter i
// prodavnica bi tiho nestala iz geo rezultata.
function parseCoordinate(value, min, max, label) {
    if (value === null || value === undefined || value === '') { return null; }
    let n = Number(value);
    if (isNaN(n) || n < min || n > max) {
        response.status(400);
        write('message', `${label} mora da bude broj izmedju ${min} i ${max}.`);
        exit();
    }
    return n;
}

if (wasSent('latitude') || wasSent('longitude')) {
    if (!wasSent('latitude') || !wasSent('longitude')) {
        response.status(400);
        write('message', 'Koordinate se menjaju u paru -- posalji i `latitude` i `longitude`.');
        exit();
    }

    let lat = parseCoordinate(param('latitude', null),  -90,  90,  'Latitude');
    let lon = parseCoordinate(param('longitude', null), -180, 180, 'Longitude');

    if ((lat === null) !== (lon === null)) {
        response.status(400);
        write('message', 'Posalji obe koordinate ili obe prazne.');
        exit();
    }

    setColumn('latitude',  'latitude',  lat);
    setColumn('longitude', 'longitude', lon);
}

// --- slug --------------------------------------------------------------------
if (wasSent('slug')) {
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
        let taken = db.query(`SELECT id FROM pet_shop WHERE slug = ? AND id <> ?`, candidate, id);
        if (taken && taken.length > 0) {
            response.status(409);
            write('message', `Slug "${candidate}" vec koristi druga prodavnica.`);
            exit();
        }
        setColumn('slug', 'slug', candidate);
    }
}

if (setParts.length === 0) {
    response.status(400);
    write('message', 'Nijedno polje za izmenu nije poslato.');
    exit();
}

db.query(`UPDATE pet_shop SET ${setParts.join(',')} WHERE id = :id`, params);

write('message', 'Uspesno izmenjena prodavnica.');
write('data', { id: Number(id), updatedFields: setParts.length });
}
}
