module.exports = (MARSModules) => {
with (MARSModules) {



let showResult2 = `SELECT 
    pr_id,
    iuo_ime, 
    iuo_slika as iuo_slika_base64, 
    bas_naziv,
    iuo_link_web, 
    sta_ime, 
    ugo_ime, 
    ops_ime, 
    sta_id, 
    bas_id,
    ugo_id, 
    ops_id, 
    grd_ime,
    iuo_slika_unutra as iuo_slika_base64_unutra, 
    iuo_adressa,
    iuo_opis,
    iuo_telefon
    FROM 
    pr_info_obj  
LEFT JOIN 
    opstina USING(ops_id)
    LEFT JOIN 
    grad USING(grd_id)
LEFT JOIN 
    ugo_objekat USING(ugo_id)
LEFT JOIN 
    starost USING(sta_id)
LEFT JOIN 
    basta USING(bas_id)
LEFT JOIN 
    masa USING(mas_id)
WHERE 
    pr_prihvacen IS NULL 
    AND pr_odbijen IS NULL;`;

let seeReuslt2 = db.query(showResult2);

write("pending", seeReuslt2);

function require(paramName) {
    let s = `Parameter ${paramName} is required.`;
    // response.status(400);
    write('message', s);
    exit();
}

}
}