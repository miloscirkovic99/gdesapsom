module.exports = (MARSModules) => {
with (MARSModules) {
let par_ime = requireParam("par_ime");
let par_lokacija = requireParam("par_lokacija");
let ops_id = requireParam("ops_id");
let par_accepted=param("par_accepted");
let par_opis=param("par_opis");
// Insert statement
let sqlQuery = `
    INSERT INTO parkovi
    SET 
        par_ime = ?, 
        par_lokacija = ?, 
        ops_id = ?,
        par_accepted=?,
        par_opis=?
`;

write('sql', sqlQuery);

let executeInsert = db.query(sqlQuery, par_ime, par_lokacija, ops_id,par_accepted,par_opis);
write("message", "Uspešno ste dodali park");


function requireParam(paramName) {
    let paramValue = param(paramName);
    if (paramValue === undefined || paramValue === null) {
        let errorMessage = `Parameter ${paramName} is required.`;
        response.status(400);
        write('message', errorMessage);
        exit();
    }
    return paramValue;
}
}
}