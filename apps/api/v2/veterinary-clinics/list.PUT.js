module.exports = (MARSModules) => {
with (MARSModules) {
let limit = param("limit");
let offset = param("offset");
let word = param("word");
let grd_id = param("grd_id");
let ops_id = param("ops_id");

// Debug output
let ops = ops_id?.split(',');
const numberArray = ops?.map(str => Number(str));
const opsIdsString = numberArray?.join(',');
// Base query
let vetClinicsQuery = "SELECT * FROM vetclinics WHERE vetc_isdeleted IS NULL";
// Base query for total count
let countQuery = `
    SELECT COUNT(vetc_id) AS total_count
    FROM vetclinics
    WHERE vetc_isdeleted IS NULL
`;

const queryParams = {};




// Add filters if provided
if (opsIdsString) {
    vetClinicsQuery += ` AND ops_id IN (${opsIdsString})`;
    countQuery += ` AND ops_id IN (${opsIdsString})`;
}
// Add filters if provided
if (grd_id) {
    vetClinicsQuery += ` AND grd_id=?`
    countQuery += ` AND grd_id=?`;
}
// // Add filtering condition only if word is provided
if (word ) {
   vetClinicsQuery += ` AND (vetc_naziv LIKE :word)`;
    countQuery += ` AND (vetc_naziv LIKE :word)`;
}

// Add wildcards for the LIKE operator
const formattedWord = word ? `%${word}%` : null;

// Ensure limit and offset are valid numbers before adding
if (!isNaN(limit) && !isNaN(offset) && limit !== "" && offset !== "") {
    vetClinicsQuery += ` LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
}




let params = { grd_id, word: formattedWord };
let q = db.query(vetClinicsQuery,params);

// Handle results properly
if (q.length > 0) {
    write("veterinary_clinics", q);
} else {
    response.status(404);
    write("message", "Nažalost, u našoj bazi ne postoji veterinarska stanica koju ste pretražili.");
    exit();
}

}
}