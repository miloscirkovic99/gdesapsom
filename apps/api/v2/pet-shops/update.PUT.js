module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// PUT pet-shops/update
//
// PUNA ZAMENA -- izostavljeno opciono polje postaje NULL.
// Za izmenu jednog polja koristi update.PATCH.js.
//
// logo_base64 je izuzetak od pravila "izostavljeno = NULL": posalji
// `clearLogo=1` da bi se obrisao. Inace bi svako snimanje forme koja ne salje
// sliku nazad tiho obrisalo logo.
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

let id         = requireParam('id');
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
let clearLogo   = param('clearLogo', null);
let isActive    = param('isActive', 1);
let slug        = param('slug', null);

// --- prodavnica mora da postoji ----------------------------------------------
let existingRows = db.query(`SELECT id, slug FROM pet_shop WHERE id = ?`, id);
if (!existingRows || existingRows.length === 0) {
    response.status(404);
    write('message', `Prodavnica sa id ${id} ne postoji.`);
    exit();
}
let existing = existingRows[0];

// --- opstina mora da postoji -------------------------------------------------
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

if ((lat === null) !== (lon === null)) {
    response.status(400);
    write('message', 'Posalji obe koordinate ili nijednu.');
    exit();
}

// --- slug: menja se samo ako je poslat ---------------------------------------
// Slug je deo javnog URL-a i sitemap-a.
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

let finalSlug = existing.slug;

if (slug) {
    let candidate = normalizeText(slug)
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
        finalSlug = candidate;
    }
}

// --- logo: eksplicitno brisanje ----------------------------------------------
let logoSql = '';
let params  = {
    id:          Number(id),
    name:        name,
    slug:        finalSlug,
    address:     address,
    townshipId:  Number(townshipId),
    phone:       phone,
    websiteUrl:  websiteUrl,
    description: description,
    latitude:    lat,
    longitude:   lon,
    woltUrl:     woltUrl,
    glovoUrl:    glovoUrl,
    isActive:    (isActive === '0' || isActive === 0 || isActive === false) ? 0 : 1
};

if (clearLogo === '1' || clearLogo === 1 || clearLogo === true) {
    logoSql = ' logo_base64 = NULL, ';
} else if (logoBase64 !== null && logoBase64 !== '') {
    logoSql = ' logo_base64 = :logoBase64, ';
    params.logoBase64 = logoBase64;
}
// inace: logo se ne dira

let updateSql = `
    UPDATE pet_shop
    SET
        ${logoSql}
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
        is_active   = :isActive
    WHERE id = :id
`;

db.query(updateSql, params);

write('message', 'Uspesno izmenjena prodavnica.');
write('data', { id: Number(id), slug: finalSlug });
}
}
