-- =============================================================================
-- 06_seed_pet_friendly_hotels.sql  --  pet-friendly hoteli i apartmani
--
-- 16 objekata (Beograd 6, Novi Sad 4, Kopaonik 3, Zlatibor 3) u nasledjenu
-- tabelu info_ug_obj. Spisak je dosao sa promo/affiliate stranice; NIJEDAN
-- njen podatak o tezini i doplati nije prepisan, jer se vecina nije poklopila
-- sa izvorima. Svaki red je proveren 2026-10-23 na sajtu objekta, Booking-u
-- i drugim portalima; izvor stoji iznad reda. Opisi su pisani iznova.
--
-- Izostavljen: Boutique Macchiato Rooms (Bulevar patrijarha Pavla 1b, NS) --
-- Booking danas kaze "bez doplate", stariji Booking snimak "ljubimci nisu
-- dozvoljeni", sajt objekta cuti. Prvo pozvati +381 60 713 6230.
--
-- Zasto SQL a ne admin forma: ni pet-friendly-spots/create ni admin dialog ne
-- upisuju latitude/longitude, a bez njih objekat ne izlazi u "u blizini".
--
-- Idempotentno: svaki INSERT preskace ime koje vec postoji (iuo_obrisan IS
-- NULL), pa ponovno pokretanje ne pravi duplikate. Nema UPDATE-a postojecih.
--
-- Lookup ID-evi (proverljivo na /api/v2/township, /pet-friendly-spots-types/list,
-- /allowed-pet-types, /gardenTypes):
--   ops_id  1 Vracar, 4 Novi Beograd, 8 Stari grad, 15 Novi Sad,
--          48 Kopaonik, 50 Zlatibor
--   ugo_id  4 Hotel, 8 Apartman
--   sta_id  1 Mali pas | 2 Mali pas i stenci vecih rasa do 5 meseci | 3 Svi psi
--   bas_id  1 sa bastom | 2 bez baste
--
-- Pravila popunjavanja:
--   sta_id  granica do 10 kg -> 1; 15-20 kg -> 2 (kao Queen of Zlatibor, 15 kg);
--           vise ili bez granice uz potvrdu da primaju velike pse -> 3;
--           granica NIJE navedena nigde -> 1, a opis kaze da se proveri.
--   bas_id  1 samo kad gost moze napolje sa ljubimcem u okviru objekta
--           (dvoriste, terasa smestajne jedinice, restoran koji prima pse);
--           rooftop bar/terasa restorana bez pravila za ljubimce -> 2.
--
-- Slike: NULL. Kartica i detalj pokazuju logo; random.GET (landing) preskace
-- objekte bez obe slike. Admin "izmeni" dialog trazi sliku, pa je dodaj tamo.
-- `location` (POINT) se ne upisuje -- nijedan handler ga ne cita, pretraga i
-- "u blizini" koriste latitude/longitude. Opcioni UPDATE je na dnu.
--
-- POSLE pokretanja: `yarn generate-sitemap` pa release build -- spots/:id se
-- prerenderuje samo za ID-eve iz public/sitemap.xml.
--
-- Encoding: imena i opisi imaju c/c/z/s/dj i znak evra. Posle lepljenja u Mars
-- DB manager pokreni proveru sa dna i pogledaj da li se ispisuje ispravno.
-- =============================================================================

SET NAMES utf8mb4;


-- =============================================================================
-- BEOGRAD
-- =============================================================================

-- --- Hilton Belgrade -----------------------------------------------------------
-- Izvor: hilton.com hotel-info (30 EUR jednokratno po ljubimcu, max 20 kg,
-- stenci < 1 god. u transporteru). Expedia/Trip.com navode naplatu po noci.
-- Koordinate: OSM way 393233957.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Hilton Belgrade',
  'Kralja Milana 35, 11000 Beograd',
  'https://www.hilton.com/en/hotels/begbshi-hilton-belgrade/',
  '+381 11 7555700',
  'Hilton u Ulici kralja Milana, na nekoliko minuta od Slavije, prima kućne ljubimce do 20 kg. Prema sajtu hotela naplaćuje se jednokratno 30 € po ljubimcu, a štenci mlađi od godinu dana moraju biti u transporteru. Portali za rezervaciju navode i naplatu po noćenju, pa iznos potvrdite sa hotelom.',
  1, 4, 2, 2, 44.804428, 20.466461
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Hilton Belgrade' AND iuo_obrisan IS NULL
);

-- --- Mama Shelter Belgrade -----------------------------------------------------
-- Izvor: mamashelter.com/belgrade/faq ("Pets are accepted in the restaurant");
-- Booking i Trip.com: psi, bez doplate; Expedia: 1 pas, do 60 kg, 25 EUR po
-- boravku. Rooftop terasa (sajt). Koordinate: OSM node 5438624053.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Mama Shelter Belgrade',
  'Kneza Mihaila 54A, 11000 Beograd',
  'https://mamashelter.com/belgrade/',
  '+381 11 3333000',
  'Mama Shelter je na vrhu tržnog centra Rajićeva, na kraju Knez Mihailove i nekoliko minuta hoda od Kalemegdana. Prima pse, jednog po sobi, a prema portalima za rezervaciju i veće pse, do 60 kg. Ljubimci smeju i u restoran hotela. Doplata se razlikuje od portala do portala (od besplatno do 25 € po boravku), pa je proverite pri rezervaciji.',
  8, 4, 3, 1, 44.820083, 20.453953
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Mama Shelter Belgrade' AND iuo_obrisan IS NULL
);

-- --- Crowne Plaza Belgrade -----------------------------------------------------
-- Izvor: ihg.com amenities (samo psi < 10 kg, 80 EUR po boravku, ne u
-- restorane i barove, ne sami u sobi); Trip.com i Hotels.com isto.
-- Koordinate: OSM way 203161795.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Crowne Plaza Belgrade',
  'Vladimira Popovića 10, 11070 Novi Beograd',
  'https://www.ihg.com/crowneplaza/hotels/us/en/belgrade/begcp/hoteldetail',
  '+381 11 2204004',
  'Crowne Plaza je na Novom Beogradu, pored Sava Centra. Prima samo pse do 10 kg, uz naknadu od 80 € po boravku. Psi ne smeju u restorane i barove hotela i ne smeju ostati sami u sobi.',
  4, 4, 1, 2, 44.809441, 20.434126
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Crowne Plaza Belgrade' AND iuo_obrisan IS NULL
);

-- --- Hotel Zepter --------------------------------------------------------------
-- Izvor: Booking ("Pets are allowed. Charges may be applicable."), Trip.com,
-- Expedia (samo odredjene sobe), Hotels.com. Sajt hotela ne pominje ljubimce;
-- iznos se razlikuje po portalu (10-25 EUR po noci), zato ga opis ne fiksira.
-- Koordinate: OSM node 8369598347.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Hotel Zepter',
  'Terazije 10, 11000 Beograd',
  'https://hotelzepter.rs/',
  '+381 11 3063800',
  'Hotel Zepter je na Terazijama, u samom centru Beograda. Ljubimci su dozvoljeni na upit i samo u određenim sobama, uz doplatu po noćenju. Sajt hotela ne navodi iznos, a portali za rezervaciju se razlikuju (10–25 €), pa sobu za boravak sa ljubimcem dogovorite direktno sa hotelom.',
  8, 4, 1, 2, 44.814081, 20.460177
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Hotel Zepter' AND iuo_obrisan IS NULL
);

-- --- Garni hotel Mar -----------------------------------------------------------
-- Promo kaze "Zemun" -- pogresno: Surcinska 52, Ledine, opstina Novi Beograd.
-- Izvor: Booking, Expedia, Trip.com, HRS (psi i macke, bez doplate). Sajt
-- hotela ne pominje ljubimce; granica velicine nije navedena -> sta_id 1.
-- Basta/terasa: Trip.com, HRS. Koordinate: OSM way 689162072.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Garni hotel Mar',
  'Surčinska 52, 11077 Novi Beograd (Ledine)',
  'https://hotelmar.rs/',
  '+381 11 4138888',
  'Garni hotel Mar je u Surčinskoj ulici u Ledinama, na Novom Beogradu. Psi i mačke borave besplatno. Ograničenje veličine nije navedeno, pa većeg psa najavite pri rezervaciji.',
  4, 4, 1, 1, 44.806921, 20.352982
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Garni hotel Mar' AND iuo_obrisan IS NULL
);

-- --- Hotel Central Point -------------------------------------------------------
-- Izvor: Booking ("allowed on request. Charges may be applicable."), Trip.com
-- (20 EUR po boravku), Hotels.com (1 ljubimac, max 10 kg, 25 EUR po boravku).
-- Sajt hotela ne pominje ljubimce. Koordinate: OSM way 394172796 (poklapa se
-- sa mapom na sajtu hotela). Opstina: Stari grad, granica sa Palilulom ~100 m.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Hotel Central Point',
  'Takovska 37, 11000 Beograd',
  'https://centralpointhotel.com/',
  '+381 11 7777222',
  'Hotel Central Point je u Takovskoj ulici, kod Botaničke bašte Jevremovac. Ljubimci su dozvoljeni na upit: prema portalima za rezervaciju jedan ljubimac do 10 kg, uz doplatu od 20–25 € po boravku. Ljubimca najavite unapred.',
  8, 4, 1, 2, 44.813235, 20.471642
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Hotel Central Point' AND iuo_obrisan IS NULL
);


-- =============================================================================
-- NOVI SAD
-- =============================================================================

-- --- Sheraton Novi Sad ---------------------------------------------------------
-- Izvor: marriott.com (max 8 kg, 1 ljubimac, stalno na povocu); Booking
-- ("on request. No extra charges."). Koordinate: OSM way 227099315.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Sheraton Novi Sad',
  'Polgar Andraša 1, 21000 Novi Sad',
  'https://www.marriott.com/en-us/hotels/begsi-sheraton-novi-sad/overview/',
  '+381 21 4878000',
  'Sheraton je na Telepu, u Ulici Polgar Andraša. Prima jednog ljubimca do 8 kg po sobi, bez doplate prema Booking-u. Ljubimac mora stalno biti na povocu, a boravak najavite unapred.',
  15, 4, 1, 2, 45.248134, 19.816331
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Sheraton Novi Sad' AND iuo_obrisan IS NULL
);

-- --- Hotel Pupin ---------------------------------------------------------------
-- Izvor: hotelpupin.rs/sr/odgovori/ ("dozvoljava drzanje kucnih ljubimaca do
-- maksimalno 5 kg uz doplatu 50EUR/po danu"). Kalem Garden postoji, ali nije
-- navedeno da li primaju pse -> bas_id 2. Koordinate: OSM node 12960363783.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Hotel Pupin',
  'Narodnih heroja 3, 21000 Novi Sad',
  'https://hotelpupin.rs/sr/',
  '+381 21 2156000',
  'Hotel Pupin, sa pet zvezdica, je u Pupinovoj palati u centru Novog Sada. Prema sajtu hotela dozvoljeni su ljubimci do 5 kg, uz doplatu od 50 € dnevno. Ljubimca najavite pri rezervaciji.',
  15, 4, 1, 2, 45.253143, 19.843436
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Hotel Pupin' AND iuo_obrisan IS NULL
);

-- --- Arhiv Boutique House ------------------------------------------------------
-- Izvor: samo Booking ("Pets are allowed on request. No extra charges.";
-- terasa i sedenje napolju). Objekat nema svoj sajt -> Instagram.
-- Telefon: izvori se ne slazu (064 479 5810 / 064 2194 307) -> NULL.
-- Koordinate: OSM node 6568379291.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Arhiv Boutique House',
  'Ilije Ognjanovića 16, 21000 Novi Sad',
  'https://www.instagram.com/arhiv_boutique_house/',
  NULL,
  'Arhiv je butik smeštaj u starom jezgru Novog Sada, u Ulici Ilije Ognjanovića. Ljubimci su dozvoljeni na upit, bez doplate (prema Booking-u). Objekat ima terasu i prostor za sedenje napolju.',
  15, 4, 1, 1, 45.255116, 19.847496
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Arhiv Boutique House' AND iuo_obrisan IS NULL
);

-- --- Turisticko naselje Ribarsko ostrvo ----------------------------------------
-- Izvor: ribarskoostrvo.rs/smestaj/ ("DOZVOLJENI KUCNI LJUBIMCI" kod
-- jednokrevetne, twin i dvokrevetne sobe, ne kod Deluxe); Booking (on request,
-- bez doplate). Granica velicine nije navedena -> sta_id 1.
-- Koordinate PRIBLIZNE: OSM node restorana Alaska terasa (ista adresa);
-- bungalovi nisu na OSM-u -- po potrebi pomeri pin rucno.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Turističko naselje Ribarsko ostrvo',
  'Ribarsko ostrvo 4, 21000 Novi Sad',
  'https://ribarskoostrvo.rs/',
  '+381 64 6470435',
  'Turističko naselje Ribarsko ostrvo ima bungalove na obali Dunava, svaki sa svojom terasom. Psi su dozvoljeni u jednokrevetnim, twin i dvokrevetnim sobama, ali ne i u Deluxe sobi. Prema Booking-u boravak psa je bez doplate, uz najavu.',
  15, 4, 1, 1, 45.229566, 19.834261
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Turističko naselje Ribarsko ostrvo' AND iuo_obrisan IS NULL
);


-- =============================================================================
-- KOPAONIK
-- =============================================================================

-- --- Belvedere Hills -----------------------------------------------------------
-- Izvor: belvederehills.rs ("dozvoljen je boravak kucnih ljubimaca"); Booking
-- (bez doplate, posude za ljubimce; recenzija gosta sa cetiri velika psa)
-- -> sta_id 3. Promo kaze "Vikend naselje" -- pogresno, Cajetinska cesma.
-- Koordinate: Google Maps (nije na OSM-u).

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Belvedere Hills',
  'Čajetinska česma bb, 36350 Kopaonik',
  'https://belvederehills.rs/',
  '+381 62 779878',
  'Belvedere Hills su apartmani sa spa centrom u naselju Čajetinska česma na Kopaoniku, i svaki ima terasu. Ljubimci su dozvoljeni bez doplate, a posude za hranu i vodu su obezbeđene. Ograničenje veličine nije navedeno, a prema utiscima gostiju primaju i velike pse.',
  48, 8, 3, 1, 43.274196, 20.766982
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Belvedere Hills' AND iuo_obrisan IS NULL
);

-- --- Apartmani Foka SPA --------------------------------------------------------
-- Izvor: fokaspa.rs ("PET FRIENDLY" u sadrzaju); Booking glavni oglas ("on
-- request. Charges may be applicable."). Oglas jedne jedinice u istoj zgradi
-- ("Kopaonik Foka Spa Brzece") kaze "Pets are not allowed" -- otud napomena.
-- Koordinate: Google Maps (mapa na sajtu objekta).

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Apartmani Foka SPA',
  'Mramorska 90a, 37225 Brzeće',
  'https://fokaspa.rs/',
  '+381 65 3100409',
  'Apartmani Foka SPA su u Brzeću, oko 600 m od gondole za Kopaonik, i svaki apartman ima terasu. Ljubimci su dozvoljeni na upit, uz moguću doplatu čiji iznos objekat ne navodi. Pojedini apartmani u istoj zgradi iznajmljuju se zasebno i ne primaju ljubimce, pa rezervišite direktno kod objekta i najavite psa.',
  48, 8, 1, 1, 43.286954, 20.878929
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Apartmani Foka SPA' AND iuo_obrisan IS NULL
);

-- --- Ski hotel Dobrodolac ------------------------------------------------------
-- Izvor: SAMO Booking ("Pets are allowed. No extra charges."; basta, terasa).
-- Nema svoj sajt -> link na Booking. Telefon: Google Maps.
-- Koordinate: Google Maps (plus code 7VWJ+QC).

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Ski hotel Dobrodolac',
  'Mramorska bb, 37225 Brzeće',
  'https://www.booking.com/hotel/rs/ski-dobrodolac.html',
  '+381 64 2876224',
  'Ski hotel Dobrodolac je hotel sa tri zvezdice u Brzeću, na Kopaoniku. Prema Booking-u ljubimci su dozvoljeni bez doplate, a hotel ima baštu i terasu. Hotel nema svoj sajt, pa uslove za ljubimca proverite telefonom.',
  48, 4, 1, 1, 43.296938, 20.881063
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Ski hotel Dobrodolac' AND iuo_obrisan IS NULL
);


-- =============================================================================
-- ZLATIBOR
-- =============================================================================

-- --- BOR Hotel by Karisma ------------------------------------------------------
-- Izvor: Booking ("Pets are allowed. Charges may be applicable.", posude);
-- check24.de i Expedia (25 EUR po ljubimcu dnevno, max 8 kg, samo psi i
-- macke, ne sami u sobi). Sajt hotela cuti. Koordinate: OSM way 184624306
-- (Booking-ove su ~220 m pomerene, ne koristiti).

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'BOR Hotel by Karisma',
  'Drinske divizije 40, 31315 Zlatibor',
  'https://www.borhotel.com/',
  '+381 31 3150353',
  'BOR Hotel by Karisma je hotel sa pet zvezdica na Zlatiboru, u Ulici Drinske divizije. Prima pse i mačke do 8 kg, uz doplatu od oko 25 € po ljubimcu dnevno (prema portalima za rezervaciju), a ljubimac ne sme ostati sam u sobi. Posude za hranu i vodu su obezbeđene.',
  50, 4, 1, 1, 43.729887, 19.693961
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'BOR Hotel by Karisma' AND iuo_obrisan IS NULL
);

-- --- Mona Plaza Zlatibor -------------------------------------------------------
-- "Mona Zlatibor" = "Mona Plaza Zlatibor" = "Hotel Zlatibor Mona", isti hotel.
-- Izvor: monazlatibor.com/rs/servisi ("Ljubimci su dozvoljeni u sobama");
-- Booking fine print (20 EUR po noci, max 15 kg). Promo "do 10 kg" je
-- pogresno. Koordinate: OSM way 656964585.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Mona Plaza Zlatibor',
  'Miladina Pećinara 26, 31315 Zlatibor',
  'https://www.monazlatibor.com/',
  '+381 31 841021',
  'Hotel Mona Plaza je u centru Zlatibora, u naselju Jezero. Ljubimci su dozvoljeni u sobama, do 15 kg, uz doplatu od 20 € po noćenju (prema Booking-u). Boravak ljubimca najavite pri rezervaciji.',
  50, 4, 2, 2, 43.726622, 19.697697
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Mona Plaza Zlatibor' AND iuo_obrisan IS NULL
);

-- --- Kraljevi konaci -----------------------------------------------------------
-- Izvor: kraljevikonaci.rs/cenovnik/ ("Doplata za kucne ljubimce iznosi 1200
-- RSD dnevno. (Dozvoljeni su ljubimci malih rasa do 15kg tezine)"). Promo
-- "psi svih velicina" je pogresno. Koordinate: OSM way 478056105 (recepcija).

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Kraljevi konaci',
  'Sportova bb, naselje Kraljevi konaci, 31315 Zlatibor',
  'https://kraljevikonaci.rs/',
  '+381 64 8686505',
  'Kraljevi konaci su naselje vikendica na Zlatiboru, a svaka vila ima svoje dvorište i parking mesto. Dozvoljeni su ljubimci malih rasa do 15 kg, uz doplatu od 1.200 RSD dnevno (cenovnik objekta).',
  50, 8, 2, 1, 43.726154, 19.704197
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Kraljevi konaci' AND iuo_obrisan IS NULL
);


-- =============================================================================
-- PROVERA -- treba 16 redova, imena sa ispravnim c/c/z/s
-- =============================================================================

SELECT iuo_id, iuo_ime, ops_id, ugo_id, sta_id, bas_id, latitude, longitude
FROM info_ug_obj
WHERE iuo_obrisan IS NULL
  AND iuo_ime IN (
    'Hilton Belgrade', 'Mama Shelter Belgrade', 'Crowne Plaza Belgrade',
    'Hotel Zepter', 'Garni hotel Mar', 'Hotel Central Point',
    'Sheraton Novi Sad', 'Hotel Pupin', 'Arhiv Boutique House',
    'Turističko naselje Ribarsko ostrvo',
    'Belvedere Hills', 'Apartmani Foka SPA', 'Ski hotel Dobrodolac',
    'BOR Hotel by Karisma', 'Mona Plaza Zlatibor', 'Kraljevi konaci'
  )
ORDER BY ops_id, iuo_ime;


-- =============================================================================
-- OPCIONO -- `location` kao kod starih redova (SRID 4326, X = longitude).
-- Neprovereno na Marsu; dvoargumentni ST_SRID postoji tek u MySQL 8.0.
-- Pre pokretanja: SELECT VERSION();
-- =============================================================================

-- UPDATE info_ug_obj
-- SET location = ST_SRID(POINT(longitude, latitude), 4326)
-- WHERE iuo_obrisan IS NULL
--   AND ST_SRID(location) = 0
--   AND iuo_ime IN (
--     'Hilton Belgrade', 'Mama Shelter Belgrade', 'Crowne Plaza Belgrade',
--     'Hotel Zepter', 'Garni hotel Mar', 'Hotel Central Point',
--     'Sheraton Novi Sad', 'Hotel Pupin', 'Arhiv Boutique House',
--     'Turističko naselje Ribarsko ostrvo',
--     'Belvedere Hills', 'Apartmani Foka SPA', 'Ski hotel Dobrodolac',
--     'BOR Hotel by Karisma', 'Mona Plaza Zlatibor', 'Kraljevi konaci'
--   );
