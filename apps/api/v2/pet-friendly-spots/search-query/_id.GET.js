module.exports = (MARSModules) => {
with (MARSModules) {
let pr_id=param('pr_id',null);

let sql=`SELECT * FROM info_ug_obj where pr_id=?`;
let see=db.query(sql,pr_id);

write('id', see);
}
}