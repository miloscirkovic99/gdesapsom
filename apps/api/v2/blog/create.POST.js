module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// POST blog/create
//
// Admin: nov blog post. Telo (JSON):
//   { naslov, slug?, sadrzaj, kategorijaId?, slikaNaslovna?, status, tagIds? }
//
// autor_id se NIKAD ne cita iz tela: sesija nosi samo kor_email, pa se autor
// trazi u korisnik tabeli -- isti upit ujedno proverava admin ulogu u bazi, a
// ne samo zastavicu upisanu u sesiju pri loginu.
//
// Transakcija: MARS svaki skript vrti u jednoj transakciji -- commit kad skript
// zavrsi, rollback na gresku ili exit() (docs: concepts/database-transactions).
// Zato ovde nema db.commit(): upis u posts i post_tags prolazi ili pada zajedno.
// Sve provere idu PRE prvog upisa, pa exit() na 4xx nema sta da ponisti.
//
// Slug: ako nije poslat, pravi se iz naslova. Zauzet slug je 409 sa predlogom
// (suggestedSlug), a ne tihi -2 sufiks: forma uvek salje slug koji je admin
// video, a URL posta ne sme da se razlikuje od onog koji je potvrdio. Isti
// naslov dva puta je uz to najcesce duplikat posta, ne nov post.
//
// Greske 400/409 nose `field` (ime polja iz tela), da forma poruku prikaze uz
// to polje.
// =============================================================================

let sessionUser = session('user');
if (!sessionUser) {
    response.status(401);
    write('message', 'Not Authorized');
    exit();
}
if (!sessionUser.kor_admin) {
    response.status(403);
    write('message', 'Pravljenje postova je dozvoljeno samo administratoru.');
    exit();
}

let authorRows = db.query(`
    SELECT kor_id
    FROM korisnik
    WHERE kor_email = ? AND kor_admin = 1
    ORDER BY kor_id
    LIMIT 1
`, sessionUser.kor_email);
if (!authorRows || authorRows.length === 0) {
    response.status(403);
    write('message', 'Pravljenje postova je dozvoljeno samo administratoru.');
    exit();
}
let autorId = Number(authorRows[0].kor_id);

// --- pomocne funkcije --------------------------------------------------------
function fail(status, field, message) {
    response.status(status);
    write('message', message);
    write('field', field);
    exit();
}

function text(value) {
    return (value === null || value === undefined) ? '' : String(value).trim();
}

// Pozitivan ceo broj ili null. JSON broj moze da stigne kao "3" ili "3.0".
function toId(value) {
    let n = Number(text(value));
    return (isFinite(n) && Math.floor(n) === n && n > 0) ? n : null;
}

// varchar(255) broji znakove, a JS length UTF-16 jedinice (emoji = 2).
function charCount(value) {
    let n = 0;
    for (let i = 0; i < value.length; i++) {
        let code = value.charCodeAt(i);
        if (code < 0xDC00 || code > 0xDFFF) { n++; }
    }
    return n;
}

// Ista normalizacija kao dog-food/create.POST.js. Slova su pisana escape-om:
// fajl se lepi u Mars browser editor.
function normalizeText(value) {
    let s = String(value).toLowerCase();
    if (typeof s.normalize === 'function') {
        try {
            s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
        } catch (e) { /* ostaje na mapi ispod */ }
    }
    // dj se NFD-om ne dobija, pa mapa radi uvek; pokriva i runtime bez .normalize.
    let from = ['č', 'ć', 'ž', 'š', 'đ'];   // c c z s dj
    let to   = ['c', 'c', 'z', 's', 'dj'];
    for (let i = 0; i < from.length; i++) {
        s = s.split(from[i]).join(to[i]);
    }
    return s;
}

// Mala slova, sve osim a-z0-9 postaje "-", bez duplih i krajnjih "-".
// libs/shared/data-access blog-admin.api.ts (slugifyTitle) prati isto pravilo.
function slugify(value) {
    return normalizeText(value)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 200)
        .replace(/-+$/g, '');
}

function slugTaken(candidate) {
    let rows = db.query(`SELECT id FROM posts WHERE slug = ?`, candidate);
    return !!rows && rows.length > 0;
}

function slugConflict(taken) {
    let root = taken.substring(0, 250).replace(/-+$/g, '');
    let suggestion = null;
    for (let n = 2; n <= 50; n++) {
        if (!slugTaken(root + '-' + n)) { suggestion = root + '-' + n; break; }
    }
    response.status(409);
    write('message', `Slug "${taken}" vec koristi drugi post.`);
    write('field', 'slug');
    write('suggestedSlug', suggestion);
    exit();
}

// Forma salje "1,2,3" (isti oblik kao townshipId u pet-shops/search-query).
// JSON niz [1, 2] stize kao JS niz ili Java lista: String() od njih daje
// "1,2" ili "[1, 2]", pa se zagrade i razmaci skidaju. null = neispravan unos.
function parseIdList(value) {
    if (value === null || value === undefined) { return []; }
    let parts = String(value).replace(/[\[\]\s]/g, '').split(',');
    let ids = [];
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === '') { continue; }
        let id = toId(parts[i]);
        if (id === null) { return null; }
        if (ids.indexOf(id) === -1) { ids.push(id); }
    }
    return ids;
}

// --- naslov i sadrzaj --------------------------------------------------------
let naslov = text(param('naslov', null));
if (naslov === '') {
    fail(400, 'naslov', 'Naslov je obavezan.');
}
if (charCount(naslov) > 255) {
    fail(400, 'naslov', `Naslov sme imati najvise 255 znakova (poslato ${charCount(naslov)}).`);
}

let sadrzaj = text(param('sadrzaj', null));
if (sadrzaj === '') {
    fail(400, 'sadrzaj', 'Sadrzaj je obavezan.');
}

// --- status ------------------------------------------------------------------
// Kolona dozvoljava i 'arhiviran', ali nov post ne nastaje arhiviran.
let status = text(param('status', null)) || 'draft';
if (status !== 'draft' && status !== 'objavljen') {
    fail(400, 'status', `Status "${status}" nije dozvoljen. Nov post moze biti "draft" ili "objavljen".`);
}

// --- naslovna slika ----------------------------------------------------------
// Samo https:// ili putanja na sajtu: CSP portala (img-src 'self' data: https:)
// blokira http:// slike, a "//host" bi se na sajtu citao kao drugi domen.
let slikaNaslovna = text(param('slikaNaslovna', null)) || null;
if (slikaNaslovna !== null) {
    if (slikaNaslovna.length > 500) {
        fail(400, 'slikaNaslovna', 'URL naslovne slike sme imati najvise 500 znakova.');
    }
    if (!/^(https:\/\/\S+|\/(?!\/)\S*)$/i.test(slikaNaslovna)) {
        fail(400, 'slikaNaslovna', 'URL naslovne slike mora pocinjati sa https:// ili / (putanja na sajtu).');
    }
}

// --- kategorija ----------------------------------------------------------------
let kategorijaParam = text(param('kategorijaId', null));
let kategorijaId = null;
if (kategorijaParam !== '') {
    kategorijaId = toId(kategorijaParam);
    if (kategorijaId === null) {
        fail(400, 'kategorijaId', `kategorijaId "${kategorijaParam}" nije ispravan id.`);
    }
    let categoryRows = db.query(`SELECT id FROM categories WHERE id = ?`, kategorijaId);
    if (!categoryRows || categoryRows.length === 0) {
        fail(400, 'kategorijaId', `Kategorija sa id ${kategorijaId} ne postoji.`);
    }
}

// --- tagovi --------------------------------------------------------------------
let tagIds = parseIdList(param('tagIds', null));
if (tagIds === null) {
    fail(400, 'tagIds', 'tagIds mora biti lista id-eva, npr. [1, 2] ili "1,2".');
}
if (tagIds.length > 0) {
    // Jedan upit za sve: lista ide kao JEDAN parametar, FIND_IN_SET je razbija.
    let tagRows = db.query(`SELECT id FROM tags WHERE FIND_IN_SET(id, ?)`, tagIds.join(','));
    let found = [];
    for (let i = 0; i < (tagRows ? tagRows.length : 0); i++) {
        found.push(Number(tagRows[i].id));
    }
    let missing = tagIds.filter((id) => found.indexOf(id) === -1);
    if (missing.length > 0) {
        fail(400, 'tagIds', `Tagovi sa id ${missing.join(', ')} ne postoje.`);
    }
}

// --- slug ------------------------------------------------------------------------
let slug = text(param('slug', null));
if (slug !== '') {
    if (slug.length > 255 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
        fail(400, 'slug', 'Slug sme da sadrzi samo mala slova bez kvacica, cifre i pojedinacne crtice (npr. setnja-po-kosutnjaku).');
    }
} else {
    slug = slugify(naslov) || 'post';
}
if (slugTaken(slug)) {
    slugConflict(slug);
}

// --- utf8mb4 -------------------------------------------------------------------
// Tabela je utf8mb4, ali tekst stize kroz JDBC konekciju ciji charset odredjuje
// Mars. utf8/utf8mb3 su isti bajtovi bez 4-bajtnih znakova (emoji): konekcija
// se tada podize na utf8mb4. Bilo koji drugi charset (latin1...) bi pokvario
// c/c/z/s/dj, pa se upis odbija umesto da tiho sacuva "?".
function connectionCharsets() {
    let rows = db.query(`SELECT @@character_set_client AS client, @@character_set_connection AS conn`);
    return {
        client: rows && rows[0] ? text(rows[0].client).toLowerCase() : '',
        conn:   rows && rows[0] ? text(rows[0].conn).toLowerCase() : ''
    };
}

let charsets = connectionCharsets();
if (charsets.client !== 'utf8mb4' || charsets.conn !== 'utf8mb4') {
    let sameBytes = ['utf8', 'utf8mb3', 'utf8mb4'];
    if (sameBytes.indexOf(charsets.client) !== -1 && sameBytes.indexOf(charsets.conn) !== -1) {
        try {
            db.query(`SET NAMES utf8mb4`);
        } catch (e) { /* ponovna provera ispod odlucuje */ }
        charsets = connectionCharsets();
    }
}
if (charsets.client !== 'utf8mb4' || charsets.conn !== 'utf8mb4') {
    let hasAstral = /[\uD800-\uDBFF]/.test(naslov + sadrzaj + (slikaNaslovna || ''));
    let sameBytes = ['utf8', 'utf8mb3'];
    let bmpIsSafe = sameBytes.indexOf(charsets.client) !== -1 && sameBytes.indexOf(charsets.conn) !== -1;
    if (!bmpIsSafe) {
        response.status(500);
        write('message', `Konekcija ka bazi koristi ${charsets.client}/${charsets.conn}, a ne utf8mb4; upis bi pokvario srpska slova.`);
        exit();
    }
    if (hasAstral) {
        fail(400, 'sadrzaj', 'Konekcija ka bazi nije utf8mb4, pa emoji i drugi 4-bajtni znakovi ne mogu da se sacuvaju. Uklonite ih ili podesite konekciju na utf8mb4.');
    }
}

// --- upis ----------------------------------------------------------------------
let insertError = null;
try {
    db.query(`
        INSERT INTO posts
        SET
            autor_id       = :autorId,
            kategorija_id  = :kategorijaId,
            naslov         = :naslov,
            slug           = :slug,
            sadrzaj        = :sadrzaj,
            slika_naslovna = :slikaNaslovna,
            status         = :status,
            objavljen_u    = IF(:isPublished = 1, NOW(), NULL)
    `, {
        autorId:       autorId,
        kategorijaId:  kategorijaId,
        naslov:        naslov,
        slug:          slug,
        sadrzaj:       sadrzaj,
        slikaNaslovna: slikaNaslovna,
        status:        status,
        isPublished:   status === 'objavljen' ? 1 : 0
    });
} catch (e) {
    insertError = e;
}
if (insertError) {
    // Dva istovremena cuvanja istog sluga: provera gore prolazi obema, UNIQUE
    // `slug` pusta samo jedno. Drugo dobija isti 409 kao da ga je provera uhvatila.
    if (String(insertError).indexOf('Duplicate entry') !== -1) {
        slugConflict(slug);
    }
    throw insertError;
}

// LAST_INSERT_ID() je per-konekcija; vidi apps/api/README.md, tacka 1.
let idRows = db.query(`SELECT LAST_INSERT_ID() AS id`);
let postId = idRows && idRows[0] ? Number(idRows[0].id) : 0;
if (!postId) {
    // Greska, ne exit(): skript pada i MARS ponistava i upis u posts.
    throw new Error('blog/create: LAST_INSERT_ID() nije vratio id posta.');
}

for (let i = 0; i < tagIds.length; i++) {
    db.query(`INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)`, postId, tagIds[i]);
}

// --- odgovor -------------------------------------------------------------------
// Vremena kao tekst ("2026-09-26 14:03:00", isti oblik kao blog/getAll).
// `data` je obican objekat po eksplicitnoj listi kljuceva, a tagIds stoji pored
// njega: vidi "Envelope" u apps/api/README.md.
let createdRows = db.query(`
    SELECT
        id,
        naslov,
        slug,
        status,
        kategorija_id              AS kategorijaId,
        slika_naslovna             AS slikaNaslovna,
        autor_id                   AS autorId,
        CAST(objavljen_u AS CHAR)  AS objavljenU,
        CAST(kreiran_u AS CHAR)    AS kreiranU
    FROM posts
    WHERE id = ?
`, postId);
let created = createdRows[0];

function nullableNumber(value) {
    return (value === null || value === undefined) ? null : Number(value);
}
function nullableText(value) {
    return (value === null || value === undefined) ? null : String(value);
}

response.status(201);
write('message', status === 'objavljen' ? 'Post je objavljen.' : 'Post je sacuvan kao nacrt.');
write('data', {
    id:            Number(created.id),
    naslov:        String(created.naslov),
    slug:          String(created.slug),
    status:        String(created.status),
    kategorijaId:  nullableNumber(created.kategorijaId),
    slikaNaslovna: nullableText(created.slikaNaslovna),
    autorId:       Number(created.autorId),
    objavljenU:    nullableText(created.objavljenU),
    kreiranU:      nullableText(created.kreiranU)
});
write('tagIds', tagIds);
}
}
