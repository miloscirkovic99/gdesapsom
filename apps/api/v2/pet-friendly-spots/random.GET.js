module.exports = (MARSModules) => {
with (MARSModules) {


//random 3 kafica pocetna strana
let randomSpots = `SELECT
   iuo_id,iuo_ime, 
   iuo_link_web,
   iuo_slika_base64,
   iuo_slika_base64_unutra,
   iuo_adressa,
   ops_ime,
   bas_naziv,
   sta_ime,
   ugo_ime, 
   grd_ime,
   iuo_telefon
                
         FROM info_ug_obj
         inner join opstina using(ops_id)
         inner join ugo_objekat using(ugo_id)
         inner join starost using(sta_id)
         inner join basta using(bas_id)
         inner join grad using(grd_id)
         where iuo_obrisan is null and iuo_slika_base64 is not null and iuo_slika_base64_unutra is not null
         ORDER BY RAND() 
         limit 6
         `;

let showSpots = db.query(randomSpots); 
write("randomSpots", showSpots);





}
}