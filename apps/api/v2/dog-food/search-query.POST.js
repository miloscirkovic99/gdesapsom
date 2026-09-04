module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// POST dog-food/search-query
//
// Lista kataloga. Vraca cist envelope { data, total, cursor }.
//
// Tri stvari koje ovo radi drugacije od pet-friendly-spots/search-query.POST.js:
//
//  1. NIKAD ne selektuje image_base64 -- samo thumbnail_base64 glavne slike.
//     Zato je red u listi ~15KB umesto ~187KB.
//  2. Keyset (cursor) paginacija sa stabilnim sortom umesto OFFSET-a. Postojeci
//     kod racuna offset iz duzine liste bez tie-breakera, pa na jednakim
//     vrednostima duplira i preskace redove. `?` OFFSET 2000 usput skenira
//     2020 redova; cursor skenira 20.
//  3. COUNT(*) se radi SAMO na prvoj strani (kad nema cursor-a). Danas svaki
//     "see more" poziv placa pun count.
//
// Filteri primaju i `code`/`slug` i numericki id -- deep linkovi koriste code
// (?type=dry&brand=royal-canin), admin UI koristi id.
// =============================================================================

// --- parametri ---------------------------------------------------------------
let foodType   = param('foodType', null);    // code ('dry') ili id
let lifeStage  = param('lifeStage', null);   // code ('puppy') ili id
let breedSize  = param('breedSize', null);   // code ('small') ili id
let brand      = param('brand', null);       // slug ('royal-canin') ili id
let grainFree  = param('grainFree', null);   // '1' / '0'
let minPrice   = param('minPrice', null);
let maxPrice   = param('maxPrice', null);
let word       = param('word', null);
let sort       = param('sort', 'name');      // 'name' | 'price' | 'new'
let limit      = Number(param('limit', 20));

// cursor: poslednji red prethodne strane
let lastId     = param('lastId', null);
let lastValue  = param('lastValue', null);   // ime / cena / created_at, po sortu

if (!limit || limit < 1)  { limit = 20; }
if (limit > 60)           { limit = 60; }    // plafon, da lista ne moze da se
                                             // pretvori u dump cele tabele

let params = {};
let where  = ` WHERE f.is_active = 1 `;

// --- lookup filteri ----------------------------------------------------------
// isNumeric: '3' -> po id, 'dry' -> po code. Bez ovoga bi frontend morao da
// zna id-jeve, a deep linkovi bi bili neceljivi.
function isNumeric(v) {
    return v !== null && v !== '' && !isNaN(Number(v));
}

if (foodType) {
    if (isNumeric(foodType)) {
        where += ` AND f.food_type_id = :foodTypeId `;
        params.foodTypeId = Number(foodType);
    } else {
        where += ` AND f.food_type_id = (SELECT id FROM food_type WHERE code = :foodTypeCode) `;
        params.foodTypeCode = foodType;
    }
}

if (lifeStage) {
    if (isNumeric(lifeStage)) {
        where += ` AND f.life_stage_id = :lifeStageId `;
        params.lifeStageId = Number(lifeStage);
    } else {
        where += ` AND f.life_stage_id = (SELECT id FROM life_stage WHERE code = :lifeStageCode) `;
        params.lifeStageCode = lifeStage;
    }
}

if (breedSize) {
    if (isNumeric(breedSize)) {
        where += ` AND f.breed_size_id = :breedSizeId `;
        params.breedSizeId = Number(breedSize);
    } else {
        where += ` AND f.breed_size_id = (SELECT id FROM breed_size WHERE code = :breedSizeCode) `;
        params.breedSizeCode = breedSize;
    }
}

// brend prima listu ("royal-canin,purina") -- filter cipovi su multi-select
if (brand) {
    let brandParts = String(brand).split(',');
    let brandIds   = [];
    let brandSlugs = [];

    for (let i = 0; i < brandParts.length; i++) {
        let part = brandParts[i].trim();
        if (!part) { continue; }
        if (isNumeric(part)) { brandIds.push(Number(part)); }
        else                 { brandSlugs.push(part); }
    }

    let brandClauses = [];

    if (brandIds.length) {
        let ph = [];
        for (let i = 0; i < brandIds.length; i++) {
            ph.push(':brandId' + i);
            params['brandId' + i] = brandIds[i];
        }
        brandClauses.push(` f.brand_id IN (${ph.join(',')}) `);
    }

    if (brandSlugs.length) {
        let ph = [];
        for (let i = 0; i < brandSlugs.length; i++) {
            ph.push(':brandSlug' + i);
            params['brandSlug' + i] = brandSlugs[i];
        }
        brandClauses.push(` f.brand_id IN (SELECT id FROM brand WHERE slug IN (${ph.join(',')})) `);
    }

    if (brandClauses.length) {
        where += ` AND (${brandClauses.join(' OR ')}) `;
    }
}

if (grainFree !== null && grainFree !== '') {
    where += ` AND f.is_grain_free = :grainFree `;
    params.grainFree = (grainFree === '1' || grainFree === 1 || grainFree === true) ? 1 : 0;
}

// --- opseg cene --------------------------------------------------------------
// min_price je NULL kad proizvod nema nijednu ponudu. Filter po ceni takav
// proizvod izbacuje -- to je namerno: "do 3000 din" ne sme da vrati artikal
// bez cene.
if (isNumeric(minPrice)) {
    where += ` AND f.min_price IS NOT NULL AND f.min_price >= :minPrice `;
    params.minPrice = Number(minPrice);
}
if (isNumeric(maxPrice)) {
    where += ` AND f.min_price IS NOT NULL AND f.min_price <= :maxPrice `;
    params.maxPrice = Number(maxPrice);
}

// --- slobodan tekst ----------------------------------------------------------
// search_text je vec normalizovan na write-u (bez dijakritika, lowercase), pa
// se isti postupak primenjuje na upit -- "zitarica" nalazi "zitarica".
//
// FULLTEXT ignorise termine krace od innodb_ft_min_token_size (default 3), pa
// za kratke upite padamo na LIKE. Bez ovog fallback-a pretraga "dr" tiho vraca
// praznu listu umesto prefiks pogodaka.
function normalizeText(value) {
    if (value === null || value === undefined) { return ''; }
    let s = String(value).toLowerCase();

    // Isti NFD postupak kao shared/utils/township.util.ts na frontendu.
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

let searchTerm = normalizeText(word).replace(/[^a-z0-9\s]/g, ' ').trim();

if (searchTerm) {
    if (searchTerm.length >= 3) {
        // BOOLEAN MODE: svaki termin je obavezan (+) i prefiks (*).
        // Operatori su vec skinuti regexom gore, pa nema injekcije u sintaksu.
        let terms = searchTerm.split(/\s+/);
        let booleanQuery = [];
        for (let i = 0; i < terms.length; i++) {
            if (terms[i].length >= 3) { booleanQuery.push('+' + terms[i] + '*'); }
        }

        if (booleanQuery.length) {
            where += ` AND MATCH(f.search_text) AGAINST (:searchTerm IN BOOLEAN MODE) `;
            params.searchTerm = booleanQuery.join(' ');
        } else {
            where += ` AND f.search_text LIKE :searchLike `;
            params.searchLike = '%' + searchTerm + '%';
        }
    } else {
        where += ` AND f.search_text LIKE :searchLike `;
        params.searchLike = '%' + searchTerm + '%';
    }
}

// --- sort + keyset -----------------------------------------------------------
// Svaki sort zavrsava sa f.id kao tie-breakerom. Bez njega dva proizvoda istog
// imena/cene menjaju medjusobni redosled izmedju strana i cursor preskace red.
let orderBy   = '';
let keysetSql = '';
let hasCursor = (lastId !== null && lastId !== '' && !isNaN(Number(lastId)));

if (hasCursor) { params.lastId = Number(lastId); }

if (sort === 'price') {
    // NULL cena ide na kraj. `(f.min_price IS NULL)` daje 0/1, pa 0 (ima cenu)
    // dolazi prvo.
    orderBy = ` ORDER BY (f.min_price IS NULL) ASC, f.min_price ASC, f.id ASC `;

    if (hasCursor) {
        if (lastValue === null || lastValue === '' || lastValue === 'null') {
            // vec smo u bloku bez cene -- ostaju samo redovi bez cene, po id
            keysetSql = ` AND f.min_price IS NULL AND f.id > :lastId `;
        } else {
            params.lastPrice = Number(lastValue);
            keysetSql = `
                AND (
                    f.min_price IS NULL
                    OR f.min_price > :lastPrice
                    OR (f.min_price = :lastPrice AND f.id > :lastId)
                )
            `;
        }
    }
} else if (sort === 'new') {
    orderBy = ` ORDER BY f.created_at DESC, f.id DESC `;

    if (hasCursor && lastValue) {
        params.lastCreatedAt = lastValue;
        keysetSql = `
            AND (
                f.created_at < :lastCreatedAt
                OR (f.created_at = :lastCreatedAt AND f.id < :lastId)
            )
        `;
    }
} else {
    // default: abecedno
    orderBy = ` ORDER BY f.name ASC, f.id ASC `;

    if (hasCursor && lastValue !== null && lastValue !== '') {
        params.lastName = lastValue;
        // Razvijen oblik umesto row-constructora `(f.name, f.id) > (...)`:
        // MySQL pre 8.0.14 ne optimizuje row poredjenje i pada na full scan.
        keysetSql = `
            AND (
                f.name > :lastName
                OR (f.name = :lastName AND f.id > :lastId)
            )
        `;
    }
}

// --- glavni upit -------------------------------------------------------------
// Eksplicitne kolone, nikad SELECT * -- to je jedini razlog zasto base64 ne boli.
let dataSql = `
    SELECT
        f.id,
        f.name,
        f.slug,
        f.min_price          AS minPrice,
        f.package_weight_g   AS packageWeightG,
        f.is_grain_free      AS isGrainFree,
        f.created_at         AS createdAt,
        b.id                 AS brandId,
        b.name               AS brandName,
        b.slug               AS brandSlug,
        b.logo_url           AS brandLogoUrl,
        ft.code              AS foodTypeCode,
        ft.name_sr           AS foodTypeNameSr,
        ft.name_en           AS foodTypeNameEn,
        ls.code              AS lifeStageCode,
        ls.name_sr           AS lifeStageNameSr,
        ls.name_en           AS lifeStageNameEn,
        bs.code              AS breedSizeCode,
        bs.name_sr           AS breedSizeNameSr,
        bs.name_en           AS breedSizeNameEn,
        img.thumbnail_base64 AS thumbnail,
        (SELECT COUNT(*) FROM dog_food_offer o
          WHERE o.dog_food_id = f.id AND o.is_in_stock = 1) AS offerCount
    FROM dog_food f
    INNER JOIN brand      b  ON b.id  = f.brand_id
    INNER JOIN food_type  ft ON ft.id = f.food_type_id
    INNER JOIN life_stage ls ON ls.id = f.life_stage_id
    INNER JOIN breed_size bs ON bs.id = f.breed_size_id
    LEFT  JOIN dog_food_image img
           ON img.dog_food_id = f.id AND img.is_primary = 1
    ${where}
    ${keysetSql}
    ${orderBy}
    LIMIT ${Number(limit) + 1}
`;

let rows = db.query(dataSql, params);

// LIMIT je namerno limit+1: visak reda je signal "ima jos", bez dodatnog
// COUNT upita po strani.
let hasMore = rows.length > limit;

// Rucno kopiranje umesto rows.slice(): db.query vraca array-like sa `.rows`,
// ne garantovano pravi Array, pa Array metode ne moraju da postoje.
let data = [];
for (let i = 0; i < rows.length && i < limit; i++) {
    data.push(rows[i]);
}

// --- total: samo prva strana -------------------------------------------------
let total = null;
if (!hasCursor) {
    let countSql = `
        SELECT COUNT(*) AS total_count
        FROM dog_food f
        INNER JOIN brand b ON b.id = f.brand_id
        ${where}
    `;
    let countRows = db.query(countSql, params);
    total = countRows[0] ? countRows[0].total_count : 0;
}

// --- cursor za sledecu stranu ------------------------------------------------
let cursor = null;
if (hasMore && data.length) {
    let last = data[data.length - 1];
    let cursorValue;

    if (sort === 'price')    { cursorValue = last.minPrice; }
    else if (sort === 'new') { cursorValue = last.createdAt; }
    else                     { cursorValue = last.name; }

    cursor = { lastId: last.id, lastValue: cursorValue, sort: sort };
}

// Prazna lista nije greska -- 404 na praznu pretragu (kao kod spots) tera
// frontend da hvata error za normalan ishod "nema rezultata".
write('data',   data);
write('total',  total);
write('cursor', cursor);
}
}
