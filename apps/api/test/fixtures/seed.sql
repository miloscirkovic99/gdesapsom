-- TEST ONLY: invented places for the API integration tests (apps/api/test).
-- Runs after legacy-stub.sql and db/06_planer_i_zimovanje.sql.
SET NAMES utf8mb4;
INSERT INTO info_ug_obj (iuo_id, iuo_ime, iuo_adressa, latitude, longitude, iuo_opis, ops_id, ugo_id, sta_id, bas_id, iuo_telefon) VALUES
 (11,'TEST Kafić Dorćol','Cara Dušana 1','44.8231','20.4612','null',1,1,3,1,NULL),
 (12,'TEST Kafeterija','Knez Mihailova 2','44,8180','20,4570','Mala kafeterija.',1,7,1,2,NULL),
 (21,'TEST Restoran','Skadarska 3','44.8170','20.4650','',1,2,3,1,NULL),
 (22,'TEST Splav','Ušće bb','not a number','20.4',NULL,2,8,2,1,NULL),
 (31,'TEST Bar','Strahinjića bana 5','44.8200','20.4600',NULL,1,5,3,2,NULL),
 (41,'TEST Teretana','x','44.82','20.46',NULL,1,6,3,2,NULL),
 (51,'TEST Kafić NS','Zmaj Jovina 4','45.2560','19.8450',NULL,3,1,3,1,NULL),
 (101,'TEST Hotel Kopaonik','Suvo Rudište','43.2860','20.8100',NULL,4,3,3,1,NULL),
 (102,'TEST Apartman Kopaonik','Brzeće','43.2870','20.8110',NULL,4,4,1,1,NULL),
 (103,'TEST Restoran Kopaonik','Centar','43.2861','20.8101',NULL,4,2,3,2,NULL),
 (104,'TEST obrisan','x','43.28','20.81',NULL,4,3,3,1,NULL),
 (105,'TEST Motel Kopaonik','Jaram','43.2880','20.8120',NULL,4,10,3,1,NULL),
 (106,'TEST Restoran bez pasa unutra','Centar 2','43.2862','20.8102',NULL,4,2,3,1,NULL),
 (13,'TEST Kafić Vračar','Njegoševa 7','44.8020','20.4780',NULL,2,1,3,1,NULL);
UPDATE info_ug_obj SET iuo_obrisan = '2026-01-01 00:00:00' WHERE iuo_id = 104;
INSERT INTO lokal_detalji (iuo_id, kvart, radno_vreme, psi_unutra, max_velicina_psa, premium, doplata_za_psa, doplata_valuta, doplata_po, max_pasa, pas_sme_sam_u_sobi, affiliate_url, destinacija_id) VALUES
 (11,'Dorćol','{"pon":[["08:00","23:00"]],"sub":[["09:00","23:00"]],"ned":[]}',1,'veliki',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
 (101,NULL,NULL,NULL,'svi',1,10,'EUR','noc',2,1,'https://partner.example/101',1),
 (102,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,1),
 (103,NULL,NULL,1,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,1),
 (105,NULL,NULL,NULL,'svi',0,NULL,NULL,NULL,NULL,0,NULL,1),
 (106,NULL,NULL,0,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,1);
INSERT INTO parkovi (par_id, par_ime, par_lokacija, ops_id, par_accepted, par_declined) VALUES
 (1,'TEST Park Ušće','Ušće',2,1,0), (2,'TEST odbijen','x',2,1,1), (3,'TEST Park Tašmajdan','Tašmajdan',1,1,0), (4,'TEST Kalemegdan','Kalemegdan',1,1,0);
INSERT INTO park_detalji (par_id, lat, lng, ogradjeno) VALUES (1, 44.8210, 20.4400, 1), (3, 44.8100, 20.4720, 0), (4, 44.8230, 20.4510, NULL);
INSERT INTO vetclinics (vetc_id, vetc_naziv, vetc_telefon, vetc_adresa, grd_id) VALUES
 (1,'TEST Vet Raška','036 000 000','Raška 1',3), (2,'TEST Vet BG','011 000','BG',1), (3,'TEST Vet daleko','010 000','Pirot',1);
INSERT INTO veterinar_detalji (vetc_id, lat, lng) VALUES (1, 43.2860, 20.6150), (2, 44.8000, 20.4600), (3, 43.1530, 22.5860);
INSERT INTO staza (destinacija_id, naziv, lat, lng, duzina_km, opis) VALUES
 (1,'TEST staza Kopaonik',43.2900,20.8000,4.5,'Kratka staza kroz šumu.'),
 (1,'TEST staza Pančićev vrh',43.2700,20.8300,NULL,NULL);
UPDATE destinacija SET gondola_psi = 1, gondola_provereno = '2026-10-01' WHERE slug = 'kopaonik';
