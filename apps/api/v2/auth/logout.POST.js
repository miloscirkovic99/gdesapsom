module.exports = (MARSModules) => {
with (MARSModules) {
let sessionUser = session('user');
// if (!sessionUser) {
//     write('message', 'You are not logged in.');
//     exit();
// }
write("sess", sessionUser);

session.close();
write('message', 'Logout success.');
}
}