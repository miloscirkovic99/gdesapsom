module.exports = (MARSModules) => {
with (MARSModules) {
let par_accepted = param("par_accepted");
let par_declined= param("par_declined");
let par_id = param("par_id",null);

let sqlQuery =
`
 UPDATE parkovi
SET 
par_accepted = ?,
par_declined = ?
WHERE par_id=?;
`

let executeQuery=db.query(sqlQuery,par_accepted,par_declined,par_id);
write('success','Query succesfully executer')
}
}