module.exports = (MARSModules) => {
with (MARSModules) {

// Base query
let vetClinicsQuery = "SELECT * FROM vetclinics WHERE vetc_isdeleted IS NULL";
// Base query for total count
let countQuery = `
    SELECT COUNT(vetc_id) AS total_count
    FROM vetclinics
    WHERE vetc_isdeleted IS NULL
`;


let q = db.query(vetClinicsQuery);
// Get the total count
let countResults = db.query(countQuery);
let totalCount = countResults[0]?.total_count || 0;
// Handle results properly
if (q.length > 0) {
    write("veterinary_clinics", q);
        write("total", totalCount);

} else {
    response.status(404);
    write("message", "Nažalost, u našoj bazi ne postoji veterinarska stanica koju ste pretražili.");
    exit();
}

}
}