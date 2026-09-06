module.exports = (MARSModules) => {
with (MARSModules) {
// =============================================================================
// GET dog-food/brands
//
// SVI aktivni brendovi, za admin formu proizvoda. Razlika u odnosu na
// dog-food/lookups: lookups vraca samo brendove koji imaju bar jedan aktivan
// proizvod (to je filter kataloga), pa se tek napravljen brend bez proizvoda
// tamo ne vidi -- a admin mora da ga izabere da bi mu dodao prvi proizvod.
//
// ?includeInactive=1 (samo sesija) vraca i ugasene brendove.
// =============================================================================

let includeInactive = param('includeInactive', null);
let showAll = (includeInactive === '1' || includeInactive === 1 || includeInactive === true)
    && !!session('user');

let sqlQuery = `
    SELECT
        b.id,
        b.name,
        b.slug,
        b.logo_url    AS logoUrl,
        b.website_url AS websiteUrl,
        b.is_active   AS isActive,
        (SELECT COUNT(*) FROM dog_food f WHERE f.brand_id = b.id) AS productCount
    FROM brand b
    ${showAll ? '' : 'WHERE b.is_active = 1'}
    ORDER BY b.name, b.id
`;

let data = db.query(sqlQuery);

write('data',  data);
write('total', data ? data.length : 0);
}
}
