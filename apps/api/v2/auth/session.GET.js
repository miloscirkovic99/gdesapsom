module.exports = (MARSModules) => {
with (MARSModules) {
var sessionUser=session('user');
if(sessionUser == null){
   response.status(403);
write('message', 'Not Authorized');
exit();
}



write("user", sessionUser);

}
}