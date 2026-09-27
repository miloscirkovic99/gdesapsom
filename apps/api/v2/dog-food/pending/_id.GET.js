module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// GET dog-food/pending/:id
//
// Jedan predlog, sa slikom. Ovo je jedini pending endpoint koji vraca
// image_base64 -- lista (pending.GET.js) ga namerno preskace.
//
// Pandan pet-friendly-spots/pending/_id.GET.js, samo bez `SELECT *`.
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

let sqlQuery = `
    SELECT
        p.id,
        p.name,
        p.brand_name       AS brandName,
        p.brand_id         AS brandId,
        p.food_type_id     AS foodTypeId,
        p.life_stage_id    AS lifeStageId,
        p.breed_size_id    AS breedSizeId,
        p.description,
        p.ingredients,
        p.package_weight_g AS packageWeightG,
        p.is_grain_free    AS isGrainFree,
        p.image_base64     AS imageBase64,
        p.shop_name        AS shopName,
        p.price,
        p.submitter_email  AS submitterEmail,
        p.is_approved      AS isApproved,
        p.is_declined      AS isDeclined,
        p.created_at       AS createdAt,
        p.updated_at       AS updatedAt,
        ft.code            AS foodTypeCode,
        ft.name_sr         AS foodTypeNameSr,
        ls.code            AS lifeStageCode,
        ls.name_sr         AS lifeStageNameSr,
        bs.code            AS breedSizeCode,
        bs.name_sr         AS breedSizeNameSr,
        b.name             AS matchedBrandName,
        b.slug             AS matchedBrandSlug
    FROM pending_dog_food p
    LEFT JOIN food_type  ft ON ft.id = p.food_type_id
    LEFT JOIN life_stage ls ON ls.id = p.life_stage_id
    LEFT JOIN breed_size bs ON bs.id = p.breed_size_id
    LEFT JOIN brand      b  ON b.id  = p.brand_id
    WHERE p.id = ?
`;

let rows = db.query(sqlQuery, id);

if (!rows || rows.length === 0) {
    response.status(404);
    write('message', `Predlog sa id ${id} ne postoji.`);
    exit();
}

let pending = rows[0];

// --- pomoc admin formi: pogodi brend iz slobodnog teksta ---------------------
// Korisnik kuca "royal canin", baza ima "Royal Canin". Ako predlog nema
// brand_id, ponudi kandidata umesto da admin rucno pretrazuje dropdown.
//
// Red iz baze je Mars `IRow` i ne prima nove kolone, pa predlozi idu kao
// zaseban kljuc pored `data`, ne kao `pending.brandSuggestions`.
let brandSuggestions = [];

if (!pending.brandId && pending.brandName) {
    brandSuggestions = db.query(`
        SELECT id, name, slug FROM brand
        WHERE is_active = 1 AND name LIKE ?
        ORDER BY CHAR_LENGTH(name)
        LIMIT 3
    `, '%' + pending.brandName + '%');
}

write('data', pending);
write('brandSuggestions', brandSuggestions);
}
}
