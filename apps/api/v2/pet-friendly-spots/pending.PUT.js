module.exports = (MARSModules) => {
with (MARSModules) {
let sessionUser=session('user');
if(!sessionUser){
    response.status(401);
write('message', 'Not Authorized');
exit();
}

let pr_id=param("pr_id",require);
let declinePendingSpot=`UPDATE pr_info_obj SET pr_odbijen=1 WHERE pr_id=?`;

let executeDelete=db.query(declinePendingSpot, pr_id);

write("delete", "Uspešno odbijen objekat");


function require(paramName) {
    let s = `Parameter ${paramName} is required.`;
    response.status(400);
    write('message', s);
    exit();
}
}
}