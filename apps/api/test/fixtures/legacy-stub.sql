-- TEST ONLY: legacy tables as the handlers in apps/api/v2 use them (the real
-- schema is not in the repo). Types are guesses: int(11) ids, text coordinates.
SET NAMES utf8mb4;
CREATE TABLE grad (grd_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, grd_ime VARCHAR(100), drz_id INT NULL);
CREATE TABLE opstina (ops_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, ops_ime VARCHAR(100), grd_id INT);
CREATE TABLE ugo_objekat (ugo_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, ugo_ime VARCHAR(60));
CREATE TABLE starost (sta_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, sta_ime VARCHAR(120), sta_meseci INT NULL);
CREATE TABLE basta (bas_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, bas_naziv VARCHAR(60));
CREATE TABLE info_ug_obj (
  iuo_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, iuo_ime VARCHAR(200), iuo_adressa VARCHAR(300), iuo_link_web VARCHAR(500),
  iuo_slika_base64 LONGTEXT NULL, iuo_slika_base64_unutra LONGTEXT NULL, latitude VARCHAR(40) NULL, longitude VARCHAR(40) NULL,
  location VARCHAR(200) NULL, iuo_telefon VARCHAR(50) NULL, iuo_opis TEXT NULL, ops_id INT, ugo_id INT, sta_id INT, bas_id INT,
  iuo_obrisan DATETIME NULL, iuo_izmenjeno DATETIME NULL, pr_id INT NULL);
CREATE TABLE parkovi (par_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, par_ime VARCHAR(200), par_lokacija VARCHAR(300), ops_id INT,
  par_accepted TINYINT NULL, par_declined TINYINT NULL, par_opis TEXT NULL, par_slika LONGTEXT NULL);
CREATE TABLE vetclinics (vetc_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, vetc_naziv VARCHAR(200), vetc_telefon VARCHAR(50), vetc_adresa VARCHAR(300),
  grd_id INT, ops_id INT NULL, vetc_isdeleted DATETIME NULL);

INSERT INTO grad (grd_id, grd_ime) VALUES (1,'Beograd'),(2,'Novi Sad'),(3,'Raška'),(4,'Čajetina'),(5,'Bajina Bašta');
INSERT INTO opstina (ops_id, ops_ime, grd_id) VALUES (1,'Stari grad',1),(2,'Vračar',1),(3,'Novi Sad',2),(4,'Raška',3),(5,'Čajetina',4),(6,'Bajina Bašta',5);
INSERT INTO ugo_objekat (ugo_id, ugo_ime) VALUES (1,'Kafić'),(2,'Restoran'),(3,'Hotel'),(4,'Apartman'),(5,'Bar'),(6,'Teretana'),(7,'Kafeterija'),(8,'Splav'),(9,'Pab'),(10,'Motel'),(11,'Ostalo');
INSERT INTO starost (sta_id, sta_ime) VALUES (1,'Mali pas'),(2,'Mali pas i štenci većih rasa do 5 meseci starosti'),(3,'Svi psi');
INSERT INTO basta (bas_id, bas_naziv) VALUES (1,'sa baštom'),(2,'bez bašte');
CREATE TABLE korisnik (kor_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, kor_ime VARCHAR(100), kor_email VARCHAR(200), kor_admin TINYINT NOT NULL DEFAULT 0);
INSERT INTO korisnik (kor_id, kor_ime, kor_email, kor_admin) VALUES (1, 'Admin', 'admin@example.test', 1), (2, 'Korisnik', 'user@example.test', 0);
