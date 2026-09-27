module.exports = (MARSModules) => {
with (MARSModules) {
let sessionUser = session('user');
if (!sessionUser) {
    response.status(401);
    write('message', 'You are not logged in');
    exit();
}
 
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

// Required parameters
let iuo_ime = requireParam("iuo_ime");
let iuo_adressa = requireParam("iuo_adressa");
let iuo_link_web = requireParam("iuo_link_web");
let ops_id = requireParam("ops_id");
let ugo_id = requireParam("ugo_id");
let sta_id = requireParam("sta_id");
let bas_id = requireParam("bas_id");

// Optional parameters
let iuo_slika = param("iuo_slika_base64", null);
let iuo_slika_unutra = param("iuo_slika_base64_unutra", null);
let iuo_opis = param("iuo_opis", null);
let iuo_telefon = param("iuo_telefon");
let pr_id = param("pr_id", null);

// Insert statement
let insertPr = `
    INSERT INTO info_ug_obj
    SET 
        iuo_ime = ?, 
        iuo_adressa = ?, 
        iuo_link_web = ?, 
        iuo_slika_base64 = ?, 
        iuo_slika_base64_unutra = ?, 
        ops_id = ?, 
        ugo_id = ?, 
        sta_id = ?, 
        bas_id = ?, 
        iuo_opis = ?, 
        iuo_telefon = ?
`;

let savePr = db.query(insertPr, 
    iuo_ime, 
    iuo_adressa, 
    iuo_link_web, 
    iuo_slika, 
    iuo_slika_unutra, 
    ops_id, 
    ugo_id, 
    sta_id, 
    bas_id, 
    iuo_opis, 
    iuo_telefon
);

write("message", "Uspesno ste dodali kafic");

// Update pr_info_obj if pr_id exists
if (pr_id) {
    let updatePr = `UPDATE pr_info_obj SET pr_prihvacen = 1 WHERE pr_id = ?`;
    let executeUpdate = db.query(updatePr, pr_id);
    write("dodat", executeUpdate);
}

}
}