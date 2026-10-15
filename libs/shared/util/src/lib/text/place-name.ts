/**
 * Folds a place or type name for comparison: lower case, no diacritics,
 * single spaces. "Novi  Sad", "novi sad" and "NOVI SAD" are the same key, and
 * so are "Niš" and "Nis". `đ` has no Unicode decomposition, so it is spelled
 * out as "dj" the way it is typed on keyboards without Serbian letters.
 */
export function foldPlaceName(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/[đĐ]/g, 'dj')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The phrase a Serbian sentence needs to say "in <place>": "u Beogradu",
 * "u Novom Sadu", "na Zlatiboru". Keyed by `foldPlaceName`.
 *
 * The case ending cannot be derived from the name reliably (Kragujevac →
 * Kragujevcu, Šabac → Šapcu, Rtanj → Rtnju), so places are listed by hand.
 * Mountains and resorts take "na", towns take "u".
 */
const LOCATIVE: Readonly<Record<string, string>> = {
  beograd: 'u Beogradu',
  'novi sad': 'u Novom Sadu',
  nis: 'u Nišu',
  kragujevac: 'u Kragujevcu',
  subotica: 'u Subotici',
  zrenjanin: 'u Zrenjaninu',
  pancevo: 'u Pančevu',
  cacak: 'u Čačku',
  kraljevo: 'u Kraljevu',
  'novi pazar': 'u Novom Pazaru',
  krusevac: 'u Kruševcu',
  leskovac: 'u Leskovcu',
  valjevo: 'u Valjevu',
  sabac: 'u Šapcu',
  smederevo: 'u Smederevu',
  sombor: 'u Somboru',
  vrsac: 'u Vršcu',
  uzice: 'u Užicu',
  vranje: 'u Vranju',
  jagodina: 'u Jagodini',
  pozarevac: 'u Požarevcu',
  'sremska mitrovica': 'u Sremskoj Mitrovici',
  kikinda: 'u Kikindi',
  loznica: 'u Loznici',
  arandjelovac: 'u Aranđelovcu',
  'gornji milanovac': 'u Gornjem Milanovcu',
  indjija: 'u Inđiji',
  ruma: 'u Rumi',
  'stara pazova': 'u Staroj Pazovi',
  obrenovac: 'u Obrenovcu',
  mladenovac: 'u Mladenovcu',
  lazarevac: 'u Lazarevcu',
  zemun: 'u Zemunu',
  petrovaradin: 'u Petrovaradinu',
  'sremski karlovci': 'u Sremskim Karlovcima',
  'vrnjacka banja': 'u Vrnjačkoj Banji',
  sokobanja: 'u Sokobanji',
  'banja koviljaca': 'u Banji Koviljači',
  'bajina basta': 'u Bajinoj Bašti',
  cajetina: 'u Čajetini',
  vrdnik: 'u Vrdniku',
  kladovo: 'u Kladovu',
  zajecar: 'u Zaječaru',
  pirot: 'u Pirotu',
  paracin: 'u Paraćinu',
  becej: 'u Bečeju',
  ivanjica: 'u Ivanjici',
  pozega: 'u Požegi',
  zlatibor: 'na Zlatiboru',
  kopaonik: 'na Kopaoniku',
  divcibare: 'na Divčibarama',
  tara: 'na Tari',
  palic: 'na Paliću',
  zlatar: 'na Zlataru',
  'fruska gora': 'na Fruškoj gori',
  'stara planina': 'na Staroj planini',
  golija: 'na Goliji',
  rtanj: 'na Rtnju',
  avala: 'na Avali',
  'mokra gora': 'na Mokroj Gori',
};

/**
 * "u Novom Sadu" for "Novi Sad". Null for a place that is not listed, so the
 * caller can fall back to a phrasing without a case ending ("kafić, Ruma")
 * instead of printing the nominative after "u", which reads as an error.
 */
export function placeLocative(name: string | null | undefined): string | null {
  return LOCATIVE[foldPlaceName(name)] ?? null;
}
