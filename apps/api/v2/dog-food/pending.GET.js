module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// GET dog-food/pending
//
// Moderaciona lista. Samo prijavljeni korisnik -- pandan
// pet-friendly-spots/pending.GET.js.
//
// NE selektuje image_base64. Predlozi nose punu, neskaliranu korisnicku sliku,
// pa bi red u ovoj listi bio i tezi od kataloskog. Admin tabela prikazuje samo
// `hasImage` znacicu; sama slika se dovlaci tek na otvaranje jednog predloga
// (pending/_id.GET.js).
// =============================================================================

let sessionUser = session('user');
if (!sessionUser) {
    response.status(401);
    write('message', 'Not Authorized');
    exit();
}

let status = param('status', 'new');   // 'new' | 'approved' | 'declined' | 'all'
let limit  = Number(param('limit', 50));
let offset = Number(param('offset', 0));

if (!limit || limit < 1) { limit = 50; }
if (limit > 200)         { limit = 200; }
if (!offset || offset < 0) { offset = 0; }

let where = ' WHERE 1 = 1 ';

if (status === 'new') {
    where += ' AND p.is_approved = 0 AND p.is_declined = 0 ';
} else if (status === 'approved') {
    where += ' AND p.is_approved = 1 ';
} else if (status === 'declined') {
    where += ' AND p.is_declined = 1 ';
}
// status === 'all' -> bez dodatnog filtera

// `image_base64 IS NOT NULL` umesto same kolone: admin vidi da li slika
// postoji, bez placanja megabajta po redu.
let listSql = `
    SELECT
        p.id,
        p.name,
        p.brand_name        AS brandName,
        p.brand_id          AS brandId,
        p.food_type_id      AS foodTypeId,
        p.life_stage_id     AS lifeStageId,
        p.breed_size_id     AS breedSizeId,
        p.description,
        p.ingredients,
        p.package_weight_g  AS packageWeightG,
        p.is_grain_free     AS isGrainFree,
        p.shop_name         AS shopName,
        p.price,
        p.submitter_email   AS submitterEmail,
        p.is_approved       AS isApproved,
        p.is_declined       AS isDeclined,
        p.created_at        AS createdAt,
        (p.image_base64 IS NOT NULL) AS hasImage,
        ft.name_sr          AS foodTypeNameSr,
        ls.name_sr          AS lifeStageNameSr,
        bs.name_sr          AS breedSizeNameSr,
        b.name              AS matchedBrandName
    FROM pending_dog_food p
    LEFT JOIN food_type  ft ON ft.id = p.food_type_id
    LEFT JOIN life_stage ls ON ls.id = p.life_stage_id
    LEFT JOIN breed_size bs ON bs.id = p.breed_size_id
    LEFT JOIN brand      b  ON b.id  = p.brand_id
    ${where}
    ORDER BY p.created_at ASC, p.id ASC
    LIMIT ${Number(limit)} OFFSET ${Number(offset)}
`;

let data = db.query(listSql);

let countRows = db.query(`
    SELECT COUNT(*) AS total_count FROM pending_dog_food p ${where}
`);

// Brojac za badge u admin navigaciji -- uvek "novi", nezavisno od filtera.
let newRows = db.query(`
    SELECT COUNT(*) AS new_count
    FROM pending_dog_food
    WHERE is_approved = 0 AND is_declined = 0
`);

write('data',     data);
write('total',    countRows[0] ? countRows[0].total_count : 0);
write('newCount', newRows[0] ? newRows[0].new_count : 0);
}
}
