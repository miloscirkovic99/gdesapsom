module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// POST pet-shops/create
//
// Admin: nova prodavnica.
//
// Koordinate su DECIMAL(10,7), ne string kao kod info_ug_obj -- pa se ovde i
// validiraju kao brojevi. Prodavnica bez koordinata je dozvoljena (ne pojavi
// se na mapi i u "blizu mene", ali postoji u listi); prodavnica sa
// koordinatama van opsega nije.
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

let name       = requireParam('name');
let address    = requireParam('address');
let townshipId = requireParam('townshipId');

let phone       = param('phone', null);
let websiteUrl  = param('websiteUrl', null);
let description = param('description', null);
let latitude    = param('latitude', null);
let longitude   = param('longitude', null);
let woltUrl     = param('woltUrl', null);
let glovoUrl    = param('glovoUrl', null);
let logoBase64  = param('logoBase64', null);
let isActive    = param('isActive', 1);

// --- opstina mora da postoji -------------------------------------------------
// FK bi ovo uhvatio, ali greskom baze. Uz to, FK na nasledjenu opstina(ops_id)
// mozda nije ni instaliran (vidi napomenu na dnu db/01_schema.sql), pa je ova
// provera jedina garancija.
let townshipRows = db.query(`SELECT ops_id FROM opstina WHERE ops_id = ?`, townshipId);
if (!townshipRows || townshipRows.length === 0) {
    response.status(400);
    write('message', `Opstina sa id ${townshipId} ne postoji.`);
    exit();
}

// --- koordinate --------------------------------------------------------------
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

let lat = parseCoordinate(latitude,  -90,  90,  'Latitude');
let lon = parseCoordinate(longitude, -180, 180, 'Longitude');

// Pola para koordinata je gore nego nijedan: prodavnica bi prosla bounding box
// filter sa NULL na drugoj osi i tiho nestala iz rezultata.
if ((lat === null) !== (lon === null)) {
    response.status(400);
    write('message', 'Posalji obe koordinate ili nijednu.');
    exit();
}

// --- normalizacija za slug ---------------------------------------------------
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

// Slug nosi i naziv opstine: lanci imaju vise poslovnica pod istim imenom, pa
// bi "pet-centar" inace odmah postao "pet-centar-2", "pet-centar-3" bez ikakve
// informacije o tome koja je koja.
let townshipName = '';
let townshipNameRows = db.query(`SELECT ops_ime FROM opstina WHERE ops_id = ?`, townshipId);
if (townshipNameRows && townshipNameRows.length > 0) {
    townshipName = townshipNameRows[0].ops_ime || '';
}

let baseSlug = normalizeText(name + ' ' + townshipName)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200);

if (!baseSlug) { baseSlug = 'prodavnica'; }

let slug    = baseSlug;
let attempt = 1;
while (true) {
    let taken = db.query(`SELECT id FROM pet_shop WHERE slug = ?`, slug);
    if (!taken || taken.length === 0) { break; }
    attempt = attempt + 1;
    slug = baseSlug + '-' + attempt;
    if (attempt > 50) {
        response.status(409);
        write('message', 'Nije moguce generisati jedinstven slug za ovaj naziv.');
        exit();
    }
}

let insertSql = `
    INSERT INTO pet_shop
    SET
        name        = :name,
        slug        = :slug,
        address     = :address,
        township_id = :townshipId,
        phone       = :phone,
        website_url = :websiteUrl,
        description = :description,
        latitude    = :latitude,
        longitude   = :longitude,
        wolt_url    = :woltUrl,
        glovo_url   = :glovoUrl,
        logo_base64 = :logoBase64,
        is_active   = :isActive
`;

db.query(insertSql, {
    name:        name,
    slug:        slug,
    address:     address,
    townshipId:  Number(townshipId),
    phone:       phone,
    websiteUrl:  websiteUrl,
    description: description,
    latitude:    lat,
    longitude:   lon,
    woltUrl:     woltUrl,
    glovoUrl:    glovoUrl,
    logoBase64:  logoBase64,
    isActive:    (isActive === '0' || isActive === 0 || isActive === false) ? 0 : 1
});

let idRows = db.query(`SELECT LAST_INSERT_ID() AS id`);

write('message', 'Uspesno ste dodali prodavnicu.');
write('data', { id: idRows[0] ? idRows[0].id : null, slug: slug });
}
}
