# Nacrt: /putovanje-sa-psom-u-eu

**Status: NACRT — ne objavljivati pre provere.** Tekst je napisan 2026-10-19 iz izvoda zvaničnih stranica koje su se pojavile u rezultatima pretrage. Same stranice (EUR-Lex, food.ec.europa.eu, vet.minpolj.gov.rs) nisu mogle da se otvore iz okruženja u kome je nacrt pisan. Zato je svaka tvrdnja ispod vezana za izvor, a na kraju je spisak onoga što nije potvrđeno.

Kako se objavljuje:
1. Otvori svaki izvor iz tabele „Izvori" i uporedi tekst.
2. Prekopiraj JSON iz odeljka „Tekst za winter-content.json" u `apps/gde-sa-psom-portal/src/app/features/winter/winter-content.json`, pod ključ `euTravel`.
3. Čim `euTravel.sections` ima sadržaj, stranica postaje `index` i ulazi u sitemap. Isto pravilo primenjuju `isWinterPageIndexable` i `tools/generate-sitemap.mjs`.

Proveri i blog članak `/blog/nova-eu-pravila-putovanje-pas-april-2026`. Napisan je pre juna 2026. Ako kaže da je psu iz Srbije potreban test titra antitela, to više ne važi; stranica vodiča linkuje na njega.

## Tekst za winter-content.json

```json
{
  "intro": [
    "Od 22. aprila 2026. za putovanje psa iz Srbije u EU važe nova pravila, a od juna 2026. psu iz Srbije više nije potreban test titra antitela na besnilo. Ostali uslovi su ostali: mikročip, važeća vakcina protiv besnila, EU veterinarski sertifikat i ulazak preko graničnog prelaza određenog za kućne ljubimce.",
    "Pravila se menjaju. Pre polaska proveri ih kod Uprave za veterinu i na stranici Evropske komisije."
  ],
  "sections": [
    {
      "heading": "Šta je psu potrebno za ulazak u EU",
      "items": [
        "Mikročip po standardu ISO 11784/11785 (15 cifara).",
        "Važeća vakcina protiv besnila, data posle ugradnje čipa, kada je pas imao najmanje 12 nedelja.",
        "Najmanje 21 dan od završene prve vakcinacije do dana polaska.",
        "EU veterinarski sertifikat, koji u Srbiji izdaje nadležni veterinarski inspektor.",
        "Potpisana izjava vlasnika da putovanje nije komercijalno, priložena uz sertifikat.",
        "Ulazak preko graničnog prelaza određenog za ulazak kućnih ljubimaca.",
        "Za Finsku, Irsku, Maltu, Severnu Irsku i Norvešku: tretman protiv pantljičare kod veterinara, između 24 i 120 sati pre ulaska, upisan u sertifikat."
      ]
    },
    {
      "heading": "Test titra antitela više nije potreban",
      "paragraphs": [
        "Srbija je u junu 2026. dodata na EU listu zemalja iz kojih psi, mačke i tvorovi ulaze bez testa titra antitela na besnilo (Sprovedbena uredba (EU) 2026/1228). Ranije je trebalo uzeti krv najmanje 30 dana posle vakcine i čekati tri meseca od uzorka do izdavanja sertifikata. To više ne važi za pse koji putuju iz Srbije.",
        "Neki vodiči i stranice laboratorija još opisuju staro pravilo. Ako putuješ preko zemlje koja nije na EU listi, pitaj veterinarskog inspektora da li ti treba izjava da pas tokom tranzita nije bio u kontaktu sa drugim životinjama."
      ]
    },
    {
      "heading": "Koliko važi sertifikat",
      "paragraphs": [
        "Sertifikat važi 10 dana od izdavanja do provere na granici EU. Posle provere važi do 6 meseci za kretanje kroz zemlje EU, ili do isteka vakcine protiv besnila ako ona ističe ranije.",
        "Od 1. oktobra 2026. izdaje se samo novi model sertifikata. Sertifikati po starom modelu, izdati pre 1. oktobra 2026, prihvataju se do 31. marta 2027."
      ]
    },
    {
      "heading": "Pasoš za ljubimce nije dovoljan",
      "paragraphs": [
        "Srpski pasoš za ljubimce nije dokument za ulazak u EU; potreban je EU veterinarski sertifikat. EU pasoš za ljubimce mogu da dobiju samo vlasnici koji žive u nekoj zemlji EU, čak i ako vlasnik iz Srbije ima nekretninu u EU."
      ]
    },
    {
      "heading": "Granični prelazi za ljubimce",
      "paragraphs": [
        "Psi iz Srbije ulaze u EU samo preko prelaza koje je zemlja članica odredila za kućne ljubimce, gde se proveravaju dokumenta i čip."
      ],
      "items": [
        "Hrvatska, drumski: Bajakovo, Batina, Erdut, Ilok i Tovarnik; železnički: Tovarnik.",
        "Rumunija, drumski: Moravița."
      ]
    },
    {
      "heading": "Koliko pasa i ko putuje sa psom",
      "paragraphs": [
        "U jednom vozilu može najviše 5 kućnih ljubimaca. Više je dozvoljeno samo za takmičenja, izložbe i sportske događaje, uz pisani dokaz o prijavi i ako su životinje starije od 6 meseci.",
        "Pas putuje sa vlasnikom ili sa osobom koju vlasnik pismeno ovlasti. Tada vlasnik mora da putuje u roku od 5 dana od putovanja psa. Pas ne može da putuje sam kao nekomercijalno kretanje."
      ]
    }
  ],
  "faq": [
    {
      "question": "Da li je psu iz Srbije potreban test titra antitela za ulazak u EU?",
      "answer": "Ne. Od juna 2026. Srbija je na EU listi zemalja iz kojih psi ulaze bez testa titra antitela na besnilo. I dalje su potrebni mikročip, važeća vakcina protiv besnila i EU veterinarski sertifikat."
    },
    {
      "question": "Koliko pre puta pas mora da bude vakcinisan protiv besnila?",
      "answer": "Najmanje 21 dan od završene prve vakcinacije do dana polaska. Pas mora da ima čip pre vakcine i najmanje 12 nedelja kada se vakciniše."
    },
    {
      "question": "Koliko važi EU veterinarski sertifikat?",
      "answer": "10 dana od izdavanja do provere na granici EU, a posle toga do 6 meseci za kretanje kroz EU, ili do isteka vakcine ako ona ističe ranije."
    },
    {
      "question": "Mogu li da uđem u EU sa srpskim pasošem za ljubimce?",
      "answer": "Ne. Za ulazak iz Srbije potreban je EU veterinarski sertifikat koji izdaje nadležni veterinarski inspektor. EU pasoš mogu da dobiju samo vlasnici koji žive u EU."
    },
    {
      "question": "Koliko pasa mogu da povedem u EU?",
      "answer": "Najviše 5 kućnih ljubimaca u jednom vozilu, osim za takmičenja, izložbe i sportske događaje, uz dokaz o prijavi."
    }
  ]
}
```

## Izvori

| Tvrdnja | Izvor | Šta proveriti |
| --- | --- | --- |
| Nova pravila od 22. 4. 2026. (Delegirana uredba 2026/131 umesto 576/2013) | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32026R0131, https://easvo.fve.org/from-22-april-2026-new-rules-for-the-non-commercial-movement-of-dogs-cats-and-ferrets-will-apply/ | datum primene |
| Srbija bez testa titra (2026/1228, Aneks II uz 2026/636) | https://food.ec.europa.eu/animals/live-animal-movements/dogs-cats-and-ferrets/bringing-pet-eu-non-eu-country_en, https://minpolj.gov.rs (vest od 17. 6. 2026), https://www.srbija.gov.rs/vest/981241/srbija-na-listi-zemalja-bez-obaveznog-titra-antitela-na-besnilo.php, https://www.vet.minpolj.gov.rs/kretanje-kucni-ljubimci-nije-potreban-titat-antitela-na-besnilo-za-evropsku-uniju/ | tačan datum od kog važi (jedan izvod pominje 19. 6. 2026) |
| Čip ISO 11784/11785; vakcina posle čipa; 12 nedelja; 21 dan | stranica EK iznad; https://www.bmleh.de/EN/topics/animals/pets-and-zoo-animals/identity.html | da „vakcina ne sme biti pre čipa" stoji na stranici EK (izvod je to prepričao) |
| Sertifikat izdaje veterinarski inspektor RS | https://www.vet.minpolj.gov.rs/najcesca-pitanja-i-odgovori-kucni-ljubimci-evropska-unija/ | da li može i ovlašćeni privatni veterinar uz overu |
| 10 dana do granice, 6 meseci u EU ili do isteka vakcine | stranica EK iznad; Aneks III uz 2026/705 | — |
| Novi model sertifikata od 1. 10. 2026; stari važi do 31. 3. 2027. | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ%3AL_202600705, https://www.bavg.gv.at/en/import/living-animals/travel | oba datuma |
| Izjava vlasnika o nekomercijalnom putovanju | 2026/131; model u Aneksu V uz 2026/705 | koji deo Aneksa V |
| Srpski pasoš nije dovoljan; EU pasoš samo za stanovnike EU | https://food.ec.europa.eu/animals/live-animal-movements/dogs-cats-and-ferrets/faqs_en | — |
| Prelazi u Hrvatskoj | https://gov.hr/en/movement-of-pets/1996, https://carina.gov.hr/featured/information-for-passengers-natural-persons/cross-border-movement-of-pets/6713 | da li je spisak i dalje aktuelan |
| Moravița (Rumunija) | https://www.ansvsa.ro/wp-content/uploads/2023/09/Lista_puncte_intrare_calatori_PIC_29092023.pdf | spisak je iz 2023. |
| Najviše 5 ljubimaca; izuzetak za takmičenja | https://food.ec.europa.eu/animals/live-animal-movements/dogs-cats-and-ferrets/travelling-pet-within-eu_en | — |
| Ovlašćena osoba, vlasnik u roku od 5 dana; pas ne putuje sam | čl. 245(2) Uredbe 2016/429; čl. 4 uredbe 2026/131; https://inspection.canada.ca/en/animal-health/terrestrial-animals/exports/pets/eu-non-commercial | — |
| Pantljičara: FI, IE, MT, Severna Irska, NO; 24–120 h pre ulaska | https://europa.eu/youreurope/citizens/travel/carry/pets-and-other-animals/index_en.htm, https://www.ruokavirasto.fi/en/themes/import-and-export/eu-countries-norway-and-switzerland/animals/dogs-cats-and-ferrets/frequently-asked-questions-about-echinococcus-or-tapeworm-treatment/ | da li je rok prenet nepromenjen u 2026/131 |
| Izjava za tranzit kroz zemlju van liste | čl. 17(2)(c) uredbe 2026/131 (po austrijskom uputstvu) | tekst člana; da li se odnosi na put preko BiH |

## Namerno izostavljeno (nije potvrđeno)

- Granični prelazi za Mađarsku (Röszke, Tompa, Kelebia) i Bugarsku (Kalotina, Vrška Čuka, Bregovo, Strezimirovci, Oltomanci). Spisak za Mađarsku objavljuje Nébih (https://portal.nebih.gov.hu/-/kedvtelesbol-tartott-allatok-utaztatasara-vonatkozo-tajekoztato). Za Bugarsku zvanični spisak nije nađen. Kada se potvrde, dodaju se kao nove stavke u odeljak „Granični prelazi za ljubimce".
- Povratak u Srbiju (šta tačno traži Pravilnik, Sl. glasnik RS 20/2019, za psa koji živi u Srbiji i vraća se iz EU).
- Štenci mlađi od 12 nedelja.
- Da li je Pasterov zavod Novi Sad i dalje na EU spisku laboratorija. Za put iz Srbije više nije bitno, a stranica zavoda možda još navodi staro pravilo.
