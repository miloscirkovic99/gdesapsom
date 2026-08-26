module.exports = (MARSModules) => {
with (MARSModules) {
let sessionUser=session('user');
if(!sessionUser){
    response.status(401);
write('message', 'Not Authorized');
exit();
}

let iuo_id=param("iuo_id",require);
let deleteSav=`UPDATE info_ug_obj SET iuo_obrisan=1 WHERE iuo_id=?`;

let executeDelete=db.query(deleteSav, iuo_id);

write("delete", "Uspešno obrisan objekat");


function require(paramName) {
    let s = `Parameter ${paramName} is required.`;
    response.status(400);
    write('message', s);
    exit();
}
}
}