-- =============================================================================
-- 09_seed_lodging_new_places.sql  --  nova mesta + pet-friendly smestaj u njima
--
-- Druga tura spiska konkurentskog sajta (BringFido, 2026-11-02), deo cija
-- mesta jos nemaju red u `grad`/`opstina`. Spisak je posluzio samo kao lista
-- kandidata: nijedan njegov podatak nije prepisan. Svaki red je proveren
-- 2026-11-02 na sajtu objekta, Booking-u (kroz isecke pretrage i sajtove koji
-- prenose njegove oglase), Trip.com-u, Expedia grupi, check24 i OSM-u; izvor
-- stoji iznad reda. Opisi su pisani iznova. Prva tura (mesta koja vec
-- postoje) je u 08.
--
-- BringFido pise "any size" i kad objekat ne navodi granicu (Kraljevi konaci
-- i Queen of Zlatibor imaju granicu od 15 kg, a on kaze "any size"), pa nijedan
-- red ovde nema sta_id 3 bez potvrde od samog objekta.
--
-- Ispravke mesta u odnosu na spisak:
--   Urban House je u Adi (Kosut Lajosa 43, 24430), ne u Padeju.
--   Stojkovic (ne "Stojkovi") je u selu Boboviste, opstina Aleksinac.
--   "B&B Izvor" je Nacionalna kuca Izvor, Kosjeric (isti telefon i adresa).
--   Hotel Hedonic je u Vrcinu, opstina Grocka (Beograd), ne u gradu.
--   Hotel Nais (Vrtiste, Nis) je u 08, jer opstina Crveni Krst vec postoji.
--
-- Izostavljeni (na cekanju, svaki se resava jednim pozivom):
--   Konaciste Mali Izvor (Boljevac) -- samo ikonica "ljubimci" na agregatoru,
--     nema adrese ni koordinata.
--   Vila Viktori (Berilovac, Pirot) -- jedini dokaz je Kayak oznaka iz isecka
--     pretrage; 064/227-4509.
--   Etno selo Suncana Reka (Banja Koviljaca) -- sajt i cenovnik ne pominju
--     ljubimce; +381 69 2822 250.
--   CENTRAL Stars Apartments (Vrnjacka Banja) -- "pets allowed" na dva
--     agregatora, ali nigde adresa, telefon ni sajt.
--   Gradovi Boljevac, Pirot, Loznica i Vrnjacka Banja se zato NE prave.
--
-- PRE pokretanja:
--   1. SHOW COLUMNS FROM grad;  SHOW COLUMNS FROM opstina;
--      Skripta upisuje samo grd_ime + drz_id i ops_ime + grd_id. Ako postoji
--      jos neka NOT NULL kolona bez podrazumevane vrednosti, dodaj je u INSERT.
--   2. SELECT ops_id, ops_ime, grd_id FROM opstina WHERE ops_id IN (1, 48);
--      API vraca "Vracar, Beograd", ali ocekujem da je u koloni samo "Vracar"
--      (handler spaja ime grada). Ako kolona sadrzi i ", Beograd", dopisi grad
--      u imena opstina ispod.
--   3. Napravi backup. Nema down skripte.
--
-- Idempotentno: gradovi, opstine i objekti se preskacu ako ime vec postoji.
-- Objekat se upisuje samo ako njegova opstina postoji (JOIN), pa nijedan red
-- ne moze dobiti NULL ops_id.
--
-- Lookup ID-evi:
--   ugo_id  4 Hotel, 8 Apartman (B&B, vila, pansion i seosko domacinstvo
--           idu kao Apartman, kao Backcountry B&B i Kod Cvela)
--   sta_id  1 Mali pas | 2 Mali pas i stenci vecih rasa do 5 meseci | 3 Svi psi
--   bas_id  1 sa bastom | 2 bez baste
-- Pravila su ista kao u 06: sta_id 1 kad granica nije navedena (opis kaze da
-- se proveri); bas_id 1 kad gost moze napolje sa ljubimcem u okviru objekta.
--
-- Slike: NULL (vidi 06). `location` se ne upisuje; opcioni UPDATE je na dnu.
--
-- POSLE pokretanja: `yarn generate-sitemap` pa release build.
-- =============================================================================

SET NAMES utf8mb4;


-- =============================================================================
-- GRADOVI I OPSTINE
-- Turisticka mesta dobijaju svoj grad (kao Kopaonik, Zlatibor, Divcibare);
-- sela idu kao opstina grada kome pripadaju (kao Kac i Kovilj pod Novim
-- Sadom). Grocka je gradska opstina Beograda koja je nedostajala.
-- =============================================================================

INSERT INTO grad (grd_ime, drz_id)
SELECT v.ime, 1
FROM (
            SELECT 'Vrdnik' AS ime
  UNION ALL SELECT 'Irig'
  UNION ALL SELECT 'Sremski Karlovci'
  UNION ALL SELECT 'Sremska Mitrovica'
  UNION ALL SELECT 'Zrenjanin'
  UNION ALL SELECT 'Ada'
  UNION ALL SELECT 'Vršac'
  UNION ALL SELECT 'Aleksinac'
  UNION ALL SELECT 'Kosjerić'
) v
WHERE NOT EXISTS (SELECT 1 FROM grad g WHERE g.grd_ime = v.ime);

INSERT INTO opstina (ops_ime, grd_id)
SELECT v.ops, g.grd_id
FROM (
            SELECT 'Grocka' AS ops, 'Beograd' AS grad
  UNION ALL SELECT 'Vrdnik', 'Vrdnik'
  UNION ALL SELECT 'Irig', 'Irig'
  UNION ALL SELECT 'Sremski Karlovci', 'Sremski Karlovci'
  UNION ALL SELECT 'Sremska Mitrovica', 'Sremska Mitrovica'
  UNION ALL SELECT 'Ležimir', 'Sremska Mitrovica'
  UNION ALL SELECT 'Ečka', 'Zrenjanin'
  UNION ALL SELECT 'Ada', 'Ada'
  UNION ALL SELECT 'Vršac', 'Vršac'
  UNION ALL SELECT 'Bobovište', 'Aleksinac'
  UNION ALL SELECT 'Kosjerić', 'Kosjerić'
) v
JOIN grad g ON g.grd_ime = v.grad
WHERE NOT EXISTS (
  SELECT 1 FROM opstina o WHERE o.ops_ime = v.ops AND o.grd_id = g.grd_id
);


-- =============================================================================
-- BEOGRAD (Grocka)
-- =============================================================================

-- --- Hotel Hedonic -------------------------------------------------------------
-- Izvor: Hotels.com i HRS/hotel.info (ljubimci dozvoljeni, 10 EUR po ljubimcu
-- po noci, "pets in smoking rooms only"). Sajt hotela ne postoji (hedonic.rs je
-- prazan). Basta i terasa: Hotels.com. Telefon: samo Kayak.
-- Opstina Grocka (Nominatim reverse), ~95 m od granice sa Vozdovcem (autoput).
-- Koordinate: OSM way 1138011621 (zgrada na adresi, bez imena).

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Hotel Hedonic',
  'Autoput za Niš 13, 11224 Vrčin',
  'https://www.hrs.com/en/hotel/686630',
  '+381 11 3463220',
  'Hotel Hedonic je na autoputu Beograd–Niš kod Vrčina, dvadesetak kilometara od centra Beograda, pa je zgodan za noćenje usput. Prema portalima za rezervaciju ljubimci su dozvoljeni samo u sobama za pušače, uz doplatu od 10 € po ljubimcu po noćenju. Ograničenje veličine nije navedeno, pa većeg psa najavite unapred.',
  o.ops_id, 4, 1, 1, 44.705587, 20.573680
FROM opstina o JOIN grad g ON g.grd_id = o.grd_id
WHERE o.ops_ime = 'Grocka' AND g.grd_ime = 'Beograd'
  AND NOT EXISTS (
    SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Hotel Hedonic' AND iuo_obrisan IS NULL
  );


-- =============================================================================
-- FRUSKA GORA I SREM
-- =============================================================================

-- --- Etno selo Vrdnicka kula ---------------------------------------------------
-- Izvor: check24 ("Haustiere erlaubt (auf Anfrage)"), Booking isecak ("Pets are
-- allowed on request. Charges may be applicable."). Doplata se ne slaze:
-- Expedia 25 EUR za ciscenje, Hotels.com besplatno. Sajt objekta ne pominje
-- ljubimce. Opstina Irig, ali grad je Vrdnik (banja, poznato mesto).
-- Koordinate: OSM way 767517090.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Etno selo Vrdnička kula',
  'Staza zdravlja 34, 22408 Vrdnik',
  'https://www.etnoselo-vk.rs/',
  '+381 22 2155271',
  'Etno selo Vrdnička kula ima sobe, etno apartmane i bungalove u Vrdniku, na ivici Nacionalnog parka Fruška gora. Ljubimci su dozvoljeni na upit. Portali za rezervaciju se ne slažu oko doplate (od besplatno do 25 € za čišćenje), a ograničenje veličine nije navedeno, pa uslove dogovorite sa recepcijom.',
  o.ops_id, 4, 1, 2, 45.142850, 19.780537
FROM opstina o JOIN grad g ON g.grd_id = o.grd_id
WHERE o.ops_ime = 'Vrdnik' AND g.grd_ime = 'Vrdnik'
  AND NOT EXISTS (
    SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Etno selo Vrdnička kula' AND iuo_obrisan IS NULL
  );

-- --- Milin lagum ---------------------------------------------------------------
-- Izvor: Booking (kroz bedandbreakfast.eu: "Pets are allowed on request";
-- isecak: bez doplate), Hotels.com ("pets stay free"). Basta, terasa za
-- suncanje. Nema svoj sajt ni pouzdan telefon. Koordinate: OSM way 1106580617
-- (zgrada Ribarski trg 16; poklapa se sa pinom oglasa).

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Milin lagum',
  'Ribarski trg 16, 22406 Irig',
  'https://www.booking.com/hotel/rs/milin-lagum.html',
  NULL,
  'Milin lagum je pansion sa restoranom u centru Iriga, na putu Novi Sad–Šabac, sa baštom i terasom. Prema portalima za rezervaciju ljubimci su dozvoljeni na upit, bez doplate. Ograničenje veličine nije navedeno.',
  o.ops_id, 8, 1, 1, 45.100569, 19.861019
FROM opstina o JOIN grad g ON g.grd_id = o.grd_id
WHERE o.ops_ime = 'Irig' AND g.grd_ime = 'Irig'
  AND NOT EXISTS (
    SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Milin lagum' AND iuo_obrisan IS NULL
  );

-- --- Dvorska oaza --------------------------------------------------------------
-- Izvor: Booking (kroz bedandbreakfast.eu: "Pets are allowed", "Pet basket";
-- isecak: "No extra charges"). Dva apartmana u prizemlju, svaki sa terasom;
-- recenzija pominje veliko zeleno dvoriste. Telefon: isecak stranice TO
-- Sremski Karlovci (stranica nije otvorena). Koordinate: OSM way 1110714938.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Dvorska oaza',
  'Karlovačkih đaka 31, 21205 Sremski Karlovci',
  'https://www.booking.com/hotel/rs/dvorska-oaza-sremski-karlovtsi.html',
  '+381 63 8304171',
  'Dvorska oaza su dva apartmana u prizemlju kuće u Sremskim Karlovcima, svaki sa svojom terasom, uz veliko zeleno dvorište. Prema Booking-u ljubimci su dozvoljeni bez doplate, a korpa za spavanje ljubimca je obezbeđena. Ograničenje veličine nije navedeno.',
  o.ops_id, 8, 1, 1, 45.193870, 19.932582
FROM opstina o JOIN grad g ON g.grd_id = o.grd_id
WHERE o.ops_ime = 'Sremski Karlovci' AND g.grd_ime = 'Sremski Karlovci'
  AND NOT EXISTS (
    SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Dvorska oaza' AND iuo_obrisan IS NULL
  );

-- --- B&B Atrium ----------------------------------------------------------------
-- Izvor: Booking (kroz bedandbreakfast.eu: "Pets are allowed on request"),
-- Trip.com ("Pets are allowed / Additional charge", bez iznosa). Zajednicka
-- terasa. Telefon: izvori se ne slazu (022/612-613 planplus, +381 64 960 4965
-- Trip.com) -> NULL. Booking link izveden iz linka njegovih recenzija.
-- Koordinate: OSM way 1161747727.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'B&B Atrium',
  'Kralja Petra I 5, 22000 Sremska Mitrovica',
  'https://www.booking.com/hotel/rs/b-amp-b-atrium-sremska-mitrovitsa.html',
  NULL,
  'B&B Atrium ima sobe sa čajnom kuhinjom u zgradi sa liftom u Ulici kralja Petra I, u centru Sremske Mitrovice, i zajedničku terasu. Ljubimci su dozvoljeni na upit, uz doplatu čiji iznos objekat ne navodi. Ograničenje veličine nije navedeno.',
  o.ops_id, 8, 1, 1, 44.969143, 19.608235
FROM opstina o JOIN grad g ON g.grd_id = o.grd_id
WHERE o.ops_ime = 'Sremska Mitrovica' AND g.grd_ime = 'Sremska Mitrovica'
  AND NOT EXISTS (
    SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'B&B Atrium' AND iuo_obrisan IS NULL
  );

-- --- Imperator Kvintil apartmani & SPA -----------------------------------------
-- Izvor: SAMO Booking (kroz bedandbreakfast.eu: "Pets are allowed", "pets are
-- welcome"; bez pomena doplate). Basta, terasa bungalova, sezonski bazen
-- (zatvoren 1.10.2026-1.6.2027). Nema sajt ni telefon.
-- Koordinate PRIBLIZNE: pin oglasa (nije na OSM-u); reverse: zaselak Banovac,
-- Lezimir, Grad Sremska Mitrovica. Postanski broj 22207 (oglas: "22027").

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Imperator Kvintil apartmani & SPA',
  'Vikend naselje bb, 22207 Ležimir',
  'https://www.booking.com/hotel/rs/imperator-kvintil-apartmani-amp-spa.html',
  NULL,
  'Imperator Kvintil su apartmani sa spa centrom u vikend naselju kod Ležimira, na južnim obroncima Fruške gore, sa baštom i sezonskim bazenom. Prema Booking-u ljubimci su dozvoljeni, a doplatu i ograničenje veličine objekat ne navodi, pa ih proverite pri rezervaciji.',
  o.ops_id, 8, 1, 1, 45.132007, 19.570715
FROM opstina o JOIN grad g ON g.grd_id = o.grd_id
WHERE o.ops_ime = 'Ležimir' AND g.grd_ime = 'Sremska Mitrovica'
  AND NOT EXISTS (
    SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Imperator Kvintil apartmani & SPA' AND iuo_obrisan IS NULL
  );


-- =============================================================================
-- BANAT I BACKA
-- =============================================================================

-- --- Kastel Ecka ---------------------------------------------------------------
-- Izvor: Trip.com ("Pets are allowed, including cats, dogs", 10 EUR po
-- ljubimcu po noci, na upit); Expedia isecak (isto, sluzbene zivotinje bez
-- naplate); Booking isecak ("on request. Charges may be applicable.") i
-- recenzija gosta koji je sa psom setao parkom. Jedan agregator u FAQ kaze
-- "ne", a u pravilima istog oglasa "da" -> zanemaren.
-- Telefon: izvori se ne slazu (OSM +381 69 8697520, Trip.com +381 63 346495)
-- -> NULL. Koordinate: OSM node 10175492008.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Kaštel Ečka',
  'Novosadska 7, 23203 Ečka',
  'https://www.booking.com/hotel/rs/kastel-ecka.html',
  NULL,
  'Kaštel Ečka je hotel u dvorcu iz 19. veka u Ečki, kod Zrenjanina, okružen velikim parkom. Psi i mačke su dozvoljeni na upit, uz doplatu od 10 € po ljubimcu po noćenju (prema portalima za rezervaciju). Ograničenje veličine nije navedeno.',
  o.ops_id, 4, 1, 1, 45.321810, 20.434232
FROM opstina o JOIN grad g ON g.grd_id = o.grd_id
WHERE o.ops_ime = 'Ečka' AND g.grd_ime = 'Zrenjanin'
  AND NOT EXISTS (
    SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Kaštel Ečka' AND iuo_obrisan IS NULL
  );

-- --- Urban House Ada -----------------------------------------------------------
-- Izvor: SAMO Booking (kroz bedandbreakfast.eu: "Pets are allowed. Charges may
-- however be applicable."). Basta, rostilj, sauna, hidromasazna kada; svaka
-- jedinica ima terasu. Booking ga vodi pod "Padej" (otud greska u spisku), ali
-- adresa, postanski broj i pin su u Adi. Booking link nije potvrdjen -> link
-- na stranicu koja prenosi oglas. Koordinate: OSM node 11508598063.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Urban House Ada',
  'Košut Lajoša 43, 24430 Ada',
  'https://www.bedandbreakfast.eu/en/a/oep72tnZlFj4/urban-house-ada',
  NULL,
  'Urban House ima tri apartmana i sobu u Ulici Košut Lajoša u Adi, sa baštom, roštiljem i saunom, a svaka jedinica ima svoju terasu. Prema Booking-u ljubimci su dozvoljeni, uz moguću doplatu čiji iznos nije naveden. Ograničenje veličine nije navedeno.',
  o.ops_id, 8, 1, 1, 45.791850, 20.127770
FROM opstina o JOIN grad g ON g.grd_id = o.grd_id
WHERE o.ops_ime = 'Ada' AND g.grd_ime = 'Ada'
  AND NOT EXISTS (
    SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Urban House Ada' AND iuo_obrisan IS NULL
  );

-- --- Rose Gardens --------------------------------------------------------------
-- Izvor: SAMO Booking (kroz bedandbreakfast.eu: "Pets are allowed on request.
-- Charges may however be applicable.", "Pet basket", "Pet bowls"). Basta,
-- terasa. Booking link nije potvrdjen -> link na stranicu koja prenosi oglas.
-- Koordinate: OSM way 1434056968 (zgrada Sterijina 72).

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Rose Gardens',
  'Sterijina 72, 26300 Vršac',
  'https://www.bedandbreakfast.eu/en/a/DsgRPlkr6th1/rose-gardens',
  NULL,
  'Rose Gardens je mali B&B sa dve sobe u Sterijinoj ulici u Vršcu, sa baštom i terasom. Ljubimci su dozvoljeni na upit, a korpa za spavanje i posude za hranu i vodu su obezbeđene. Prema Booking-u doplata je moguća, ali iznos nije naveden.',
  o.ops_id, 8, 1, 1, 45.115022, 21.298103
FROM opstina o JOIN grad g ON g.grd_id = o.grd_id
WHERE o.ops_ime = 'Vršac' AND g.grd_ime = 'Vršac'
  AND NOT EXISTS (
    SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Rose Gardens' AND iuo_obrisan IS NULL
  );


-- =============================================================================
-- CENTRALNA I ZAPADNA SRBIJA
-- =============================================================================

-- --- Seosko turisticko domacinstvo Stojkovic -----------------------------------
-- Izvor: SAMO Booking (kroz j2ski: "Pets Allowed", basta, terasa, balkon).
-- Trip.com potvrdjuje adresu ("selo Boboviste, Ul. Beogradska 18"), o
-- ljubimcima cuti. Nema sajt ni telefon -> Trip.com link.
-- Koordinate: OSM node 11168880893 (adresa; pin oglasa ~12 m dalje).

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Seosko turističko domaćinstvo Stojković',
  'Beogradska 18, 18224 Bobovište',
  'https://www.trip.com/hotels/boboviste-hotel-detail-102807136/seosko-turistiko-domainstvo-stojkovi/',
  NULL,
  'Seosko turističko domaćinstvo Stojković ima dva apartmana u selu Bobovište kod Aleksinca, sa baštom, terasom i bazenima. Prema Booking-u ljubimci su dozvoljeni, a doplatu i ograničenje veličine domaćin ne navodi, pa ih proverite pri rezervaciji.',
  o.ops_id, 8, 1, 1, 43.576643, 21.664804
FROM opstina o JOIN grad g ON g.grd_id = o.grd_id
WHERE o.ops_ime = 'Bobovište' AND g.grd_ime = 'Aleksinac'
  AND NOT EXISTS (
    SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Seosko turističko domaćinstvo Stojković' AND iuo_obrisan IS NULL
  );

-- --- Nacionalna kuca Izvor -----------------------------------------------------
-- Izvor: Kayak, iz Booking podataka ("Mascotas permitidas bajo consulta (pueden
-- aplicar cargos extra)"), chambres-hotes.fr ("Animaux acceptes"). Basta i
-- terasa (Kayak). Telefon: Kayak i planplus se slazu.
-- Koordinate: OSM way 262853978 (restoran, Karadjordjeva 148).

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Nacionalna kuća Izvor',
  'Karađorđeva 148, 31260 Kosjerić',
  'https://www.kayak.com/Kosjeric-Hotels-B-B-Izvor.3385887.ksp',
  '+381 31 783331',
  'Nacionalna kuća Izvor ima četiri sobe i restoran u Karađorđevoj ulici u Kosjeriću, sa baštom i terasom. Ljubimci su dozvoljeni na upit, uz moguću doplatu (prema portalima za rezervaciju). Ograničenje veličine nije navedeno.',
  o.ops_id, 8, 1, 1, 44.006492, 19.915205
FROM opstina o JOIN grad g ON g.grd_id = o.grd_id
WHERE o.ops_ime = 'Kosjerić' AND g.grd_ime = 'Kosjerić'
  AND NOT EXISTS (
    SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Nacionalna kuća Izvor' AND iuo_obrisan IS NULL
  );


-- =============================================================================
-- PROVERA -- treba 11 opstina i 11 objekata, imena sa ispravnim c/c/z/s/dj
-- =============================================================================

SELECT o.ops_id, o.ops_ime, g.grd_id, g.grd_ime
FROM opstina o JOIN grad g ON g.grd_id = o.grd_id
WHERE (o.ops_ime, g.grd_ime) IN (
  ('Grocka', 'Beograd'), ('Vrdnik', 'Vrdnik'), ('Irig', 'Irig'),
  ('Sremski Karlovci', 'Sremski Karlovci'), ('Sremska Mitrovica', 'Sremska Mitrovica'),
  ('Ležimir', 'Sremska Mitrovica'), ('Ečka', 'Zrenjanin'), ('Ada', 'Ada'),
  ('Vršac', 'Vršac'), ('Bobovište', 'Aleksinac'), ('Kosjerić', 'Kosjerić')
)
ORDER BY g.grd_ime, o.ops_ime;

SELECT iuo.iuo_id, iuo.iuo_ime, o.ops_ime, g.grd_ime, iuo.ugo_id, iuo.sta_id, iuo.bas_id,
       iuo.latitude, iuo.longitude
FROM info_ug_obj iuo
JOIN opstina o ON o.ops_id = iuo.ops_id
JOIN grad g ON g.grd_id = o.grd_id
WHERE iuo.iuo_obrisan IS NULL
  AND iuo.iuo_ime IN (
    'Hotel Hedonic', 'Etno selo Vrdnička kula', 'Milin lagum', 'Dvorska oaza',
    'B&B Atrium', 'Imperator Kvintil apartmani & SPA', 'Kaštel Ečka',
    'Urban House Ada', 'Rose Gardens', 'Seosko turističko domaćinstvo Stojković',
    'Nacionalna kuća Izvor'
  )
ORDER BY g.grd_ime, iuo.iuo_ime;


-- =============================================================================
-- OPCIONO -- `location` kao kod starih redova (vidi 06; neprovereno na Marsu)
-- =============================================================================

-- UPDATE info_ug_obj
-- SET location = ST_SRID(POINT(longitude, latitude), 4326)
-- WHERE iuo_obrisan IS NULL
--   AND ST_SRID(location) = 0
--   AND iuo_ime IN (
--     'Hotel Hedonic', 'Etno selo Vrdnička kula', 'Milin lagum', 'Dvorska oaza',
--     'B&B Atrium', 'Imperator Kvintil apartmani & SPA', 'Kaštel Ečka',
--     'Urban House Ada', 'Rose Gardens', 'Seosko turističko domaćinstvo Stojković',
--     'Nacionalna kuća Izvor'
--   );
