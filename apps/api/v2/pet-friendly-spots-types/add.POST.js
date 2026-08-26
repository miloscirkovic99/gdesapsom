module.exports = (MARSModules) => {
with (MARSModules) {
let sessionUser=session('user');
if(!sessionUser){
    // response.status(401);
write('message', 'You are not logged in');
exit();
}

let ugo_ime=param("ugo_ime",null);

let addUgo=`insert into ugo_objekat set ugo_ime=?`;
let finUgo=db.query(addUgo, ugo_ime);
write("success", "Uspešno kreiran objekat");
}
}