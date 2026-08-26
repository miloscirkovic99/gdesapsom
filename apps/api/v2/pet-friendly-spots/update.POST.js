module.exports = (MARSModules) => {
with (MARSModules) {
let sessionUser=session('user');
if(!sessionUser){
    // response.status(401);
write('message', 'You are not logged in');
exit();
}

let iuo_ime=param("iuo_ime", null);
let iuo_adressa=param("iuo_adressa", null);
let iuo_opis=param("iuo_opis", null);
let iuo_link_web=param("iuo_link_web", null);
let iuo_slika=param("iuo_slika", null);
let iuo_slika_base64_unutra=param("iuo_slika_base64_unutra",null);
let iuo_slika_base64=param("iuo_slika_base64",null);
let bas_id=param("bas_id", null);
let ugo_id=param("ugo_id", null);
let sta_id=param("sta_id",null);
let ops_id=param("ops_id",null);
let iuo_izmenjeno=param('iuo_izmenjeno',null);
let iuo_id=param("iuo_id",require);
let iuo_slika_unutra=param("iuo_slika_unutra",null);
let iuo_telefon=param("iuo_telefon",null);

let allParams = param();
let sqlUpdateParams = ''; 

let updateParams = {
iuo_ime: iuo_ime,
iuo_adressa: iuo_adressa,
iuo_opis: iuo_opis,
iuo_telefon:iuo_telefon,
iuo_link_web: iuo_link_web,
iuo_slika: iuo_slika,
iuo_slika_base64:iuo_slika_base64,
iuo_slika_base64_unutra:iuo_slika_base64_unutra,
iuo_slika_unutra:iuo_slika_unutra,
bas_id: bas_id,
ugo_id: ugo_id,
sta_id: sta_id,
ops_id: ops_id,
iuo_id: iuo_id,
iuo_izmenjeno: new DateTime
};

function arrayHas(arr, el) {
for (let i = 0; i < arr.length; i++) {
if (arr[i] === el) {
return true;
}
}
return false;
}

if (arrayHas(allParams, 'iuo_ime')) {
    sqlUpdateParams += ` iuo_ime = :iuo_ime, `;
}
if (arrayHas(allParams, 'iuo_adressa')) {
    sqlUpdateParams += ` iuo_adressa = :iuo_adressa, `;
}
if (arrayHas(allParams, 'iuo_opis')) {
    sqlUpdateParams += ` iuo_opis = :iuo_opis, `;
}
if (arrayHas(allParams, 'iuo_telefon')) {
    sqlUpdateParams += ` iuo_telefon = :iuo_telefon, `;
}
if (arrayHas(allParams, 'iuo_link_web')) {
    sqlUpdateParams += ` iuo_link_web = :iuo_link_web, `;
}
if (arrayHas(allParams, 'iuo_slika') ) {
    sqlUpdateParams += ` iuo_slika_base64 = :iuo_slika, `;
}
if (arrayHas(allParams, 'iuo_slika_unutra')) {
    sqlUpdateParams += ` iuo_slika_base64_unutra = :iuo_slika_unutra, `;
}
if (arrayHas(allParams, 'bas_id')) {
    sqlUpdateParams += ` bas_id = :bas_id, `;
}
if (arrayHas(allParams, 'ugo_id')) {
    sqlUpdateParams += ` ugo_id = :ugo_id, `;
}
if (arrayHas(allParams, 'sta_id')) {
    sqlUpdateParams += ` sta_id = :sta_id, `;
}
if (arrayHas(allParams, 'ops_id')) {
    sqlUpdateParams += ` ops_id = :ops_id, `;
}
if (arrayHas(allParams, 'iuo_id')) {
    sqlUpdateParams += ` iuo_id = :iuo_id, `;
}

let updateSql = `update info_ug_obj  set ${sqlUpdateParams} iuo_izmenjeno = :iuo_izmenjeno where iuo_id = :iuo_id`;
let updateQuery = db.query(updateSql, updateParams);

write("message", "Uspešno izmenjen kafic")
write("caff", sqlUpdateParams)




function require(paramName) {
    let s = `Parameter ${paramName} is required.`;
    response.status(400);
    write('message', s);
    exit();
}


}
}