# Implementacija funkcionalnosti „Šta možemo danas?“ – Gde sa psom

Ponašaj se kao senior product designer, UX/UI dizajner i senior full-stack developer.

Želim da implementiramo novu funkcionalnost na sajtu https://gdesapsom.com pod nazivom **„Šta možemo danas?“**.

Cilj je da napravimo intuitivnu, korisnu i vizuelno privlačnu funkcionalnost koja će postati jedan od glavnih razloga zbog kojih će se korisnici vraćati na Gde sa psom.

Nemoj odmah početi sa kodiranjem. Prvo detaljno analiziraj postojeći projekat, arhitekturu, dizajn, komponente, API-je, bazu lokacija i postojeću poslovnu logiku. Nakon analize predstavi mi konkretan plan implementacije zasnovan na stvarnom kodu projekta. **Nemoj započinjati implementaciju dok ne završiš analizu i ne predstaviš plan.**

---

## 1. Ideja i cilj

„Šta možemo danas?“ treba da pomogne vlasniku psa da brzo pronađe zanimljivu aktivnost ili mesto koje može da poseti zajedno sa svojim psom.

Ne želim još jednu klasičnu pretragu lokacija sa filterima.

Želim da korisnik dođe na sajt i dobije odgovor na pitanje:

**„Gde danas možemo zajedno?“**

Korisnik ne treba da zna tačno šta traži. Sistem treba da mu pomogne da otkrije zanimljive mogućnosti.

Primeri:

- Želim na kafu ili ručak sa psom.
- Želim da odem u prirodu.
- Želim na jednodnevni izlet.
- Želim da otkrijem neko novo mesto.
- Želim da provedem aktivan dan sa psom.
- Nemam ideju, predloži mi nešto.

Najvažnije je da iskustvo bude jednostavno, brzo i korisno, bez obavezne registracije.

## 2. UX – korisnički tok

Korisnički tok mora biti maksimalno jednostavan. Nemoj korisnika opterećivati velikim brojem koraka ili obaveznim unosom podataka.

### Korak 1 – Izbor aktivnosti

Prikaži vizuelno privlačne kartice sa sledećim opcijama:

1. Kafa ili ručak.
2. Priroda i šetnja.
3. Izlet i putovanje.
4. Aktivnosti i zabava.
5. Nešto novo.
6. Iznenadi nas.

Korisnik može da izabere jednu ili više opcija.

Opcija „Iznenadi nas“ treba da omogući kombinovane preporuke iz različitih kategorija.

### Korak 2 – Lokacija

Automatski pokušaj da dobiješ lokaciju korisnika uz njegovu dozvolu.

Ako korisnik ne dozvoli pristup lokaciji, omogući ručni izbor grada.

Podržati:

- Trenutnu lokaciju.
- Ručni izbor grada.
- Pretragu po gradu.
- Opciju „Nije mi bitna udaljenost“.

Nemoj zahtevati pristup lokaciji pre nego što korisnik razume vrednost funkcionalnosti.

### Korak 3 – Informacije o psu

Ovaj korak treba da bude opcionalan.

Omogućiti izbor:

- Mali pas.
- Srednji pas.
- Veliki pas.
- Nije bitno.

Posebno obrati pažnju na postojeću logiku veličine pasa u bazi.

**Nemoj uvoditi novu, nepovezanu logiku za veličinu pasa.** Iskoristi postojeća pravila i proveri kako se trenutno primenjuju u API-ju i frontend aplikaciji.

Važna pravila:

- Ako korisnik izabere veličinu psa, filtriranje mora poštovati postojeća pravila kompatibilnosti.
- Ako za lokaciju ne postoji podatak o veličini psa, nemoj pretpostavljati da su svi psi dobrodošli.
- Nepoznate informacije moraju biti jasno označene.
- Ako korisnik preskoči ovaj korak, nemoj nepotrebno isključivati lokacije zbog nepoznatih podataka, ali nemoj ni tvrditi da su pogodne za sve pse.

### Korak 4 – Udaljenost

Omogućiti jednostavan izbor:

- Do 5 km.
- Do 15 km.
- Do 30 km.
- Do 50 km.
- Nije mi bitna udaljenost.

Podrazumevana vrednost treba da bude razumna za lokalne aktivnosti.

Koristi postojeću implementaciju geografske pretrage i izračunavanja udaljenosti. Nemoj praviti paralelnu logiku ako već postoji.

### Korak 5 – Rezultati

Prikazati 3–5 najboljih predloga.

Svaki predlog treba da sadrži:

- Fotografiju lokacije.
- Naziv.
- Grad i udaljenost, ako je poznata.
- Kategoriju.
- Kratak opis zašto je preporučena.
- Informaciju o tome koji psi su dobrodošli, ako je poznata.
- Informaciju da li je dozvoljen ulazak unutra ili samo na terasi, ako je poznata.
- Informaciju da li postoji činija sa vodom, ako je poznato.
- Link ka detaljima lokacije.
- Opciju za otvaranje navigacije.

Nemoj prikazivati neproverene informacije kao činjenice.

Frontend mora da koristi originalne podatke lokacije iz naše baze. AI generisani tekst može da služi samo kao objašnjenje preporuke, a ne kao zamena za stvarne podatke.

---

## 3. Claude API – inteligentne preporuke

Imamo dostupan Claude API kredit i želim da ga iskoristimo za inteligentni deo ove funkcionalnosti.

Želim da Claude pomogne u izboru i kombinovanju najboljih preporuka, ali **lokalna baza Gde sa psom mora uvek biti primarni i jedini izvor lokacija**.

Claude ne sme samostalno da izmišlja lokacije, nazive objekata, adrese, radno vreme, pogodnosti ili pravila za pse.

### 3.1. Kako treba da funkcioniše sistem

Predložena arhitektura:

1. Korisnik bira aktivnosti, lokaciju, veličinu psa i udaljenost.
2. Backend prima strukturirane parametre.
3. Backend pretražuje postojeću lokalnu bazu.
4. Backend primenjuje postojeće filtere i pravila kompatibilnosti.
5. Rezultati se rangiraju i izdvajaju relevantni kandidati.
6. Ako ima smisla, relevantni kandidati se prosleđuju Claude API-ju.
7. Claude analizira rezultate, rangira ih i predlaže kombinacije aktivnosti.
8. Backend validira Claude odgovor.
9. Frontend prikazuje stvarne podatke iz baze uz AI objašnjenja.

**Važno: U ovoj verziji Claude API se poziva tek nakon lokalne pretrage.**

Pošto korisnik u MVP-u bira aktivnosti kroz strukturirani interfejs, nije potrebno pozivati Claude da bi razumeo osnovne parametre pre pretrage.

Prirodni unos teksta, gde korisnik samostalno opisuje šta želi, može se dodati kao zasebno unapređenje u budućnosti.

### 3.2. Šta Claude treba da radi

Claude treba da:

- Analizira korisnikove izabrane aktivnosti i želje.
- Analizira relevantne lokacije iz baze.
- Izabere najbolje kombinacije.
- Rangira preporuke prema relevantnosti.
- Predloži logičan redosled aktivnosti.
- Napiše kratko i prirodno objašnjenje zašto je određena lokacija dobar izbor.
- Pomogne u kreiranju jednostavnog plana dana.

Claude sme da koristi isključivo lokacije koje su mu prosleđene iz naše baze.

### 3.3. Ograničenja i validacija AI odgovora

Backend mora da proveri da li svaki ID lokacije koji Claude vrati zaista postoji u skupu rezultata koji mu je prosleđen.

Ne prihvatati:

- Izmišljene ID-jeve.
- Lokacije koje nisu u prosleđenim rezultatima.
- Izmišljene nazive ili adrese.
- Izmišljeno radno vreme.
- Izmišljene pogodnosti.
- Izmišljena pravila o veličini pasa.
- Tvrdnje koje nisu podržane podacima iz baze.

Claude može da vrati ID lokacije, redosled preporuke i objašnjenje, ali frontend mora da dobije originalne podatke iz baze.

Objašnjenje preporuke mora biti zasnovano na informacijama koje su zaista prosleđene modelu. Ako nema dovoljno informacija, Claude ne sme da izmišlja razlog.

Koristi strukturiran JSON odgovor sa jasno definisanom šemom.

Ako odgovor nije validan, sadrži nepostojeće ID-jeve ili ne može da se parsira, koristi rezervni sistem rangiranja bez AI-ja.

### 3.4. Optimizacija troškova Claude API-ja

Pošto imamo ograničen API kredit, obrati pažnju na sledeće:

- Ne pozivati Claude API za svaku promenu filtera.
- Ne slati kompletnu bazu lokacija modelu.
- Prosleđivati samo relevantne kandidate, okvirno 10–30 lokacija kada ih ima dovoljno.
- Ne slati fotografije i nepotrebne informacije.
- Koristiti strukturiran JSON odgovor.
- Ne koristiti AI kada klasična pretraga može da završi posao.
- Razmotriti keširanje ponovljenih zahteva.
- Koristiti odgovarajući ekonomičan Claude model za ovaj zadatak.
- Ograničiti maksimalan broj tokena odgovora.
- Izbeći nepotrebne ponovljene pozive.

Nemoj uvoditi dodatne AI agente ili kompleksan multi-agent sistem. Za ovu funkcionalnost dovoljan je jedan dobro definisan AI poziv nakon lokalne pretrage.

### 3.5. Rezervni režim bez AI-ja

Ako Claude API nije dostupan, ima grešku, prekorači limit ili je potrošen kredit:

- Lokalna pretraga mora normalno da funkcioniše.
- Prikazati rezultate prema klasičnom rangiranju.
- Ne blokirati korisnika.
- Ne prikazivati generičku grešku ako možemo da ponudimo rezultate.

AI treba da unapredi iskustvo, ali ne sme da bude uslov za funkcionisanje osnovne pretrage.

### 3.6. Bezbednost i konfiguracija

Pre korišćenja Claude API-ja proveri postojeću integraciju, konfiguraciju, način čuvanja API ključa i dostupne modele.

- API ključ ne sme biti dostupan u frontend aplikaciji.
- Claude API pozive izvršavati isključivo na backendu ili kroz postojeći bezbedan server-side mehanizam.
- Ne hardkodovati API ključ.
- Koristiti postojeće konfiguracione i environment variable obrasce.
- Ne uvoditi novu integraciju ako već postoji odgovarajuća.

---

## 4. Dodatna funkcionalnost – kompletan plan dana

Pored pojedinačnih preporuka, želim mogućnost kreiranja jednostavnog plana dana.

Primer:

**Naš plan za danas**

1. Prvo šetnja u prirodi.
2. Nakon toga kafa na pet-friendly terasi.
3. Na kraju ručak u restoranu koji prima pse.

Svaka stavka mora biti povezana sa stvarnom lokacijom iz baze.

Claude može da predloži redosled aktivnosti i objasni zašto je ta kombinacija zanimljiva.

Nemoj izmišljati:

- Radno vreme.
- Dostupnost.
- Vreme potrebno za obilazak.
- Udaljenost.
- Vreme polaska ili dolaska.

Ako nemamo provereno radno vreme, nemoj prikazivati konkretne termine kao potvrđene.

Ako je radno vreme dostupno, koristi postojeće podatke i jasno razlikuj objavljeno radno vreme od potvrđene trenutne dostupnosti.

Plan treba da bude vizuelno jednostavan i da korisnik može lako da otvori svaku lokaciju.

Ako nema dovoljno odgovarajućih lokacija za kompletan plan, prikaži samo aktivnosti za koje postoje relevantni rezultati.

---

## 5. UI/UX dizajn

Želim moderan, čist i intuitivan dizajn koji se uklapa u postojeći vizuelni identitet Gde sa psom.

Posebno obrati pažnju na:

- Mobile-first pristup.
- Jasnu hijerarhiju informacija.
- Velike i lako razumljive kartice.
- Kvalitetne fotografije.
- Minimalan broj koraka.
- Suptilne animacije.
- Jasne loading, empty i error state-ove.
- Brz prelazak između koraka bez treperenja ekrana.
- Dosledan dizajn sa ostatkom sajta.

Nemoj praviti generički AI dashboard izgled.

Ne želim previše boja, gradijenata, ikonica, nepotrebnih kartica i dekorativnih elemenata.

Dizajn treba da deluje kao ozbiljan, moderan turistički proizvod.

Pre implementacije pogledaj postojeći dizajn sajta i iskoristi postojeće komponente, stilove i dizajn obrasce gde god je to moguće.

Nemoj menjati izgled ostatka sajta zbog ove funkcionalnosti.

---

## 6. Dodatne mogućnosti

Razmotri sledeće funkcionalnosti, ali ih nemoj implementirati ako bi nepotrebno komplikovale prvu verziju:

- „Pronađi mi alternativu“ ako korisniku ne odgovara predlog.
- „Još predloga“ za prikaz novih rezultata.
- Deljenje plana sa prijateljima.
- Čuvanje plana bez obavezne registracije, na primer lokalno u browseru.
- Prikaz svih preporuka na mapi.
- Predlozi za vikend.
- Pamćenje poslednjeg izbora u browseru.
- Prirodni unos teksta, gde korisnik svojim rečima opisuje šta želi, a sistem to pretvara u parametre za lokalnu pretragu.

Ove mogućnosti prvo proceni iz ugla korisničke vrednosti i složenosti implementacije.

Prioritet je kvalitetan MVP, a ne veliki broj funkcionalnosti.

---

## 7. Tehnička ograničenja

Pre implementacije analiziraj postojeću arhitekturu i koristi postojeće obrasce.

- Koristi postojeći API i bazu lokacija.
- Iskoristi postojeće kategorije i pravila za veličinu pasa.
- Ne dupliciraj postojeće funkcionalnosti.
- Ne menjaj postojeću poslovnu logiku.
- Ne pravi izmene na backendu ako postojeći API već podržava potrebne podatke.
- Ako je backend izmena neophodna, objasni zašto i predloži najmanju potrebnu izmenu.
- Ne uvodi nove biblioteke bez stvarne potrebe.
- Obrati pažnju na performanse i broj API poziva.
- Nemoj učitavati sve lokacije odjednom.
- Ne zahtevaj registraciju korisnika.
- Iskoristi postojeće komponente i stilove gde god je moguće.
- Nemoj menjati nepovezane delove aplikacije.
- Nemoj uklanjati ili menjati postojeće funkcionalnosti.

Posebno proveri kako funkcionišu:

- Postojeća pretraga lokacija.
- Geolokacija.
- Filtriranje po gradu i koordinatama.
- Dog-size pravila.
- Detalji pojedinačnih lokacija.
- Fotografije lokacija.
- Navigacija do lokacija.
- Postojeći AI alat „Putovanje sa psom“.
- Postojeći način komunikacije frontend-backend.

Ako postojeći API ne podržava sve što nam je potrebno, prvo identifikuj konkretno ograničenje i predloži najmanju moguću izmenu.

Nemoj unapred pretpostavljati kako funkcionišu postojeći endpointi. Proveri stvarni kod i postojeće modele podataka.

---

## 8. SEO i rast

Funkcionalnost treba da bude dostupna kroz posebnu indeksabilnu stranicu, sa smislenim:

- Title.
- Meta description.
- Open Graph podacima.
- Internim linkovima sa početne strane i relevantnih postojećih stranica.

Ne indeksirati korisničke kombinacije filtera kao veliki broj dupliranih stranica.

Proveri postojeću SEO arhitekturu i implementiraj rešenje u skladu sa postojećim načinom rada sajta.

Cilj je da korisnici ovu funkcionalnost lako pronađu i da je požele ponovo koristiti.

---

## 9. Faze implementacije

Radi sledećim redosledom.

### Faza 1 – Analiza

Pre bilo kakvog kodiranja:

- Pregled arhitekture.
- Pregled postojećeg UI-ja.
- Pregled API-ja i modela podataka.
- Pregled postojeće pretrage i filtriranja.
- Pregled pravila za veličinu pasa.
- Pregled postojeće Claude integracije.
- Identifikacija komponenti koje mogu da se iskoriste.
- Identifikacija eventualnih ograničenja.
- Predlog konkretne implementacije.

Na kraju ove faze predstavi:

1. Kako trenutno funkcioniše relevantan deo aplikacije.
2. Koje postojeće komponente i API-je možemo da iskoristimo.
3. Koje izmene su potrebne.
4. Kako će izgledati tok podataka.
5. Kako će biti organizovana Claude integracija.
6. Koje fajlove i module planiraš da menjaš.
7. Eventualne rizike i ograničenja.

**Zaustavi se nakon analize i predstavi plan. Nemoj započinjati implementaciju dok ne pregledam plan i ne potvrdim nastavak.**

### Faza 2 – Implementacija MVP-a

Nakon odobrenja plana implementiraj:

- Izbor aktivnosti.
- Izbor lokacije.
- Opcioni izbor veličine psa.
- Izbor udaljenosti.
- Pretragu stvarnih lokacija iz baze.
- Filtriranje prema postojećim pravilima.
- Claude analizu i rangiranje relevantnih rezultata.
- Validaciju Claude odgovora.
- Rezervno rangiranje bez AI-ja.
- Prikaz personalizovanih preporuka.

### Faza 3 – Plan dana

Nakon stabilnog MVP-a:

- Kombinovanje više aktivnosti.
- Kreiranje jednostavnog plana sa stvarnim lokacijama.
- Prikaz redosleda aktivnosti.
- Mapa i navigacija.

### Faza 4 – Poliranje

- Mobile UX.
- Loading i empty state.
- Error state.
- Performanse.
- SEO.
- Provera svih korisničkih scenarija.
- Provera rada bez Claude API-ja.
- Provera rada kada nema odgovarajućih lokacija.

---

## 10. Kriterijumi uspeha

Funkcionalnost je uspešno implementirana kada:

1. Korisnik može da dobije preporuke bez registracije.
2. Do preporuka može da stigne za nekoliko sekundi.
3. Sve preporučene lokacije postoje u našoj bazi.
4. Ne prikazuju se izmišljene informacije.
5. Poštuju se postojeća ograničenja veličine pasa.
6. Nepoznate informacije se ne predstavljaju kao proverene.
7. Claude API ne može da blokira osnovno funkcionisanje pretrage.
8. Korisnik može da otvori detalje svake lokacije.
9. Navigacija vodi do stvarne lokacije.
10. Iskustvo je odlično na mobilnom uređaju.
11. Funkcionalnost ne narušava postojeći sajt.
12. Nema nepotrebnog povećanja broja API poziva ili troškova.

---

## 11. Najvažnije smernice

Nemoj praviti još jedan filter za pretragu.

Napravi iskustvo koje korisniku daje ideju šta može da radi sa svojim psom, čak i kada sam nema nikakvu ideju.

Lokalna baza Gde sa psom je izvor istine. Claude je inteligentni sloj koji pomaže da se postojeće lokacije bolje povežu, rangiraju i predstave korisniku.

Nemoj komplikovati arhitekturu. Iskoristi postojeći kod, API-je i poslovnu logiku.

**Prvo analiziraj projekat i predstavi konkretan plan. Sačekaj moje odobrenje pre nego što počneš sa implementacijom.**