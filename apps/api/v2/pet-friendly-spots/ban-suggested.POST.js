module.exports = (MARSModules) => {
with (MARSModules) {
let sessionUser=session('user');
if(!sessionUser){
    // response.status(401);
write('message', 'You are not logged in');
exit();
}

let pr_id=param("pr_id",require);
let deleteSav=`UPDATE pr_info_obj SET pr_odbijen=1 WHERE pr_id=?`;

let executeDelete=db.query(deleteSav, pr_id);

write("delete", "Odbili ste predlog");


function require(paramName) {
    let s = `Parameter ${paramName} is required.`;
    response.status(400);
    write('message', s);
    exit();
}
}
}