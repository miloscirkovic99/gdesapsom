module.exports = (MARSModules) => {
with (MARSModules) {
// Retrieve the filters
let ops_id = param("ops_id");
let grd_id = param("grd_id");
let limit = param("limit");
let offset = param("offset");
let word = param("word");

let q = ops_id?.split(',');
const numberArray = q?.map(str => Number(str));
const opsIdsString = numberArray?.join(',');

// Base SQL queries
let sqlQuery = `
   SELECT 
    grd.grd_ime,
    grd.grd_id,
    vet.vetc_id,
    vet.vetc_naziv,
    vet.vetc_telefon,
    vet.vetc_adresa,
    ops.ops_id,
        ops.ops_ime
FROM vetclinics AS vet
INNER JOIN grad grd ON vet.grd_id = grd.grd_id
LEFT JOIN opstina ops ON vet.ops_id = ops.ops_id AND vet.grd_id = ops.grd_id
WHERE vet.vetc_isdeleted IS NULL

`;

let countQuery = `
    SELECT COUNT(vet.vetc_id) AS total_count
    FROM vetclinics AS vet
    WHERE vet.vetc_isdeleted IS NULL
`;
let countTotalQuery = `
    SELECT COUNT(vet.vetc_id) AS total_count
    FROM vetclinics AS vet
    WHERE vet.vetc_isdeleted IS NULL
`;




// Add filters if provided
if (opsIdsString) {
    sqlQuery += ` AND vet.ops_id IN (${opsIdsString})`;
    countQuery += ` AND vet.ops_id IN (${opsIdsString})`;
}

if (grd_id) {
    sqlQuery += ` AND vet.grd_id = :grd_id`;
    countQuery += ` AND vet.grd_id = :grd_id`;
}


if (word) {
    sqlQuery += ` AND (vet.vetc_naziv LIKE :word)`;
    countQuery += ` AND (vet.vetc_naziv LIKE :word)`;
}
sqlQuery += ` ORDER BY vet.vetc_naziv ASC`;
// Add wildcards for the LIKE operator
const formattedWord = word ? `%${word}%` : null;
// **Fix for LIMIT & OFFSET**
if (limit && offset !== undefined) {
    sqlQuery += ` LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
}

// Execute queries
let params = { grd_id, word: formattedWord };
// Get the total count
let countResults = db.query(countQuery, params);
let totalCount = countResults[0]?.total_count || 0;


// Get the total count
let countTotalResults = db.query(countTotalQuery);
let totalCountResult = countTotalResults[0]?.total_count || 0;
// Check if offset is greater than the total count
if (offset >= totalCount) {
    response.status(404);
    write("message", "Nažalost nismo pronašli vetrinarska stanica u skladu sa vašim pretragama.");
    exit();
}

// Proceed with the data query if offset is valid
let dataResults = db.query(sqlQuery, params);

// Handle results
if (dataResults?.length > 0) {
    write("vetClinics", dataResults);
    write("totalResults", totalCount); // Total count
    write("totalCount", totalCountResult);
} else {
    response.status(404);
    write("message", "Nažalost u našoj bazi ne postoji vetrinarska stanica koji ste pretražili");
    exit();
}
}
}