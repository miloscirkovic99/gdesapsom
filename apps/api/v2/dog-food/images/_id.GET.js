module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// GET dog-food/images/:id
//
// Servira JEDNU punu sliku, po ugledu na
// pet-friendly-spots/search-query/_id/avatar.GET.js.
//
// Ovo je izlaz za slucaj kad detalj strana ne zeli da ceka ceo
// dog-food/all/:slug odgovor sa svim slikama u JSON-u: galerija ucita prvu
// sliku iz odgovora, a ostale lazy preko ovog endpointa (jedan zahtev po
// slici, browser ih paralelizuje i kesira zasebno).
//
// ?variant=thumbnail vrati thumbnail umesto pune slike.
// =============================================================================

let id      = param('id', null);
let variant = param('variant', 'full');

if (id === null || id === '') {
    response.status(400);
    write('message', 'Parameter id is required.');
    exit();
}

// Slika se servira samo za aktivan proizvod -- inace bi meko obrisan proizvod
// i dalje curio kroz direktan link na sliku.
let imageSql = `
    SELECT i.image_base64, i.thumbnail_base64
    FROM dog_food_image i
    INNER JOIN dog_food f ON f.id = i.dog_food_id AND f.is_active = 1
    WHERE i.id = ?
`;

let rows = db.query(imageSql, id);

if (!rows || rows.length === 0) {
    response.status(404);
    write('message', 'Slika ne postoji.');
    exit();
}

let row = rows[0];

let payload = (variant === 'thumbnail')
    ? (row.thumbnail_base64 || row.image_base64)
    : row.image_base64;

if (!payload) {
    response.status(404);
    write('message', 'Slika ne postoji.');
    exit();
}

// Slike su immutable: nova slika dobija nov id, pa sadrzaj iza datog id-ja
// nikad ne mutira i sme da se kesira agresivno.
// response.setCache('1Y');   // odkomentarisati kad se potvrdi u Mars instanci

write(payload);
}
}
