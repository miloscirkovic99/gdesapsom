module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// POST dog-food/brands
//
// Admin: nov brend. Postoji zato sto forma proizvoda inace ne bi imala kako da
// unese prvi proizvod nekog brenda -- brand tabela nema drugi put unosa osim
// db/02_seed_lookups.sql.
//
// slug se generise iz imena (ista normalizacija kao dog-food/create.POST.js)
// i dobija -2, -3 sufiks na koliziju. Isto ime dva puta je greska (409), ne
// tihi duplikat: "Royal Canin" i "royal canin" su isti brend.
// =============================================================================

let sessionUser = session('user');
if (!sessionUser) {
    response.status(401);
    write('message', 'Not Authorized');
    exit();
}

let name       = param('name', null);
let websiteUrl = param('websiteUrl', null);
let logoUrl    = param('logoUrl', null);

if (name === null || String(name).trim() === '') {
    response.status(400);
    write('message', 'Parameter name is required.');
    exit();
}
name = String(name).trim();

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

// --- isto ime = isti brend ---------------------------------------------------
let sameNameRows = db.query(`SELECT id, name, slug FROM brand WHERE LOWER(name) = ?`, name.toLowerCase());
if (sameNameRows && sameNameRows.length > 0) {
    response.status(409);
    write('message', `Brend "${sameNameRows[0].name}" vec postoji.`);
    write('data', { id: sameNameRows[0].id, slug: sameNameRows[0].slug, name: sameNameRows[0].name });
    exit();
}

// --- jedinstven slug ---------------------------------------------------------
let baseSlug = normalizeText(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 120);

if (!baseSlug) { baseSlug = 'brend'; }

let slug    = baseSlug;
let attempt = 1;
while (true) {
    let taken = db.query(`SELECT id FROM brand WHERE slug = ?`, slug);
    if (!taken || taken.length === 0) { break; }
    attempt = attempt + 1;
    slug = baseSlug + '-' + attempt;
    if (attempt > 50) {
        response.status(409);
        write('message', 'Nije moguce generisati jedinstven slug za ovaj naziv.');
        exit();
    }
}

db.query(`
    INSERT INTO brand
    SET
        name        = :name,
        slug        = :slug,
        website_url = :websiteUrl,
        logo_url    = :logoUrl,
        is_active   = 1
`, {
    name:       name,
    slug:       slug,
    websiteUrl: (websiteUrl === null || websiteUrl === '') ? null : websiteUrl,
    logoUrl:    (logoUrl === null || logoUrl === '') ? null : logoUrl
});

let idRows = db.query(`SELECT LAST_INSERT_ID() AS id`);

write('message', 'Brend je dodat.');
write('data', { id: idRows[0] ? idRows[0].id : null, slug: slug, name: name });
}
}
