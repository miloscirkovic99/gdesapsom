/** Anything with the township lists of `SharedStore` (util cannot import the data-access lib). */
export interface TownshipLists<T extends { ime: string }> {
  townships(): T[];
  townshipsByCity(): T[];
}

// Function to normalize accented characters
function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Townships whose name contains `searchValue`, ignoring case and diacritics
 * ("cukarica" finds "Čukarica"). Reads `townshipsByCity()` when `onlyTownships`
 * is set, otherwise `townships()`.
 */
export function filterTownshipsMulti<T extends { ime: string }>(
  source: TownshipLists<T>,
  searchValue: string | null | undefined,
  onlyTownships = false,
): T[] {
  const filter = onlyTownships ? source.townshipsByCity() : source.townships();
  if (!filter) {
    return [];
  }

  if (!searchValue) {
    return filter.slice();
  }

  const normalizedSearch = normalizeString(searchValue);

  return filter.filter((township) => normalizeString(township.ime).includes(normalizedSearch));
}
