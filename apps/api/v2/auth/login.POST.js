module.exports = (MARSModules) => {
with (MARSModules) {
let password = param('password', require);
let email = param('email', require);
 
// da li korisnik postoji u bazi sa istim email-om
let sql = `select * from korisnik where kor_email = ? `;

let dbUserQ = db.query(sql, email);
 
// ako ne postoji, izbaci
if (dbUserQ.rows === 0) {
    write('message', 'User email or password is bad');
    exit();
}

let admin=false; 

for(let i=0; i<dbUserQ.rows; i++){
    if(dbUserQ[i].kor_admin===1){
        admin=true;
    }   
}

let dbUser = dbUserQ[0];

let passIsOk = bcrypt(password, dbUser.kor_password);

// ako je losa sifra, izbaci
if (!passIsOk) {
    response.status(401);
    write('message', 'Email or password is bad');
    exit();
}
if(email == null || password==null){
write("message", "Missing parameter");
response.status(400);
exit();
}

// kreiramo sesiju
let sid = session();
write('sid', sid);

let sessionUser = {
    kor_email: dbUser.kor_email,
    kor_admin:admin
};

// upisujemo nesto u sesiju, da bi kasnije proverili da li ta sesija postoji
session('user', sessionUser);

function require(paramName){
    let s = `Parameter ${paramName} is required.`;
    response.status(400);
    write('message', s);
    exit();
}
}
}