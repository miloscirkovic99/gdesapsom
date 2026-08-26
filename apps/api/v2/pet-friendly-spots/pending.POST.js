module.exports = (MARSModules) => {
with (MARSModules) {
let iuo_ime = param("iuo_ime", require);
let iuo_adressa = param("iuo_adressa", require);
let iuo_link_web = param("iuo_link_web", require);
let iuo_slika = param("iuo_slika", require);
let iuo_slika_unutra=param("iuo_slika_unutra", null);
let ops_id = param("ops_id", require);
let ugo_id = param("ugo_id", require); 
let sta_id = param("sta_id", require);
let bas_id = param("bas_id", require);
let iuo_opis = param("iuo_opis");
let iuo_telefon=param("iuo_telefon");

let insertPr = `insert into pr_info_obj set iuo_ime = ?, iuo_adressa = ?,
               iuo_link_web = ?, iuo_slika = ?,iuo_slika_unutra=?, ops_id= ?
               , ugo_id= ?, sta_id= ? , bas_id= ? , iuo_opis = ?, iuo_telefon=?`;

let savePr = db.query(insertPr, iuo_ime,iuo_adressa,iuo_link_web,iuo_slika, iuo_slika_unutra,ops_id,ugo_id,sta_id,bas_id,iuo_opis,iuo_telefon);
write("message", "Uspešno ste predložili kafić");

function require(paramName){
    let s = `Parameter ${paramName} is required.`;
    response.status(400);
    write('message', s);
    exit();
}
}
}