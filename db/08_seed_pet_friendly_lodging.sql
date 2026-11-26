-- =============================================================================
-- 08_seed_pet_friendly_lodging.sql  --  pet-friendly smestaj, prva tura
--
-- Objekti iz spiska konkurentskog sajta (BringFido, 2026-11-02) u mestima koja
-- vec postoje u `opstina`. Nova mesta su u 09. Spisak je posluzio samo kao
-- lista kandidata: nijedan njegov podatak nije prepisan. Svaki red je proveren
-- 2026-11-02 na sajtu objekta, Booking-u (kroz isecke pretrage), Expedia
-- grupi, Trip.com-u, HRS-u, check24 i OSM-u; izvor stoji iznad reda. Opisi su
-- pisani iznova.
--
-- Koliko je spisak pouzdan: od 7 objekata koje vec imamo, njegove kilaze su se
-- poklopile 3 od 3, ali "any size" je bio pogresan 2 od 4 puta (Kraljevi
-- konaci, Queen of Zlatibor: 15 kg). Ovde je takodje pogresio za Slodes
-- (5 kg, ne 15), Vozarev (15 kg, ne "any size"), Hotel Veliki (samo manji
-- ljubimci), a Euro Garni i Mr President ne primaju ljubimce. Zato "any size"
-- nigde nije postao sta_id 3; sta_id 3 imaju samo Garson Lux (cenovnik hotela
-- ima "veliki kucni ljubimac") i Balkan Hotel Garni (30 kg).
--
-- Kad se sajt objekta i portali ne slazu, vazi sajt objekta (Leopold I i
-- Zenit: sajt kaze da primaju ljubimce, deo portala da ne primaju; opis to
-- kaze i salje gosta da rezervise direktno).
--
-- Izostavljeni (na cekanju):
--   Beograd: Hotel Contact (sajt contact.rs je parkiran domen, mozda ne radi;
--     011 2608 377), Central Business Suites (samo Expedia feed, ocene 1-2/10,
--     nema sajt ni telefon; u Zemunu, ne na Novom Beogradu), Queen's Astoria
--     (Expedia "Pets not allowed", Trip.com "allowed"; 011 411 88 22),
--     Adresa Suites (sajt iz 2018: do 2 kg uz doplatu; Booking: do 5 kg;
--     check24 i "nije dozvoljeno"; 011 311 0019), Hostel Bed & Coffee 360
--     (identitet nepotvrdjen; mozda "360", Kneza Mihaila 21, 011 2634957).
--     Euro Garni Hotel i Design Hotel Mr President -- NE primaju ljubimce
--     (Expedia, Trip.com/check24; Booking nije procitan).
--   Novi Sad: Guest House Maja (nijedan izvor osim spiska; 062 500 705),
--     Garni hotel Element (nezavisan hotel, ne Marriott; sajt cuti;
--     021 2300 611).
--   Zlatibor, Divcibare, Leskovac: nijedan nije prosao. Vila Uki ne postoji
--     pod tim imenom; Onix Residence nema adresu ni telefon; Hotel Royal
--     Mountain (Trip.com: ne prima; 014 3150 601), Hotel ABC (Booking i
--     Trip.com: ne prima; 016 234 040) i B&B Bebinac (Trip.com: ne prima;
--     016 259320) imaju izvore koji se ne slazu; Apartmani Smigic nemaju
--     nijedan pomen ljubimaca (065 577 7715). Royal Mountain i nas
--     "BOROVI ROYAL" (iuo_id 141) su RAZLICITI objekti.
--
-- Idempotentno kao 06: svaki INSERT preskace ime koje vec postoji
-- (iuo_obrisan IS NULL). Nema UPDATE-a postojecih redova; nasih 7 objekata sa
-- spiska ostaje kakvo jeste (nasi podaci su provereniji).
--
-- Lookup ID-evi (proverljivo na /api/v2/township, /pet-friendly-spots-types/list,
-- /allowed-pet-types, /gardenTypes):
--   ops_id  3 Zvezdara, 4 Novi Beograd, 6 Rakovica, 7 Savski venac,
--           8 Stari grad, 9 Cukarica, 14 Zemun,
--           15 Novi Sad, 26 Petrovaradin, 34 Crveni Krst (Nis)
--   ugo_id  4 Hotel, 8 Apartman
--   sta_id  1 Mali pas | 2 Mali pas i stenci vecih rasa do 5 meseci | 3 Svi psi
--   bas_id  1 sa bastom | 2 bez baste
-- Pravila su ista kao u 06:
--   sta_id  do 10 kg -> 1; 15-20 kg -> 2; vise ili bez granice uz potvrdu
--           objekta da prima velike pse -> 3; granica nije navedena -> 1, a
--           opis kaze da se proveri.
--   bas_id  1 kad gost moze napolje sa ljubimcem u okviru objekta; basta
--           restorana bez pravila za ljubimce -> 2.
--   telefon kad se izvori ne slazu: broj sa sajta objekta, a bez sajta NULL.
--
-- Slike: NULL (vidi 06). `location` se ne upisuje; opcioni UPDATE je na dnu.
--
-- POSLE pokretanja: `yarn generate-sitemap` pa release build -- spots/:id se
-- prerenderuje samo za ID-eve iz public/sitemap.xml.
-- =============================================================================

SET NAMES utf8mb4;


-- =============================================================================
-- BEOGRAD
-- =============================================================================

-- --- Garni hotel Mint ----------------------------------------------------------
-- Izvor: Hotels.com (25 EUR po ljubimcu po danu, "arrange in advance"),
-- HRS/hotel.info (15 EUR po danu, "Large dogs permitted"), laterooms (basta,
-- terasa), Booking isecak ("on request. Charges may be applicable."). Sajt
-- hotela ne pominje ljubimce. Opstina: Nominatim reverse (MZ Topcidersko
-- brdo-Senjak). Koordinate: OSM way 402101146.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Garni hotel Mint',
  'Kvarnerska 4, 11000 Beograd (Senjak)',
  'https://hotelmint.rs/',
  '+381 11 4113311',
  'Garni hotel Mint je u Kvarnerskoj ulici na Senjaku, u mirnom delu Savskog venca, i ima baštu i terasu. Ljubimci su dozvoljeni na upit, uz doplatu po danu koja se razlikuje od portala do portala (15–25 €). Ograničenje veličine hotel ne navodi, pa većeg psa najavite unapred.',
  7, 4, 1, 1, 44.795809, 20.447728
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Garni hotel Mint' AND iuo_obrisan IS NULL
);

-- --- Side One Design Hotel -----------------------------------------------------
-- Izvor: Trip.com ("Pets are allowed on request", psi i macke, 10 EUR po
-- ljubimcu po boravku), Hotels.com (isto), AAA. Sajt hotela ne pominje
-- ljubimce. Opstina Zemun (Nominatim reverse, Donji grad).
-- Koordinate: OSM way 402332557.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Side One Design Hotel',
  'Kej oslobođenja 19, 11080 Zemun',
  'https://www.sideonehotel.com/',
  '+381 60 7433663',
  'Side One Design Hotel je na Keju oslobođenja u Zemunu, preko puta šetališta uz Dunav. Psi i mačke su dozvoljeni na upit, uz naknadu od 10 € po ljubimcu za ceo boravak (prema portalima za rezervaciju). Ograničenje veličine nije navedeno, pa većeg psa najavite unapred.',
  14, 4, 1, 2, 44.844245, 20.415914
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Side One Design Hotel' AND iuo_obrisan IS NULL
);

-- --- Airport Apartments --------------------------------------------------------
-- Izvor: Hotels.com i check24 (10 EUR po ljubimcu po danu, na upit), Trip.com
-- (na upit; recenzija od 4.10.2026, radi), Ostrovok ("Razresheny lyubye
-- zhivotnye", 10 EUR po ljubimcu za ceo boravak). Nema sajt; telefon samo
-- Trip.com. Opstina Novi Beograd (Nominatim reverse, MZ Dr Ivan Ribar).
-- Koordinate: OSM way 477012652.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Airport Apartments',
  'Peščarska 18, 11077 Novi Beograd',
  'https://www.trip.com/hotels/belgrade-hotel-detail-10937668/airport-apartments/',
  '+381 64 1606539',
  'Airport Apartments su apartmani u Peščarskoj ulici na Novom Beogradu, nedaleko od aerodroma. Ljubimci su dozvoljeni na upit, uz doplatu od 10 € po ljubimcu, prema jednim portalima po danu, a prema drugim za ceo boravak. Ograničenje veličine nije navedeno.',
  4, 8, 1, 2, 44.796608, 20.354091
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Airport Apartments' AND iuo_obrisan IS NULL
);

-- --- Hotel Centar Balasevic ----------------------------------------------------
-- Izvor: Hotels.com ("Pets allowed (no fees)", basta, terasa), check24 ("auf
-- Anfrage", "Moglicherweise fallen Gebuhren an"). Sajt centra ne pominje
-- ljubimce, ali opisuje baste i zelenilo oko objekta. Opstina Rakovica
-- (Nominatim reverse, Miljakovac 1). Koordinate: OSM way 830421180.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Hotel Centar Balašević',
  'Miška Kranjca 17a, 11090 Beograd (Miljakovac)',
  'https://www.centarbalasevic.rs/',
  '+381 11 3510920',
  'Hotel Centar Balašević je deo sportskog centra na Miljakovcu, u Rakovici, okružen uređenim baštama i zelenilom. Ljubimci su dozvoljeni na upit: prema Hotels.com bez doplate, a prema drugim portalima doplata je moguća. Ograničenje veličine nije navedeno.',
  6, 4, 1, 1, 44.745721, 20.447108
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Hotel Centar Balašević' AND iuo_obrisan IS NULL
);

-- --- Hotel Slodes --------------------------------------------------------------
-- Izvor: Hotels.com ("Pets allowed (no fees)", 1 ljubimac po sobi, "max weight
-- 5 kg"), Sembo. Spisak kaze 15 kg -- pogresno. Sajt hotela ne pominje
-- ljubimce; letnja basta je restoranska -> bas_id 2. Opstina Rakovica
-- (Nominatim reverse, MZ Kosutnjak), ~75 m od granice sa Savskim vencem.
-- Koordinate: OSM way 392174234.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Hotel Slodes',
  'Borska 92f, 11090 Beograd',
  'https://www.hotelslodes.rs/',
  '+381 11 3056525',
  'Hotel Slodes je u Borskoj ulici, uz istoimeni sportski centar, na ivici Košutnjaka. Prema portalima za rezervaciju prima jednog ljubimca do 5 kg po sobi, bez doplate. Boravak ljubimca dogovorite sa hotelom unapred.',
  6, 4, 1, 2, 44.756541, 20.460964
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Hotel Slodes' AND iuo_obrisan IS NULL
);

-- --- Hotel Vozarev -------------------------------------------------------------
-- Izvor: hotelvozarev.rs/usluge-i-zabava/osnovne-informacije/ ("dozvoljeni su
-- kucni ljubimci do 15 kg ... Naknada za kucnog ljubimca je 15 EUR", bez
-- jedinice); Hotels.com isecak (5 EUR po ljubimcu po danu, posude). Spisak
-- kaze "any size" -- pogresno. Opstina Zvezdara (Nominatim), ~70 m od granice
-- sa Vracarom. Koordinate: OSM way 398039850.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Hotel Vozarev',
  'Pop Stojanova 16, 11050 Beograd',
  'https://hotelvozarev.rs/',
  '+381 11 4060988',
  'Hotel Vozarev je u Ulici Pop Stojanovoj na Zvezdari, uz samu granicu sa Vračarom. Prema sajtu hotela primaju ljubimce do 15 kg, uz naknadu od 15 €, a ljubimca treba najaviti pre dolaska. Portali za rezervaciju navode 5 € po danu, pa iznos proverite sa hotelom.',
  3, 4, 2, 2, 44.797056, 20.489882
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Hotel Vozarev' AND iuo_obrisan IS NULL
);

-- --- Balkan Hotel Garni --------------------------------------------------------
-- Izvor: garni.rs ("Pet friendly"); check24 (do 2 ljubimca po sobi, max 30 kg,
-- 10 EUR po ljubimcu po noci + depozit 10 EUR po noci), Expedia isecak (isto).
-- 30 kg je preko granice od 25 kg -> sta_id 3; opis navodi granicu. Da li je
-- depozit povratan nije potvrdjeno. Adresa sa sajta hotela (portali imaju
-- Pozesku 67a, isti blok). Opstina Cukarica (Nominatim).
-- Koordinate PRIBLIZNE: OSM way 330354380 (zgrada Jugoplastike, Pozeska 67a);
-- hotel nije na OSM-u.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Balkan Hotel Garni',
  'Rajka od Rasine 8, 11030 Beograd (Banovo brdo)',
  'https://garni.rs/',
  '+381 11 3600200',
  'Balkan Hotel Garni je u Ulici Rajka od Rasine na Banovom brdu, iza zgrade Jugoplastike u Požeškoj, i na svom sajtu se predstavlja kao pet friendly. Prema portalima za rezervaciju prima do dva ljubimca po sobi, do 30 kg, uz doplatu od 10 € po ljubimcu po noćenju i depozit od 10 € po noćenju.',
  9, 4, 3, 2, 44.777491, 20.414798
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Balkan Hotel Garni' AND iuo_obrisan IS NULL
);

-- --- Vila Senjak ---------------------------------------------------------------
-- Izvor: Hotels.com i Expedia isecci ("Pets stay free"), check24 ("auf
-- Anfrage ... Moglicherweise fallen Gebuhren an"; Garten, Terrasse), Kayak
-- ("pet-friendly rooms"). Sajt objekta ne pominje ljubimce, ali opisuje
-- "mirno dvoriste sa bazenom". Telefon: sajt objekta (OSM ima drugi).
-- Koordinate: OSM node 6329292223 (schema.org geo sa sajta je ~900 m dalje).

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Vila Senjak',
  'Kuršumlijska 2, 11000 Beograd (Senjak)',
  'https://vilasenjak.com/',
  '+381 69 1202351',
  'Vila Senjak je prenoćište sa sobama i studijima u Kuršumlijskoj ulici na Senjaku, sa mirnim dvorištem i bazenom. Ljubimci su dozvoljeni: prema Hotels.com bez doplate, a prema drugim portalima doplata je moguća. Ograničenje veličine nije navedeno.',
  7, 4, 1, 1, 44.794893, 20.445848
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Vila Senjak' AND iuo_obrisan IS NULL
);

-- --- Hotel Nobel Gallery -------------------------------------------------------
-- Izvor: check24 (samo psi i macke, max 20 kg, 15 EUR po ljubimcu po danu, na
-- upit). Sajt hotela ne pominje ljubimce; basta je uz restoran -> bas_id 2.
-- Adresa: novi sajt hotela kaze Visegradska 18, a sajt grupe (nhg.rs), OSM i
-- check24 Visegradska 23 -- uzeto 23, obe padaju na istu tacku.
-- Opstina Savski venac (Nominatim, MZ Zapadni Vracar). Koordinate: OSM node
-- 9815464463.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Hotel Nobel Gallery',
  'Višegradska 23, 11000 Beograd',
  'https://nobelgallery.rs/',
  '+381 66 6999500',
  'Hotel Nobel Gallery je u Višegradskoj ulici, nedaleko od Slavije. Prema portalima za rezervaciju primaju pse i mačke do 20 kg, uz doplatu od 15 € po ljubimcu dnevno. Boravak ljubimca najavite unapred.',
  7, 4, 2, 2, 44.800825, 20.455699
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Hotel Nobel Gallery' AND iuo_obrisan IS NULL
);

-- --- Capital Hotel -------------------------------------------------------------
-- Izvor: rezervacioni sistem hotela (phobs.net, link "Rezervisi" sa
-- capitalhotel.rs; Facilities: "Pets allowed"). Uslovi nigde nisu objavljeni.
-- Telefon: sajt hotela (OSM ima drugi). Koordinate: OSM node 5312456219.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Capital Hotel',
  'Cara Lazara 3, 11000 Beograd',
  'https://capitalhotel.rs/',
  '+381 69 1400200',
  'Capital Hotel je u Ulici cara Lazara, na nekoliko koraka od Knez Mihailove. Rezervacioni sistem hotela navodi da su ljubimci dozvoljeni, ali veličinu psa i doplatu hotel ne objavljuje, pa ih dogovorite pre dolaska.',
  8, 4, 1, 2, 44.818677, 20.454170
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Capital Hotel' AND iuo_obrisan IS NULL
);

-- --- Hotel Bohemian Garni ------------------------------------------------------
-- Izvor: check24 ("Haustiere erlaubt", na upit, "Futternapf"). Sajt hotela ne
-- pominje ljubimce. Koordinate: OSM node 9131128915.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Hotel Bohemian Garni',
  'Skadarska 40c, 11000 Beograd',
  'https://bohemian.rs/',
  '+381 60 4064736',
  'Hotel Bohemian Garni je u Skadarskoj ulici, u srcu Skadarlije. Prema portalima za rezervaciju ljubimci su dozvoljeni na upit, a posuda za hranu je obezbeđena. Veličinu psa i doplatu hotel ne navodi, pa ih proverite pri rezervaciji.',
  8, 4, 1, 2, 44.818323, 20.465378
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Hotel Bohemian Garni' AND iuo_obrisan IS NULL
);

-- --- Maison Royale -------------------------------------------------------------
-- Izvor: maisonroyale.rs ("...nemojte oklevati da ih povedete sa sobom jer je
-- nas smestaj pet friendly"). Uslovi nisu navedeni; sajt je iz 2019. Telefon:
-- sajt hotela (OSM ima drugi). Koordinate: OSM way 38575532.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Maison Royale',
  'Kneza Mihaila 52, 11000 Beograd',
  'https://www.maisonroyale.rs/',
  '+381 65 3900049',
  'Maison Royale je hotel u zgradi iz 1880. godine u Knez Mihailovoj ulici, blizu Kalemegdana. Na svom sajtu se predstavlja kao pet friendly, ali veličinu psa i doplatu ne navodi, pa ih proverite pri rezervaciji.',
  8, 4, 1, 2, 44.819580, 20.454193
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Maison Royale' AND iuo_obrisan IS NULL
);


-- =============================================================================
-- NIS
-- =============================================================================

-- --- Hotel Nais ----------------------------------------------------------------
-- Spisak kaze "Veliki Drenovac" (tako ga vodi Hotels.com) -- pogresno: hotel je
-- u Vrtistu, Grad Nis, gradska opstina Crveni Krst (OSM way u granicama
-- Vrtista, postanski broj 18211). Izvor: Expedia/Hotels.com isecci (15 EUR po
-- ljubimcu po danu), Trip.com (na upit, uz doplatu; recenzija iz 2024. o
-- porodici sa dva psa). Sajt hotela ne pominje ljubimce; terasa je
-- restoranska -> bas_id 2. Koordinate: OSM way 322625832.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Hotel Nais',
  'Autoput Niš–Beograd bb, 18211 Vrtište',
  'https://www.hotelnais.com/',
  '+381 66 8611133',
  'Hotel Nais je na autoputu Beograd–Niš kod Vrtišta, desetak kilometara od centra Niša, i ima restoran sa terasom i spa centar. Prema portalima za rezervaciju ljubimci su dozvoljeni uz doplatu od 15 € po ljubimcu dnevno. Ograničenje veličine nije navedeno, pa većeg psa najavite unapred.',
  34, 4, 1, 2, 43.383892, 21.809005
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Hotel Nais' AND iuo_obrisan IS NULL
);


-- =============================================================================
-- NOVI SAD
-- =============================================================================

-- --- Hotel Leopold I -----------------------------------------------------------
-- Izvor: leopoldns.com/garni/ i /superior/ ("Hotel srdacno docekuje kucne
-- ljubimce, osim u prostorijama restorana"); Trip.com (na upit, uz doplatu),
-- HRS. Hotels.com/Expedia i jedan check24 oglas kazu "No pets" -- sajt hotela
-- ima prednost. Postanski broj se razlikuje po izvorima -> izostavljen.
-- Koordinate: OSM way 144081662 (Petrovaradin).

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Hotel Leopold I',
  'Petrovaradinska tvrđava bb, Petrovaradin',
  'https://www.leopoldns.com/',
  '+381 21 4887878',
  'Hotel Leopold I je na Petrovaradinskoj tvrđavi, iznad Dunava. Prema sajtu hotela kućni ljubimci su dobrodošli svuda osim u restoranu. Ograničenje veličine nije navedeno, a portali za rezervaciju pominju doplatu. Pojedini portali i dalje pišu da ljubimci nisu dozvoljeni, pa rezervišite direktno kod hotela.',
  26, 4, 1, 2, 45.252020, 19.861436
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Hotel Leopold I' AND iuo_obrisan IS NULL
);

-- --- Hotel Zenit ---------------------------------------------------------------
-- Izvor: hotelzenit.co.rs/smestaj/ ("Postoje posebne sobe koje mogu primati i
-- kucne ljubimce u skladu sa kucnim redom"). Trip.com, Expedia i Hotels.com
-- kazu "pets not allowed" -- sajt hotela ima prednost. Velicina i doplata nisu
-- navedeni. Koordinate: OSM way 138363705.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Hotel Zenit',
  'Zmaj Jovina 8, 21000 Novi Sad',
  'https://hotelzenit.co.rs/',
  '+381 21 6621444',
  'Hotel Zenit je u Zmaj Jovinoj ulici, u pešačkoj zoni centra Novog Sada. Prema sajtu hotela ljubimci mogu da borave u posebnim sobama, po kućnom redu hotela, a veličinu psa i doplatu hotel ne navodi. Portali za rezervaciju pišu da ljubimci nisu dozvoljeni, pa sobu za boravak sa psom rezervišite direktno kod hotela.',
  15, 4, 1, 2, 45.255452, 19.847249
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Hotel Zenit' AND iuo_obrisan IS NULL
);

-- --- Garni hotel Garson Lux ----------------------------------------------------
-- Izvor: garsonlux.rs, rezervacioni sistem hotela ("Veliki kucni ljubimac
-- rsd1750 / Mali kucni ljubimac rsd1200", po danu, cenovnik od 1.1.2025) ->
-- prima velike ljubimce, sta_id 3. check24 i Hotels.com: 1 ljubimac po sobi,
-- 10 EUR po danu. Telefon: sajt hotela (portali imaju stariji 021 467 710).
-- Koordinate: Google Maps pin sa sajta hotela (OSM ima samo zgradu, way
-- 391373590).

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Garni hotel Garson Lux',
  'Teodora Pavlovića 30, 21000 Novi Sad',
  'https://www.garsonlux.rs/',
  '+381 21 3990209',
  'Garni hotel Garson Lux je u Ulici Teodora Pavlovića, u Adamovićevom naselju, i prima i male i velike ljubimce. Prema cenovniku hotela doplata je 1.200 RSD dnevno za malog i 1.750 RSD dnevno za velikog ljubimca, a portali za rezervaciju navode jednog ljubimca po sobi.',
  15, 4, 3, 2, 45.243887, 19.821377
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Garni hotel Garson Lux' AND iuo_obrisan IS NULL
);

-- --- Garni hotel Garden --------------------------------------------------------
-- Izvor: hotelgarden.rs/cenovnik/ ("sa radoscu prima vase kucne ljubimce do
-- 4kg sa adekvatnom opremom za spavanje"). check24/Expedia: 2 kg i "10 RSD"
-- doplata -- ocigledna greska u feed-u, otud i u spisku; iznos nije poznat.
-- Koordinate: OSM way 301635647 (zgrada Primorska 50).

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Garni hotel Garden',
  'Primorska 50, 21000 Novi Sad',
  'https://www.hotelgarden.rs/',
  '+381 64 1371371',
  'Garni hotel Garden je u Primorskoj ulici, na Klisi. Prema cenovniku hotela primaju ljubimce do 4 kg, uz odgovarajuću opremu za spavanje ljubimca. Iznos doplate hotel ne navodi, pa ga proverite pri rezervaciji.',
  15, 4, 1, 2, 45.283549, 19.824570
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Garni hotel Garden' AND iuo_obrisan IS NULL
);

-- --- Hotel Veliki --------------------------------------------------------------
-- Izvor: hotelvelikinovisad.com/en/faq/ ("Yes we allow smaller pets.
-- Additional fee for pets is 10 EUR/day. It is not allowed to leave your pet
-- unattended in the room."); check24 1.200 RSD po noci, psi i macke. Spisak
-- kaze "any size" -- pogresno. Koordinate: mapa na sajtu hotela.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Hotel Veliki',
  'Nikole Pašića 24, 21000 Novi Sad',
  'https://hotelvelikinovisad.com/',
  '+381 21 4723840',
  'Hotel Veliki je u Ulici Nikole Pašića, u centru Novog Sada. Prema sajtu hotela primaju manje ljubimce, uz doplatu od 10 € dnevno, a ljubimac ne sme ostati sam u sobi.',
  15, 4, 1, 2, 45.258406, 19.845721
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Hotel Veliki' AND iuo_obrisan IS NULL
);

-- --- Garni hotel Dash ----------------------------------------------------------
-- Izvor: dash-star.com ("PET FRIENDLY Imate psa, macku ili nekog drugog
-- kucnog ljubimca? ... rado cemo ih ugostiti!"); check24 i Hotels.com isecak
-- (do 2 psa, do 10 kg svaki, 617 RSD po ljubimcu po danu, posude).
-- Koordinate: OSM way 298777440.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Garni hotel Dash',
  'Vršačka 11, 21000 Novi Sad',
  'https://dash-star.com/',
  '+381 21 403155',
  'Garni hotel Dash je u Vršačkoj ulici na Telepu i na svom sajtu se predstavlja kao pet friendly. Prema portalima za rezervaciju primaju do dva psa po sobi, do 10 kg svaki, uz doplatu od 617 RSD po ljubimcu dnevno, a posude za hranu i vodu su obezbeđene.',
  15, 4, 1, 2, 45.246508, 19.808552
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Garni hotel Dash' AND iuo_obrisan IS NULL
);

-- --- Hotel Novi Sad ------------------------------------------------------------
-- Izvor: Hotels.com isecak ("Pets allowed (1 total, up to 2 kg per pet)"),
-- Expedia isecak (995 RSD po ljubimcu po noci), Wotif, Kayak. Sajt hotela ne
-- pominje ljubimce. Koordinate: OSM way 144930623.

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Hotel Novi Sad',
  'Bulevar Jaše Tomića 1, 21000 Novi Sad',
  'https://hotelnovisad.rs/',
  '+381 21 442511',
  'Hotel Novi Sad je na Bulevaru Jaše Tomića, kod železničke stanice. Prema portalima za rezervaciju prima jednog ljubimca do 2 kg, uz doplatu od 995 RSD po noćenju, pa odgovara samo vrlo malim psima. Boravak ljubimca dogovorite sa hotelom unapred.',
  15, 4, 1, 2, 45.263388, 19.829078
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Hotel Novi Sad' AND iuo_obrisan IS NULL
);

-- --- Agape Villa ---------------------------------------------------------------
-- Izvor: agapevilla.rs/apartmani/ (svaka soba oznacena "Pet friendly"; "Objekat
-- ne poseduje lift"). Sobe bez kuhinje iznad restorana -> ugo_id 4. Telefon:
-- sajt objekta (OSM ima drugi, +381 21 3036800). Koordinate: OSM node
-- 5162363522 (restoran, ista zgrada).

INSERT INTO info_ug_obj
  (iuo_ime, iuo_adressa, iuo_link_web, iuo_telefon, iuo_opis,
   ops_id, ugo_id, sta_id, bas_id, latitude, longitude)
SELECT
  'Agape Villa',
  'Šafarikova 6, 21000 Novi Sad',
  'https://www.agapevilla.rs/',
  '+381 60 3320303',
  'Agape Villa ima sobe iznad restorana i vinoteke u Šafarikovoj ulici, u centru Novog Sada, i sve su označene kao pet friendly. Veličinu psa i doplatu objekat ne navodi, pa ih proverite pri rezervaciji. Objekat nema lift.',
  15, 4, 1, 2, 45.254352, 19.841082
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM info_ug_obj WHERE iuo_ime = 'Agape Villa' AND iuo_obrisan IS NULL
);


-- =============================================================================
-- PROVERA -- treba 21 red, imena sa ispravnim c/c/z/s/dj
-- =============================================================================

SELECT iuo_id, iuo_ime, ops_id, ugo_id, sta_id, bas_id, latitude, longitude
FROM info_ug_obj
WHERE iuo_obrisan IS NULL
  AND iuo_ime IN (
    'Garni hotel Mint', 'Side One Design Hotel', 'Airport Apartments',
    'Hotel Centar Balašević', 'Hotel Slodes', 'Hotel Vozarev', 'Balkan Hotel Garni',
    'Vila Senjak', 'Hotel Nobel Gallery', 'Capital Hotel', 'Hotel Bohemian Garni',
    'Maison Royale',
    'Hotel Nais',
    'Hotel Leopold I', 'Hotel Zenit', 'Garni hotel Garson Lux', 'Garni hotel Garden',
    'Hotel Veliki', 'Garni hotel Dash', 'Hotel Novi Sad', 'Agape Villa'
  )
ORDER BY ops_id, iuo_ime;


-- =============================================================================
-- OPCIONO -- `location` kao kod starih redova (vidi 06; neprovereno na Marsu)
-- =============================================================================

-- UPDATE info_ug_obj
-- SET location = ST_SRID(POINT(longitude, latitude), 4326)
-- WHERE iuo_obrisan IS NULL
--   AND ST_SRID(location) = 0
--   AND iuo_ime IN (
--     'Garni hotel Mint', 'Side One Design Hotel', 'Airport Apartments',
--     'Hotel Centar Balašević', 'Hotel Slodes', 'Hotel Vozarev', 'Balkan Hotel Garni',
--     'Vila Senjak', 'Hotel Nobel Gallery', 'Capital Hotel', 'Hotel Bohemian Garni',
--     'Maison Royale',
--     'Hotel Nais',
--     'Hotel Leopold I', 'Hotel Zenit', 'Garni hotel Garson Lux', 'Garni hotel Garden',
--     'Hotel Veliki', 'Garni hotel Dash', 'Hotel Novi Sad', 'Agape Villa'
--   );
