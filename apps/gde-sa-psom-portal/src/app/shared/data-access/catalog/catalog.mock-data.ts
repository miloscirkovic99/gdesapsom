import {
  Brand,
  CatalogLookups,
  DogFoodDetail,
  DogFoodListItem,
  DogFoodOffer,
  LookupItem,
  LookupRef,
  PetShopDetail,
  PetShopListItem,
  PetShopOffer,
} from './catalog.models';

/**
 * In-memory catalog used while `environment.useCatalogMocks` is on.
 *
 * Lookups and the Pseća Kašika range mirror db/02_seed_lookups.sql and
 * db/05_seed_dog_food_pseca_kasika.sql; the other shops and products are
 * invented so the Food -> Offer -> Shop relationship has something to show
 * (one product listed by several shops, different prices, one out of stock).
 *
 * Township ids other than Savski venac (7) are placeholders - they will not
 * line up with the real `opstina` table, so the township filter only matches
 * in mock mode by coincidence.
 */

const FOOD_TYPES: LookupItem[] = [
  { id: 1, code: 'dry', nameSr: 'Suva hrana', nameEn: 'Dry food' },
  { id: 2, code: 'wet', nameSr: 'Vlažna hrana', nameEn: 'Wet food' },
  { id: 6, code: 'cooked', nameSr: 'Kuvana hrana', nameEn: 'Cooked food' },
  { id: 3, code: 'raw', nameSr: 'Sirova hrana', nameEn: 'Raw food' },
  { id: 4, code: 'treat', nameSr: 'Poslastice', nameEn: 'Treats' },
  { id: 5, code: 'supplement', nameSr: 'Dodaci ishrani', nameEn: 'Supplements' },
];

const LIFE_STAGES: LookupItem[] = [
  { id: 1, code: 'puppy', nameSr: 'Štene', nameEn: 'Puppy' },
  { id: 2, code: 'adult', nameSr: 'Odrastao pas', nameEn: 'Adult' },
  { id: 3, code: 'senior', nameSr: 'Stariji pas', nameEn: 'Senior' },
  { id: 4, code: 'all', nameSr: 'Svi uzrasti', nameEn: 'All ages' },
];

const BREED_SIZES: LookupItem[] = [
  { id: 1, code: 'small', nameSr: 'Male rase', nameEn: 'Small breeds' },
  { id: 2, code: 'medium', nameSr: 'Srednje rase', nameEn: 'Medium breeds' },
  { id: 3, code: 'large', nameSr: 'Velike rase', nameEn: 'Large breeds' },
  { id: 4, code: 'all', nameSr: 'Sve rase', nameEn: 'All breeds' },
];

const BRANDS: Brand[] = [
  { id: 1, name: 'Royal Canin', slug: 'royal-canin', logoUrl: null, websiteUrl: 'https://www.royalcanin.com' },
  { id: 2, name: 'Purina', slug: 'purina', logoUrl: null, websiteUrl: 'https://www.purina.com' },
  { id: 3, name: 'Acana', slug: 'acana', logoUrl: null, websiteUrl: 'https://www.acana.com' },
  { id: 4, name: 'Orijen', slug: 'orijen', logoUrl: null, websiteUrl: 'https://www.orijen.ca' },
  { id: 5, name: "Hill's", slug: 'hills', logoUrl: null, websiteUrl: 'https://www.hillspet.com' },
  { id: 6, name: 'Brit', slug: 'brit', logoUrl: null, websiteUrl: 'https://www.brit-petfood.com' },
  { id: 7, name: 'Monge', slug: 'monge', logoUrl: null, websiteUrl: 'https://www.monge.it' },
  { id: 8, name: 'Pseća Kašika', slug: 'pseca-kasika', logoUrl: null, websiteUrl: 'https://psecakasika.rs/' },
];

interface ShopSeed {
  id: number;
  name: string;
  slug: string;
  address: string;
  townshipId: number;
  townshipName: string;
  cityId: number;
  cityName: string;
  phone: string | null;
  websiteUrl: string | null;
  description: string;
  latitude: number;
  longitude: number;
  woltUrl: string | null;
  glovoUrl: string | null;
}

const SHOPS: ShopSeed[] = [
  {
    id: 1,
    name: 'Pseća Kašika',
    slug: 'pseca-kasika-savski-venac',
    address: 'Koste Glavinića 2, Poslovni centar "Sajam", Senjak',
    townshipId: 7,
    townshipName: 'Savski venac',
    cityId: 1,
    cityName: 'Beograd',
    phone: '+381665469171',
    websiteUrl: 'https://psecakasika.rs/',
    description:
      'Kuvana hrana za pse od svežih namirnica pripremljenih na pari - meso, integralni pirinač, povrće i kolagenski bujon kuvan 12 sati od junećih i pilećih kostiju. Radno vreme: ponedeljak-subota 11:30-19:00, nedelja i praznici 12:00-17:00.',
    latitude: 44.7953068,
    longitude: 20.4422092,
    woltUrl: 'https://wolt.com/sr/srb/belgrade/venue/psea-kaika',
    glovoUrl: null,
  },
  {
    id: 2,
    name: 'Šapa i Rep',
    slug: 'sapa-i-rep-vracar',
    address: 'Njegoševa 45',
    townshipId: 12,
    townshipName: 'Vračar',
    cityId: 1,
    cityName: 'Beograd',
    phone: '+381112441870',
    websiteUrl: null,
    description:
      'Petshop u srcu Vračara sa širokim izborom suve i vlažne hrane, opreme i poslastica. Besplatna dostava na teritoriji opštine za porudžbine preko 5.000 dinara. Radno vreme: radnim danima 9-20h, subotom 9-16h.',
    latitude: 44.8012,
    longitude: 20.4713,
    woltUrl: 'https://wolt.com/sr/srb/belgrade/venue/sapa-i-rep',
    glovoUrl: 'https://glovoapp.com/rs/sr/beograd/sapa-i-rep',
  },
  {
    id: 3,
    name: 'Zoo Kutak',
    slug: 'zoo-kutak-novi-beograd',
    address: 'Bulevar Mihajla Pupina 10',
    townshipId: 9,
    townshipName: 'Novi Beograd',
    cityId: 1,
    cityName: 'Beograd',
    phone: '+381113111222',
    websiteUrl: 'https://zookutak.example.rs',
    description:
      'Velika prodavnica sa parkingom i ulazom sa nivoa ulice. Premium i super-premium brendovi, kao i savetovanje o ishrani. Radno vreme: svakog dana 8-22h.',
    latitude: 44.8176,
    longitude: 20.4267,
    woltUrl: 'https://wolt.com/sr/srb/belgrade/venue/zoo-kutak',
    glovoUrl: null,
  },
  {
    id: 4,
    name: 'Njuškica Petshop',
    slug: 'njuskica-petshop-vracar',
    address: 'Bulevar kralja Aleksandra 120',
    townshipId: 12,
    townshipName: 'Vračar',
    cityId: 1,
    cityName: 'Beograd',
    phone: '+381114022119',
    websiteUrl: null,
    description:
      'Mala porodična radnja, prilagođene cene i mogućnost naručivanja hrane koje nema na polici. Psi su dobrodošli unutra. Radno vreme: radnim danima 8-20h, subotom 8-15h.',
    latitude: 44.7979,
    longitude: 20.48,
    woltUrl: null,
    glovoUrl: null,
  },
  {
    id: 5,
    name: 'Doggo Market',
    slug: 'doggo-market-novi-sad',
    address: 'Bulevar oslobođenja 66',
    townshipId: 40,
    townshipName: 'Novi Sad',
    cityId: 2,
    cityName: 'Novi Sad',
    phone: '+381214520330',
    websiteUrl: 'https://doggomarket.example.rs',
    description:
      'Specijalizovana prodavnica hrane za pse sa akcentom na hranu bez žitarica i velika pakovanja. Dostava po Novom Sadu istog dana. Radno vreme: svakog dana 9-21h.',
    latitude: 45.25,
    longitude: 19.8369,
    woltUrl: 'https://wolt.com/sr/srb/novi-sad/venue/doggo-market',
    glovoUrl: null,
  },
  {
    id: 6,
    name: 'Petfarm',
    slug: 'petfarm-nis',
    address: 'Obrenovićeva 12',
    townshipId: 60,
    townshipName: 'Medijana',
    cityId: 3,
    cityName: 'Niš',
    phone: '+38118520741',
    websiteUrl: null,
    description:
      'Prodavnica za ljubimce u centru Niša. Hrana, oprema i igračke, uz stalne popuste na velika pakovanja. Radno vreme: radnim danima 8-20h, subotom 8-15h.',
    latitude: 43.3209,
    longitude: 21.8958,
    woltUrl: null,
    glovoUrl: null,
  },
];

/** [shop slug, price in RSD or null when unknown, in stock] */
type OfferSeed = [string, number | null, boolean];

interface FoodSeed {
  id: number;
  name: string;
  slug: string;
  brand: string;
  type: string;
  stage: string;
  size: string;
  weight: number | null;
  grainFree: boolean;
  description: string;
  ingredients: string;
  createdAt: string;
  offers: OfferSeed[];
}

const PK_INGREDIENTS = (pct: number, buster: boolean) =>
  `Meso ${pct}%, integralni pirinač, povrće, kolagenski bujon (12 sati kuvane juneće i pileće kosti), hladno ceđeno maslinovo ulje, jaje, peršun.${
    buster ? ' BUSTER: pileće srce i papalina.' : ''
  }`;

const PK_PRICES: Record<string, number> = {
  'karabatak-premium-300g': 350,
  'karabatak-premium-500g-100g-buster': 500,
  'karabatak-superpremium-300g': 400,
  'karabatak-superpremium-500g-100g-buster': 750,
  'junetina-premium-300g': 700,
  'junetina-premium-500g-100g-buster': 1200,
  'junetina-superpremium-300g': 900,
  'junetina-superpremium-500g-100g-buster': 1550,
  'file-premium-300g': 400,
  'file-premium-500g-100g-buster': 600,
  'file-superpremium-300g': 450,
  'file-superpremium-500g-100g-buster': 700,
};

function psecaKasikaMeals(): FoodSeed[] {
  const meats = [
    { key: 'karabatak', label: 'Karabatak', of: 'pilećeg karabataka' },
    { key: 'junetina', label: 'Junetina', of: 'junetine' },
    { key: 'file', label: 'File', of: 'pilećeg filea' },
  ];
  const tiers = [
    { key: 'premium', pct: 50 },
    { key: 'superpremium', pct: 70 },
  ];
  const packs = [
    { key: '300g', label: '300g', weight: 300, buster: false },
    { key: '500g-100g-buster', label: '500g + 100g buster', weight: 600, buster: true },
  ];

  const seeds: FoodSeed[] = [];
  let id = 1;
  for (const meat of meats) {
    for (const tier of tiers) {
      for (const pack of packs) {
        const key = `${meat.key}-${tier.key}-${pack.key}`;
        seeds.push({
          id: id++,
          name: `${meat.label} ${tier.key} ${pack.label}`,
          slug: `pseca-kasika-${key}`,
          brand: 'pseca-kasika',
          type: 'cooked',
          stage: 'all',
          size: 'all',
          weight: pack.weight,
          grainFree: false,
          description: `Kuvani obrok od ${meat.of}, ${tier.pct}% mesa${
            pack.buster ? ', uz 100 g BUSTER dodatka' : ''
          }. Pakovanje ${pack.buster ? '500 g + 100 g' : '300 g'}.`,
          ingredients: PK_INGREDIENTS(tier.pct, pack.buster),
          createdAt: '2026-09-04 00:22:53',
          offers: [['pseca-kasika-savski-venac', PK_PRICES[key], true]],
        });
      }
    }
  }
  return seeds;
}

const FOODS: FoodSeed[] = [
  ...psecaKasikaMeals(),
  {
    id: 13,
    name: 'Kolagenski bujon',
    slug: 'pseca-kasika-kolagenski-bujon',
    brand: 'pseca-kasika',
    type: 'supplement',
    stage: 'all',
    size: 'all',
    weight: null,
    grainFree: true,
    description:
      'Bujon kuvan 12 sati od junećih i pilećih kostiju. Preliva se preko obroka ili daje samostalno, za zglobove, kožu i dlaku.',
    ingredients: 'Juneće i pileće kosti, voda.',
    createdAt: '2026-09-04 00:22:53',
    offers: [['pseca-kasika-savski-venac', 130, true]],
  },
  {
    id: 14,
    name: 'Buster juneća srca i papalina 100g',
    slug: 'pseca-kasika-buster-juneca-srca-i-papalina-100g',
    brand: 'pseca-kasika',
    type: 'supplement',
    stage: 'all',
    size: 'all',
    weight: 100,
    grainFree: true,
    description:
      'Prirodni proteinski pojačivač obroka. Juneća srca su izvor taurina, gvožđa i vitamina B grupe, a papaline nose omega-3 i kolagen za kožu i sjaj dlake.',
    ingredients: 'Juneća srca, cele papaline.',
    createdAt: '2026-09-04 00:22:53',
    offers: [['pseca-kasika-savski-venac', 150, true]],
  },
  {
    id: 15,
    name: 'Buster pileća srca i papalina 100g',
    slug: 'pseca-kasika-buster-pileca-srca-i-papalina-100g',
    brand: 'pseca-kasika',
    type: 'supplement',
    stage: 'all',
    size: 'all',
    weight: 100,
    grainFree: true,
    description:
      'Prirodni proteinski pojačivač obroka. Pileća srca su izvor taurina, gvožđa i vitamina B grupe. Papaline nose omega-3 i kolagen za kožu i sjaj dlake, a kalcijum i fosfor za zube i kosti.',
    ingredients: 'Pileća srca, cele papaline.',
    createdAt: '2026-09-04 00:22:53',
    offers: [['pseca-kasika-savski-venac', null, true]],
  },
  {
    id: 16,
    name: 'Maxi Adult 15 kg',
    slug: 'royal-canin-maxi-adult-15-kg',
    brand: 'royal-canin',
    type: 'dry',
    stage: 'adult',
    size: 'large',
    weight: 15000,
    grainFree: false,
    description:
      'Potpuna suva hrana za odrasle pse velikih rasa (26-44 kg) od 15. meseca do 5. godine. Podržava zdravlje zglobova i lakše varenje, uz krokete prilagođene većim vilicama.',
    ingredients:
      'Dehidrirani proteini živine, pirinač, kukuruz, životinjske masti, biljni proteini, hidrolizovani životinjski proteini, pulpa repe, minerali, riblje ulje, sojino ulje, kvasac, glukozamin, hondroitin.',
    createdAt: '2026-07-12 10:00:00',
    offers: [
      ['sapa-i-rep-vracar', 7999, true],
      ['zoo-kutak-novi-beograd', 8199, true],
      ['njuskica-petshop-vracar', 7899, false],
      ['doggo-market-novi-sad', 8090, true],
    ],
  },
  {
    id: 17,
    name: 'Mini Puppy 2 kg',
    slug: 'royal-canin-mini-puppy-2-kg',
    brand: 'royal-canin',
    type: 'dry',
    stage: 'puppy',
    size: 'small',
    weight: 2000,
    grainFree: false,
    description:
      'Hrana za štence malih rasa (do 10 kg u odraslom dobu) od 2. do 10. meseca. Visok sadržaj energije za brz rast i prebiotici za stabilnu crevnu floru.',
    ingredients:
      'Dehidrirani proteini živine, pirinač, životinjske masti, kukuruz, biljni proteini, hidrolizovani životinjski proteini, pulpa repe, minerali, riblje ulje, sojino ulje, kvasac, frukto-oligosaharidi.',
    createdAt: '2026-07-12 10:05:00',
    offers: [
      ['zoo-kutak-novi-beograd', 2150, true],
      ['sapa-i-rep-vracar', 2290, true],
      ['petfarm-nis', 2099, true],
    ],
  },
  {
    id: 18,
    name: 'Grasslands 11,4 kg',
    slug: 'acana-grasslands-11-4-kg',
    brand: 'acana',
    type: 'dry',
    stage: 'all',
    size: 'all',
    weight: 11400,
    grainFree: true,
    description:
      'Hrana bez žitarica sa jagnjetinom, patkom, jajima i pastrmkom. 70% sastojaka životinjskog porekla, bez veštačkih aditiva. Za pse svih uzrasta i rasa.',
    ingredients:
      'Sveža jagnjetina, sveža patka, sveža jaja, cela pastrmka, jagnjeće meso, dehidrirana patka, sočivo, grašak, jagnjeća mast, cela haringa, riblje ulje, sušena alga, bundeva, spanać, borovnice.',
    createdAt: '2026-08-02 09:30:00',
    offers: [
      ['zoo-kutak-novi-beograd', 12990, true],
      ['doggo-market-novi-sad', 13200, false],
    ],
  },
  {
    id: 19,
    name: 'Six Fish 6 kg',
    slug: 'orijen-six-fish-6-kg',
    brand: 'orijen',
    type: 'dry',
    stage: 'adult',
    size: 'all',
    weight: 6000,
    grainFree: true,
    description:
      'Biološki primerena hrana sa šest vrsta sveže ribe. 85% sastojaka ribljeg porekla, bogata omega-3 kiselinama za kožu i dlaku.',
    ingredients:
      'Sveža skuša, sveža haringa, sveža bakalarova jetra, sveža iverka, sveža morska riba, sveži oslić, dehidrirana skuša, dehidrirana haringa, sočivo, grašak, leblebije, riblje ulje, bundeva, kelj, spanać.',
    createdAt: '2026-08-02 09:40:00',
    offers: [['sapa-i-rep-vracar', 9890, true]],
  },
  {
    id: 20,
    name: 'Science Plan Senior 7+ Medium 2,5 kg',
    slug: 'hills-science-plan-senior-7-medium-2-5-kg',
    brand: 'hills',
    type: 'dry',
    stage: 'senior',
    size: 'medium',
    weight: 2500,
    grainFree: false,
    description:
      'Za pse srednjih rasa starije od 7 godina. Uravnotežen sadržaj minerala za srce i bubrege, lako svarljivi sastojci i antioksidansi za imunitet.',
    ingredients:
      'Piletina, kukuruz, pšenica, pirinač, životinjska mast, proteini živine, kukuruzni gluten, laneno seme, minerali, pulpa repe, riblje ulje, vitamini, L-karnitin, beta-karoten.',
    createdAt: '2026-06-20 12:00:00',
    offers: [
      ['njuskica-petshop-vracar', 3450, true],
      ['zoo-kutak-novi-beograd', 3590, true],
    ],
  },
  {
    id: 21,
    name: 'Pro Plan Medium Adult Sensitive Skin 14 kg',
    slug: 'purina-pro-plan-medium-adult-sensitive-skin-14-kg',
    brand: 'purina',
    type: 'dry',
    stage: 'adult',
    size: 'medium',
    weight: 14000,
    grainFree: false,
    description:
      'Za odrasle pse srednjih rasa sa osetljivom kožom. Losos kao glavni izvor proteina, bez pšenice i soje, uz omega-3 i omega-6 kiseline.',
    ingredients:
      'Losos (20%), pirinač, dehidrirani proteini lososa, kukuruzni gluten, kukuruz, životinjska mast, kukuruzni griz, dehidrirani proteini živine, hidrolizat, pulpa repe, riblje ulje, minerali, kvasac.',
    createdAt: '2026-06-28 15:20:00',
    offers: [
      ['petfarm-nis', 8490, true],
      ['doggo-market-novi-sad', 8790, true],
      ['njuskica-petshop-vracar', 8300, true],
    ],
  },
  {
    id: 22,
    name: 'Care Grain-Free Puppy Lamb 3 kg',
    slug: 'brit-care-grain-free-puppy-lamb-3-kg',
    brand: 'brit',
    type: 'dry',
    stage: 'puppy',
    size: 'all',
    weight: 3000,
    grainFree: true,
    description:
      'Hipoalergena hrana bez žitarica za štence svih rasa, sa jagnjetinom kao jedinim izvorom animalnih proteina. Sa kolostrumom za podršku imunitetu.',
    ingredients:
      'Dehidrirana jagnjetina (42%), žuti grašak, pileća mast, jagnjeće meso (5%), jabuke, lososovo ulje, pivski kvasac, hidrolizovani jagnjeći protein, pulpa repe, kolostrum, minerali.',
    createdAt: '2026-08-15 11:00:00',
    offers: [
      ['sapa-i-rep-vracar', 2690, true],
      ['njuskica-petshop-vracar', 2750, true],
    ],
  },
  {
    id: 23,
    name: 'Fresh Chunks in Loaf Beef 100 g',
    slug: 'monge-fresh-chunks-in-loaf-beef-100-g',
    brand: 'monge',
    type: 'wet',
    stage: 'adult',
    size: 'all',
    weight: 100,
    grainFree: false,
    description:
      'Vlažna hrana u zdelici sa komadićima govedine u pašteti. Bez konzervansa i veštačkih boja, pogodna kao samostalan obrok ili dodatak suvoj hrani.',
    ingredients: 'Meso i mesni proizvodi (govedina 4%), žitarice, minerali, ulja i masti.',
    createdAt: '2026-08-20 08:15:00',
    offers: [
      ['njuskica-petshop-vracar', 149, true],
      ['zoo-kutak-novi-beograd', 159, true],
      ['petfarm-nis', 139, false],
    ],
  },
  {
    id: 24,
    name: 'Premium Sticks Chicken 100 g',
    slug: 'brit-premium-sticks-chicken-100-g',
    brand: 'brit',
    type: 'treat',
    stage: 'all',
    size: 'all',
    weight: 100,
    grainFree: false,
    description: 'Mekani štapići sa piletinom za nagrađivanje tokom obuke. Lako se lome na manje komade.',
    ingredients: 'Meso i mesni proizvodi (piletina 60%), žitarice, minerali, glicerin.',
    createdAt: '2026-08-28 17:45:00',
    offers: [],
  },
];

// ─── derived catalog ─────────────────────────────────────────────────────────

const ref = (item: LookupItem): LookupRef => ({
  code: item.code,
  nameSr: item.nameSr,
  nameEn: item.nameEn,
});

const byCode = <T extends { code: string }>(list: T[], code: string): T =>
  list.find((item) => item.code === code) ?? list[list.length - 1];

const brandBySlug = (slug: string): Brand => BRANDS.find((b) => b.slug === slug) ?? BRANDS[0];
const shopBySlug = (slug: string): ShopSeed => SHOPS.find((s) => s.slug === slug) ?? SHOPS[0];

/** Stable offer ids: shop 2 / food 16 -> 2016. */
const offerId = (shopId: number, foodId: number) => shopId * 1000 + foodId;

const minPriceOf = (food: FoodSeed): number | null => {
  const prices = food.offers
    .filter(([, price, inStock]) => inStock && price !== null)
    .map(([, price]) => price as number);
  return prices.length ? Math.min(...prices) : null;
};

const inStockCount = (food: FoodSeed): number =>
  food.offers.filter(([, , inStock]) => inStock).length;

function toListItem(food: FoodSeed): DogFoodListItem {
  const brand = brandBySlug(food.brand);
  return {
    id: food.id,
    name: food.name,
    slug: food.slug,
    minPrice: minPriceOf(food),
    packageWeightG: food.weight,
    isGrainFree: food.grainFree,
    createdAt: food.createdAt,
    brand: { id: brand.id, name: brand.name, slug: brand.slug, logoUrl: brand.logoUrl },
    foodType: ref(byCode(FOOD_TYPES, food.type)),
    lifeStage: ref(byCode(LIFE_STAGES, food.stage)),
    breedSize: ref(byCode(BREED_SIZES, food.size)),
    thumbnail: null,
    offerCount: inStockCount(food),
  };
}

function toFoodOffers(food: FoodSeed): DogFoodOffer[] {
  return food.offers
    .map(([shopSlug, price, isInStock]): DogFoodOffer => {
      const shop = shopBySlug(shopSlug);
      return {
        id: offerId(shop.id, food.id),
        price,
        isInStock,
        woltUrl: shop.woltUrl,
        glovoUrl: shop.glovoUrl,
        updatedAt: food.createdAt,
        shop: {
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          address: shop.address,
          phone: shop.phone,
          latitude: shop.latitude,
          longitude: shop.longitude,
          townshipName: shop.townshipName,
          cityName: shop.cityName,
        },
      };
    })
    .sort((a, b) => {
      if (a.isInStock !== b.isInStock) return a.isInStock ? -1 : 1;
      if ((a.price === null) !== (b.price === null)) return a.price === null ? 1 : -1;
      if (a.price !== b.price) return (a.price ?? 0) - (b.price ?? 0);
      return a.shop.name.localeCompare(b.shop.name);
    });
}

export function mockLookups(): CatalogLookups {
  const usedBrands = new Set(FOODS.map((f) => f.brand));
  const prices = FOODS.map(minPriceOf).filter((p): p is number => p !== null);
  return {
    brands: BRANDS.filter((b) => usedBrands.has(b.slug)).sort((a, b) => a.name.localeCompare(b.name)),
    foodTypes: FOOD_TYPES,
    lifeStages: LIFE_STAGES,
    breedSizes: BREED_SIZES,
    priceRange: {
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
    },
  };
}

export function mockDogFoodList(): DogFoodListItem[] {
  return FOODS.map(toListItem);
}

export function mockDogFoodDetail(slug: string): DogFoodDetail | null {
  const food = FOODS.find((f) => f.slug === slug);
  if (!food) return null;

  const base = toListItem(food);
  const brand = brandBySlug(food.brand);
  const offers = toFoodOffers(food);
  const priced = offers.filter((o) => o.isInStock && o.price !== null).map((o) => o.price as number);

  const related = FOODS.filter(
    (f) => f.id !== food.id && f.type === food.type && f.stage === food.stage,
  )
    .slice(0, 6)
    .map((f) => {
      const item = toListItem(f);
      return {
        id: item.id,
        name: item.name,
        slug: item.slug,
        minPrice: item.minPrice,
        brandName: item.brand.name,
        thumbnail: null,
      };
    });

  return {
    id: base.id,
    name: base.name,
    slug: base.slug,
    minPrice: base.minPrice,
    packageWeightG: base.packageWeightG,
    isGrainFree: base.isGrainFree,
    createdAt: base.createdAt,
    updatedAt: base.createdAt,
    description: food.description,
    ingredients: food.ingredients,
    brand: { ...base.brand, websiteUrl: brand.websiteUrl },
    foodType: base.foodType,
    lifeStage: base.lifeStage,
    breedSize: base.breedSize,
    images: [],
    offers,
    aggregate: {
      lowPrice: priced.length ? Math.min(...priced) : null,
      highPrice: priced.length ? Math.max(...priced) : null,
      offerCount: priced.length,
    },
    related,
  };
}

function shopOffers(shop: ShopSeed): PetShopOffer[] {
  return FOODS.flatMap((food) =>
    food.offers
      .filter(([shopSlug]) => shopSlug === shop.slug)
      .map(([, price, isInStock]): PetShopOffer => {
        const item = toListItem(food);
        return {
          offerId: offerId(shop.id, food.id),
          price,
          isInStock,
          woltUrl: shop.woltUrl,
          glovoUrl: shop.glovoUrl,
          updatedAt: food.createdAt,
          food: {
            id: item.id,
            name: item.name,
            slug: item.slug,
            packageWeightG: item.packageWeightG,
            isGrainFree: item.isGrainFree,
            brandName: item.brand.name,
            brandSlug: item.brand.slug,
            foodType: item.foodType,
            lifeStage: item.lifeStage,
            thumbnail: null,
          },
        };
      }),
  ).sort((a, b) => {
    if (a.isInStock !== b.isInStock) return a.isInStock ? -1 : 1;
    return a.food.name.localeCompare(b.food.name);
  });
}

function toShopListItem(shop: ShopSeed): PetShopListItem {
  return {
    id: shop.id,
    name: shop.name,
    slug: shop.slug,
    address: shop.address,
    phone: shop.phone,
    websiteUrl: shop.websiteUrl,
    latitude: shop.latitude,
    longitude: shop.longitude,
    woltUrl: shop.woltUrl,
    glovoUrl: shop.glovoUrl,
    townshipId: shop.townshipId,
    townshipName: shop.townshipName,
    cityId: shop.cityId,
    cityName: shop.cityName,
    offerCount: shopOffers(shop).filter((o) => o.isInStock).length,
    distanceM: null,
  };
}

export function mockPetShopList(): PetShopListItem[] {
  return SHOPS.map(toShopListItem);
}

export function mockPetShopDetail(slug: string): PetShopDetail | null {
  const shop = SHOPS.find((s) => s.slug === slug);
  if (!shop) return null;

  const offers = shopOffers(shop);
  const inStock = offers.filter((o) => o.isInStock);
  const priced = inStock.filter((o) => o.price !== null).map((o) => o.price as number);
  const base = toShopListItem(shop);

  return {
    id: base.id,
    name: base.name,
    slug: base.slug,
    address: base.address,
    phone: base.phone,
    websiteUrl: base.websiteUrl,
    latitude: base.latitude,
    longitude: base.longitude,
    woltUrl: base.woltUrl,
    glovoUrl: base.glovoUrl,
    townshipId: base.townshipId,
    townshipName: base.townshipName,
    cityId: base.cityId,
    cityName: base.cityName,
    description: shop.description,
    logo: null,
    createdAt: '2026-09-04 00:10:00',
    updatedAt: '2026-09-04 00:10:00',
    offers,
    summary: {
      offerCount: inStock.length,
      brandCount: new Set(inStock.map((o) => o.food.brandName)).size,
      lowPrice: priced.length ? Math.min(...priced) : null,
      highPrice: priced.length ? Math.max(...priced) : null,
    },
    nearby: SHOPS.filter((s) => s.id !== shop.id && s.townshipId === shop.townshipId)
      .slice(0, 6)
      .map((s) => ({ id: s.id, name: s.name, slug: s.slug, address: s.address })),
  };
}
